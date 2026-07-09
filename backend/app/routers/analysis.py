from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, get_current_user, require_doctor, require_patient_access
from app.db.mongo import get_db
from app.schemas import AnalysisJobResponse
from app.services.audit import audit_event
from app.services.analysis import run_session_analysis
from app.services.session_mapper import public_doc
from app.services.sessions import utc_now

router = APIRouter(prefix="/analysis", tags=["analysis"])


def job_response_from_session(session: dict) -> dict:
    analysis = session.get("analysis") or {}
    tasks = session.get("sessionTasks", [])
    return {
        "jobId": session.get("analysisJobId") or session["sessionId"],
        "sessionId": session["sessionId"],
        "patientId": session["patientId"],
        "status": analysis.get("status", "queued"),
        "totalTasks": len(tasks),
        "completedTasks": sum(1 for task in tasks if task.get("analysisStatus") == "completed"),
        "failedTasks": sum(1 for task in tasks if task.get("analysisStatus") == "failed"),
        "taskResults": [
            {"taskId": task.get("sessionTaskId"), "analysisResultId": task.get("analysisResultId")}
            for task in tasks
            if task.get("analysisResultId")
        ],
        "taskErrors": [
            {"taskId": task.get("sessionTaskId"), "movementType": task.get("taskCode"), "error": task.get("analysisError")}
            for task in tasks
            if task.get("analysisError")
        ],
        "attemptCount": int(analysis.get("attemptCount") or 0),
        "lastError": analysis.get("lastError"),
        "startedAt": analysis.get("startedAt"),
        "finishedAt": analysis.get("finishedAt"),
        "createdAt": session.get("submittedAt") or session.get("createdAt"),
        "updatedAt": analysis.get("updatedAt") or session.get("updatedAt"),
    }


@router.get("/jobs/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job(
    job_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"$or": [{"analysisJobId": job_id}, {"sessionId": job_id}]})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    require_patient_access(user, session.get("patientId", ""))
    await audit_event(
        action="analysis.get_job",
        outcome="success",
        request=request,
        actor=user,
        resource_type="analysis_job",
        resource_id=job_id,
        patient_id=session.get("patientId"),
    )
    return public_doc(job_response_from_session(session))


@router.post("/jobs/{job_id}/retry", response_model=AnalysisJobResponse)
async def retry_analysis_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    session = await db.sessions.find_one({"$or": [{"analysisJobId": job_id}, {"sessionId": job_id}]})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    require_patient_access(user, session["patientId"])

    now = utc_now()
    session_tasks = []
    for task in session.get("sessionTasks", []):
        if task.get("analysisStatus") == "failed":
            task = {**task, "analysisStatus": "not_started", "analysisError": None}
        session_tasks.append(task)
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {
            "$set": {
                "status": "queued_analysis",
                "sessionTasks": session_tasks,
                "analysis.status": "queued",
                "analysis.lastError": None,
                "analysis.updatedAt": now,
                "updatedAt": now,
            }
        },
    )
    background_tasks.add_task(run_session_analysis, session["sessionId"])
    updated = await db.sessions.find_one({"sessionId": session["sessionId"]})
    await audit_event(
        action="analysis.retry_job",
        outcome="success",
        request=request,
        actor=user,
        resource_type="analysis_job",
        resource_id=session["sessionId"],
        patient_id=session["patientId"],
    )
    return public_doc(job_response_from_session(updated))


@router.post("/sessions/{session_id}/retry", response_model=AnalysisJobResponse)
async def retry_analysis_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    return await retry_analysis_job(session_id, background_tasks, request, user)
