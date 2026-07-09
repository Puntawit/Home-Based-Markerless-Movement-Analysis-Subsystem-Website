from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, require_doctor, require_patient_access
from app.db.mongo import get_db
from app.schemas import CreateDoctorSessionRequest, FeedbackRequest, FeedbackResponse, SessionResponse
from app.services.audit import audit_event
from app.services.session_mapper import hydrate_session_document, public_doc
from app.services.sessions import ACTIVE_RECORDING_STATUSES, create_assigned_session, utc_now
from app.services.task_catalog import find_task_by_code
from app.services.users import find_user_for_reference, get_assigned_patients_for_doctor, new_uuid

router = APIRouter(prefix="/doctor", tags=["doctor"])


async def hydrate_session(session: dict) -> dict:
    db = get_db()
    session = await hydrate_session_document(db, session)
    for task in session.get("sessionTasks", []):
        result_id = task.get("analysisResultId")
        if result_id:
            result = await db.analysis_results.find_one({"analysisResultId": result_id})
            task["analysisResult"] = public_doc(result)
    session["tasks"] = session.get("tasks") or []
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def list_doctor_sessions(request: Request, user: CurrentUser = Depends(require_doctor)) -> list[dict]:
    db = get_db()
    if not user.assigned_patient_ids:
        await audit_event(action="doctor.list_sessions", outcome="success", request=request, actor=user)
        return []
    cursor = db.sessions.find(
        {
            "patientId": {"$in": sorted(user.assigned_patient_ids)},
            "status": {
                "$in": [
                    *sorted(ACTIVE_RECORDING_STATUSES),
                    "queued_analysis",
                    "processing_analysis",
                    "pending_doctor_review",
                    "feedback_ready",
                    "analysis_failed",
                ]
            }
        },
        sort=[("submittedAt", -1), ("createdAt", -1)],
    )
    sessions = []
    async for session in cursor:
        sessions.append(await hydrate_session(public_doc(session)))
    await audit_event(action="doctor.list_sessions", outcome="success", request=request, actor=user)
    return sessions


@router.get("/patients")
async def list_assigned_patients(request: Request, user: CurrentUser = Depends(require_doctor)) -> list[dict]:
    db = get_db()
    patients = await get_assigned_patients_for_doctor(db, user.id)
    response = []
    for patient in patients:
        sessions = await db.sessions.find(
            {"patientId": patient["userId"], "status": {"$in": [*sorted(ACTIVE_RECORDING_STATUSES), "queued_analysis", "processing_analysis", "pending_doctor_review", "feedback_ready", "analysis_failed"]}},
            sort=[("submittedAt", -1), ("createdAt", -1)],
        ).to_list(length=50)
        response.append(
            {
                "patientId": patient["userId"],
                "patientName": patient.get("name") or patient.get("publicId") or patient["userId"],
                "publicId": patient.get("publicId"),
                "age": (patient.get("profile") or {}).get("age"),
                "sessions": [await hydrate_session(public_doc(session)) for session in sessions],
            }
        )
    await audit_event(action="doctor.list_patients", outcome="success", request=request, actor=user)
    return response


@router.post("/patients/{patient_id}/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_session(
    patient_id: str,
    payload: CreateDoctorSessionRequest,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    patient = await find_user_for_reference(db, patient_id)
    if not patient or patient.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    require_patient_access(user, patient["userId"])

    if not payload.taskCodes:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select at least one movement task.")
    if len(payload.taskCodes) != len(set(payload.taskCodes)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate movement tasks are not allowed.")

    active_codes = []
    for task_code in payload.taskCodes:
        task = await find_task_by_code(db, task_code)
        if not task or not task.get("isActive"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Movement task is not active: {task_code}")
        active_codes.append(task_code)

    try:
        session = await create_assigned_session(
            db,
            patient=patient,
            doctor_id=user.id,
            task_codes=active_codes,
            instructions=payload.instructions,
        )
    except ValueError as exc:
        if str(exc) == "active_session_exists":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This patient already has an active recording session.",
            ) from exc
        raise

    await audit_event(
        action="doctor.create_session",
        outcome="success",
        request=request,
        actor=user,
        resource_type="session",
        resource_id=session["sessionId"],
        patient_id=patient["userId"],
        details={"taskCodes": active_codes},
    )
    return await hydrate_session(session)


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_doctor_session(
    session_id: str,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"sessionId": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    require_patient_access(user, session["patientId"])
    await audit_event(
        action="doctor.get_session",
        outcome="success",
        request=request,
        actor=user,
        resource_type="session",
        resource_id=session_id,
        patient_id=session["patientId"],
    )
    return await hydrate_session(public_doc(session))


@router.post("/sessions/{session_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    session_id: str,
    payload: FeedbackRequest,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"sessionId": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    require_patient_access(user, session["patientId"])
    if session.get("status") not in {"pending_doctor_review", "feedback_ready"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can be sent only after analysis is ready for doctor review.",
        )

    now = utc_now()
    feedback = {
        "feedbackId": new_uuid(),
        "sessionId": session_id,
        "patientId": session["patientId"],
        "doctorId": user.id,
        "doctorName": user.display_name,
        "patientSummary": payload.patientSummary,
        "clinicalSummary": payload.clinicalSummary,
        "summary": payload.patientSummary,
        "recommendations": payload.recommendations,
        "exercisePlan": payload.exercisePlan,
        "retakeRequests": payload.retakeRequests,
        "taskNotes": payload.taskNotes,
        "createdAt": now,
    }
    await db.feedback.insert_one(feedback)
    await db.sessions.update_one(
        {"sessionId": session_id},
        {"$set": {"status": "feedback_ready", "feedbackId": feedback["feedbackId"], "updatedAt": now}},
    )
    await audit_event(
        action="doctor.submit_feedback",
        outcome="success",
        request=request,
        actor=user,
        resource_type="session",
        resource_id=session_id,
        patient_id=session["patientId"],
    )
    return public_doc(feedback)
