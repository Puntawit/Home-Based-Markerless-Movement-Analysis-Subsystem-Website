from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, require_doctor, require_patient_access
from app.db.mongo import get_db
from app.schemas import FeedbackRequest, FeedbackResponse, SessionResponse
from app.services.audit import audit_event
from app.services.sessions import new_id, public_doc, utc_now

router = APIRouter(prefix="/doctor", tags=["doctor"])


async def hydrate_session(session: dict) -> dict:
    db = get_db()
    for task in session.get("tasks", []):
        result_id = task.get("analysisResultId")
        if result_id:
            result = await db.analysis_results.find_one({"analysisResultId": result_id})
            task["analysisResult"] = public_doc(result)
    job_id = session.get("analysisJobId")
    if job_id:
        job = await db.analysis_jobs.find_one({"jobId": job_id})
        session["analysisJob"] = public_doc(job)
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
                "$in": ["queued_analysis", "processing_analysis", "pending_doctor_review", "feedback_ready", "analysis_failed"]
            }
        },
        sort=[("submittedAt", -1), ("createdAt", -1)],
    )
    sessions = []
    async for session in cursor:
        sessions.append(await hydrate_session(public_doc(session)))
    await audit_event(action="doctor.list_sessions", outcome="success", request=request, actor=user)
    return sessions


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
        "feedbackId": new_id("feedback"),
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
