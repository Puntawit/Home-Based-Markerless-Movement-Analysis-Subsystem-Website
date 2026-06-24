from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_doctor
from app.db.mongo import get_db
from app.schemas import FeedbackRequest
from app.services.sessions import new_id, public_doc, utc_now

router = APIRouter(prefix="/doctor", tags=["doctor"])


async def hydrate_session(session: dict) -> dict:
    db = get_db()
    for task in session.get("tasks", []):
        result_id = task.get("analysisResultId")
        if result_id:
            result = await db.analysis_results.find_one({"analysisResultId": result_id})
            task["analysisResult"] = public_doc(result)
    return session


@router.get("/sessions")
async def list_doctor_sessions(user: CurrentUser = Depends(require_doctor)) -> list[dict]:
    db = get_db()
    cursor = db.sessions.find(
        {"status": {"$in": ["pending_doctor_review", "feedback_ready", "analysis_failed", "processing_analysis"]}},
        sort=[("submittedAt", -1), ("createdAt", -1)],
    )
    sessions = []
    async for session in cursor:
        sessions.append(public_doc(session))
    return sessions


@router.get("/sessions/{session_id}")
async def get_doctor_session(session_id: str, user: CurrentUser = Depends(require_doctor)) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"sessionId": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return await hydrate_session(public_doc(session))


@router.post("/sessions/{session_id}/feedback")
async def submit_feedback(
    session_id: str,
    payload: FeedbackRequest,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"sessionId": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

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
    return public_doc(feedback)
