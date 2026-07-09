from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, require_patient
from app.db.mongo import get_db
from app.schemas import FeedbackResponse, MovementType, SaveTaskRequest, SessionResponse
from app.services.audit import audit_event
from app.services.analysis import run_session_analysis
from app.services.session_mapper import hydrate_session_document, public_doc
from app.services.sessions import get_active_recording_session, refresh_session_status, utc_now
from app.services.task_catalog import find_task_by_code

router = APIRouter(prefix="/patient", tags=["patient"])


@router.get("/sessions/active", response_model=SessionResponse | None)
async def get_active_session(user: CurrentUser = Depends(require_patient)) -> dict | None:
    db = get_db()
    session = await get_active_recording_session(db, user.id)
    return await hydrate_session_document(db, session) if session else None


@router.get("/sessions/draft", response_model=SessionResponse | None)
async def get_draft_session(user: CurrentUser = Depends(require_patient)) -> dict | None:
    return await get_active_session(user)


@router.post("/sessions/draft/tasks/{movement_type}", response_model=SessionResponse)
async def save_draft_task(
    movement_type: MovementType,
    payload: SaveTaskRequest,
    request: Request,
    user: CurrentUser = Depends(require_patient),
) -> dict:
    return await save_draft_task_by_reference(movement_type, None, payload, request, user)


@router.post("/sessions/draft/session-tasks/{session_task_id}", response_model=SessionResponse)
async def save_draft_task_by_session_task(
    session_task_id: str,
    payload: SaveTaskRequest,
    request: Request,
    user: CurrentUser = Depends(require_patient),
) -> dict:
    return await save_draft_task_by_reference(None, session_task_id, payload, request, user)


async def save_draft_task_by_reference(
    movement_type: MovementType | None,
    session_task_id: str | None,
    payload: SaveTaskRequest,
    request: Request,
    user: CurrentUser,
) -> dict:
    db = get_db()
    session = await get_active_recording_session(db, user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active session assigned by your doctor.")
    upload_id = payload.uploadId or payload.fileId
    upload = await db.uploads.find_one({"$or": [{"uploadId": upload_id}, {"fileId": upload_id}], "patientId": user.id})
    if not upload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="uploadId was not found for this patient.")

    target_task_code = None
    target_task_id = None
    if movement_type:
        task_def = await find_task_by_code(db, movement_type)
        if not task_def:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement task not found.")
        target_task_code = movement_type
        target_task_id = task_def["taskId"]

    session_tasks = []
    found = False
    for task in session["sessionTasks"]:
        if (session_task_id and task["sessionTaskId"] == session_task_id) or (
            movement_type and task.get("taskCode") == target_task_code and task.get("taskId") == target_task_id
        ):
            found = True
            task = {
                **task,
                "status": "recorded",
                "view": payload.view,
                "uploadId": upload.get("uploadId") or upload.get("fileId"),
                "fileName": upload.get("originalFileName") or upload.get("fileName"),
                "videoUrl": f"/uploads/video/{upload.get('uploadId') or upload.get('fileId')}",
                "quality": payload.quality,
                "symptomReport": payload.symptomReport,
                "note": payload.note,
                "analysisStatus": "not_started",
                "analysisError": None,
                "completedAt": utc_now(),
                "updatedAt": utc_now(),
            }
            await db.uploads.update_one(
                {"uploadId": upload.get("uploadId") or upload.get("fileId")},
                {
                    "$set": {
                        "sessionId": session["sessionId"],
                        "sessionTaskId": task["sessionTaskId"],
                        "status": "ready",
                        "updatedAt": utc_now(),
                    }
                },
            )
        session_tasks.append(task)

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement task not found.")

    session["sessionTasks"] = session_tasks
    session["status"] = refresh_session_status(session)
    session["updatedAt"] = utc_now()
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"sessionTasks": session["sessionTasks"], "status": session["status"], "updatedAt": session["updatedAt"]}},
    )
    await audit_event(
        action="patient.save_task",
        outcome="success",
        request=request,
        actor=user,
        resource_type="session",
        resource_id=session["sessionId"],
        patient_id=user.id,
        details={"movementType": movement_type, "sessionTaskId": session_task_id, "uploadId": upload_id},
    )
    updated = await db.sessions.find_one({"sessionId": session["sessionId"]})
    return await hydrate_session_document(db, updated)


@router.post("/sessions/submit", response_model=SessionResponse)
async def submit_session(
    background_tasks: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_patient),
) -> dict:
    db = get_db()
    session = await get_active_recording_session(db, user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active session assigned by your doctor.")
    session["status"] = refresh_session_status(session)
    if session["status"] != "ready_to_submit":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete all assigned movement videos before submitting.",
        )

    now = utc_now()
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {
            "$set": {
                "status": "queued_analysis",
                "analysis.status": "queued",
                "analysis.updatedAt": now,
                "submittedAt": now,
                "updatedAt": now,
            }
        },
    )
    background_tasks.add_task(run_session_analysis, session["sessionId"])
    updated = await db.sessions.find_one({"sessionId": session["sessionId"]})
    await audit_event(
        action="patient.submit_session",
        outcome="success",
        request=request,
        actor=user,
        resource_type="session",
        resource_id=session["sessionId"],
        patient_id=user.id,
    )
    return await hydrate_session_document(db, updated)


@router.get("/sessions/latest", response_model=SessionResponse | None)
async def latest_session(request: Request, user: CurrentUser = Depends(require_patient)) -> dict | None:
    db = get_db()
    session = await db.sessions.find_one(
        {"patientId": user.id, "status": {"$nin": ["assigned", "draft", "ready_to_submit"]}},
        sort=[("submittedAt", -1), ("createdAt", -1)],
    )
    await audit_event(action="patient.latest_session", outcome="success", request=request, actor=user, patient_id=user.id)
    return await hydrate_session_document(db, session) if session else None


@router.get("/feedback/latest", response_model=FeedbackResponse | None)
async def latest_feedback(request: Request, user: CurrentUser = Depends(require_patient)) -> dict | None:
    db = get_db()
    feedback = await db.feedback.find_one({"patientId": user.id}, sort=[("createdAt", -1)])
    await audit_event(action="patient.latest_feedback", outcome="success", request=request, actor=user, patient_id=user.id)
    return public_doc(feedback)
