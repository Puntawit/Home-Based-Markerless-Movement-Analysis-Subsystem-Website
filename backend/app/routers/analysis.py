from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, get_current_user, require_doctor, require_patient_access
from app.db.mongo import get_db
from app.schemas import AnalysisJobResponse
from app.services.audit import audit_event
from app.services.analysis import run_analysis_job
from app.services.sessions import public_doc, utc_now

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/jobs/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job(
    job_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    db = get_db()
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    require_patient_access(user, job.get("patientId", ""))
    await audit_event(
        action="analysis.get_job",
        outcome="success",
        request=request,
        actor=user,
        resource_type="analysis_job",
        resource_id=job_id,
        patient_id=job.get("patientId"),
    )
    return public_doc(job)


@router.post("/jobs/{job_id}/retry", response_model=AnalysisJobResponse)
async def retry_analysis_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_doctor),
) -> dict:
    db = get_db()
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    session = await db.sessions.find_one({"sessionId": job.get("sessionId")})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    require_patient_access(user, session["patientId"])

    now = utc_now()
    await db.analysis_jobs.update_one(
        {"jobId": job_id},
        {
            "$set": {
                "status": "queued",
                "taskErrors": [],
                "lastError": None,
                "updatedAt": now,
            }
        },
    )
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"status": "queued_analysis", "updatedAt": now}},
    )
    background_tasks.add_task(run_analysis_job, job_id)
    updated = await db.analysis_jobs.find_one({"jobId": job_id})
    await audit_event(
        action="analysis.retry_job",
        outcome="success",
        request=request,
        actor=user,
        resource_type="analysis_job",
        resource_id=job_id,
        patient_id=session["patientId"],
    )
    return public_doc(updated)
