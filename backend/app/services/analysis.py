from pathlib import Path
import logging

from fastapi import HTTPException

from app.core.config import get_settings
from app.db.mongo import get_db
from app.services.mediapipe import assess_video_with_mediapipe, map_doctor_view
from app.services.sessions import new_id, utc_now

logger = logging.getLogger(__name__)


async def recover_pending_analysis_jobs() -> None:
    db = get_db()
    cursor = db.analysis_jobs.find({"status": {"$in": ["queued", "processing"]}})
    async for job in cursor:
        await run_analysis_job(job["jobId"])


async def run_analysis_job(job_id: str) -> None:
    db = get_db()
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        return
    if job.get("status") == "completed":
        return

    session = await db.sessions.find_one({"sessionId": job["sessionId"]})
    if not session:
        await db.analysis_jobs.update_one(
            {"jobId": job_id},
            {
                "$set": {
                    "status": "failed",
                    "finishedAt": utc_now(),
                    "lastError": "Session not found",
                    "taskErrors": [{"error": "Session not found"}],
                }
            },
        )
        return

    now = utc_now()
    await db.analysis_jobs.update_one(
        {"jobId": job_id},
        {
            "$inc": {"attemptCount": 1},
            "$set": {"status": "processing", "startedAt": now, "updatedAt": now, "lastError": None},
        },
    )
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"status": "processing_analysis", "updatedAt": now}},
    )

    task_results: list[dict] = job.get("taskResults", [])
    task_errors: list[dict] = []
    tasks = session.get("tasks", [])

    for task in tasks:
        movement_type = task.get("movementType")
        task_id = task.get("taskId")
        if task.get("analysisStatus") == "completed" and task.get("analysisResultId"):
            continue

        await db.sessions.update_one(
            {"sessionId": session["sessionId"], "tasks.taskId": task_id},
            {"$set": {"tasks.$.analysisStatus": "processing", "tasks.$.analysisError": None, "updatedAt": utc_now()}},
        )
        try:
            upload = await db.uploads.find_one({"fileId": task.get("fileId"), "patientId": session["patientId"]})
            if not upload:
                raise RuntimeError("Task upload file was not found.")

            raw_payload = await assess_video_with_mediapipe(
                patient_id=session["patientId"],
                movement_type=movement_type,
                view=task.get("view", "front"),
                file_path=Path(upload["path"]),
                content_type=upload.get("contentType") or "video/mp4",
            )
            doctor_view = map_doctor_view(raw_payload)
            analysis_result = {
                "analysisResultId": new_id("analysis"),
                "sessionId": session["sessionId"],
                "taskId": task_id,
                "movementType": movement_type,
                "mediaPipeSessionId": raw_payload.get("session_id"),
                "rawPayload": raw_payload if get_settings().store_raw_analysis_payload else {},
                "doctorView": doctor_view,
                "createdAt": utc_now(),
            }
            await db.analysis_results.insert_one(analysis_result)
            await db.sessions.update_one(
                {"sessionId": session["sessionId"], "tasks.taskId": task_id},
                {
                    "$set": {
                        "tasks.$.analysisResultId": analysis_result["analysisResultId"],
                        "tasks.$.analysisStatus": "completed",
                        "updatedAt": utc_now(),
                    }
                },
            )
            task_results.append({"taskId": task_id, "analysisResultId": analysis_result["analysisResultId"]})
        except Exception as exc:  # Keep the job alive so one bad clip does not hide other task results.
            public_error = exc.detail if isinstance(exc, HTTPException) and isinstance(exc.detail, str) else "Movement analysis failed."
            error = {"taskId": task_id, "movementType": movement_type, "error": public_error}
            task_errors.append(error)
            await db.sessions.update_one(
                {"sessionId": session["sessionId"], "tasks.taskId": task_id},
                {"$set": {"tasks.$.analysisStatus": "failed", "tasks.$.analysisError": public_error, "updatedAt": utc_now()}},
            )
            logger.exception("Movement analysis task failed", extra={"job_id": job_id, "task_id": task_id})

        await db.analysis_jobs.update_one(
            {"jobId": job_id},
            {
                "$set": {
                    "completedTasks": len(task_results),
                    "failedTasks": len(task_errors),
                    "taskResults": task_results,
                    "taskErrors": task_errors,
                    "updatedAt": utc_now(),
                }
            },
        )

    final_status = "failed" if task_errors else "completed"
    session_status = "analysis_failed" if task_errors else "pending_doctor_review"
    now = utc_now()
    await db.analysis_jobs.update_one(
        {"jobId": job_id},
        {
            "$set": {
                "status": final_status,
                "finishedAt": now,
                "updatedAt": now,
                "lastError": task_errors[0]["error"] if task_errors else None,
            }
        },
    )
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"status": session_status, "updatedAt": now}},
    )
