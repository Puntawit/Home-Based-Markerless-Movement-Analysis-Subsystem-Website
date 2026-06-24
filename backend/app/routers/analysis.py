from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user
from app.db.mongo import get_db
from app.services.sessions import public_doc

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/jobs/{job_id}")
async def get_analysis_job(job_id: str, user: CurrentUser = Depends(get_current_user)) -> dict:
    db = get_db()
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    if user.role == "patient" and job.get("patientId") != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analysis job access denied.")
    return public_doc(job)
