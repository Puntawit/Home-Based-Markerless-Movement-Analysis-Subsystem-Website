from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_patient
from app.db.mongo import get_db
from app.schemas import MovementType, SaveTaskRequest
from app.services.analysis import run_analysis_job
from app.services.sessions import get_or_create_draft_session, new_id, public_doc, refresh_session_status, utc_now

router = APIRouter(prefix="/patient", tags=["patient"])


@router.get("/sessions/draft")
async def get_draft_session(user: CurrentUser = Depends(require_patient)) -> dict:
    db = get_db()
    return await get_or_create_draft_session(db, user.id, user.display_name)


@router.post("/sessions/draft/tasks/{movement_type}")
async def save_draft_task(
    movement_type: MovementType,
    payload: SaveTaskRequest,
    user: CurrentUser = Depends(require_patient),
) -> dict:
    db = get_db()
    session = await get_or_create_draft_session(db, user.id, user.display_name)
    upload = await db.uploads.find_one({"fileId": payload.fileId, "patientId": user.id})
    if not upload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="fileId was not found for this patient.")

    tasks = []
    found = False
    for task in session["tasks"]:
        if task["movementType"] == movement_type:
            found = True
            task = {
                **task,
                "status": "recorded",
                "view": payload.view,
                "fileId": payload.fileId,
                "fileName": upload.get("fileName"),
                "videoUrl": f"/uploads/video/{payload.fileId}",
                "quality": payload.quality,
                "symptomReport": payload.symptomReport,
                "note": payload.note,
                "analysisStatus": "not_started",
                "updatedAt": utc_now(),
            }
        tasks.append(task)

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement task not found.")

    session["tasks"] = tasks
    session["status"] = refresh_session_status(session)
    session["updatedAt"] = utc_now()
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"tasks": session["tasks"], "status": session["status"], "updatedAt": session["updatedAt"]}},
    )
    return public_doc(session)


@router.post("/sessions/submit")
async def submit_session(
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(require_patient),
) -> dict:
    db = get_db()
    session = await get_or_create_draft_session(db, user.id, user.display_name)
    session["status"] = refresh_session_status(session)
    if session["status"] != "ready_to_submit":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete all 4 movement videos before submitting.",
        )

    now = utc_now()
    job = {
        "jobId": new_id("job"),
        "sessionId": session["sessionId"],
        "patientId": user.id,
        "status": "queued",
        "totalTasks": len(session["tasks"]),
        "completedTasks": 0,
        "failedTasks": 0,
        "taskResults": [],
        "taskErrors": [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.analysis_jobs.insert_one(job)

    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {
            "$set": {
                "status": "queued_analysis",
                "analysisJobId": job["jobId"],
                "submittedAt": now,
                "updatedAt": now,
            }
        },
    )
    background_tasks.add_task(run_analysis_job, db, job["jobId"])
    updated = await db.sessions.find_one({"sessionId": session["sessionId"]})
    return public_doc(updated)


@router.get("/sessions/latest")
async def latest_session(user: CurrentUser = Depends(require_patient)) -> dict | None:
    db = get_db()
    session = await db.sessions.find_one(
        {"patientId": user.id, "status": {"$nin": ["draft", "ready_to_submit"]}},
        sort=[("submittedAt", -1), ("createdAt", -1)],
    )
    return public_doc(session)


@router.get("/feedback/latest")
async def latest_feedback(user: CurrentUser = Depends(require_patient)) -> dict | None:
    db = get_db()
    feedback = await db.feedback.find_one({"patientId": user.id}, sort=[("createdAt", -1)])
    return public_doc(feedback)
