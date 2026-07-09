import logging

from fastapi import HTTPException

from app.core.config import get_settings
from app.db.mongo import get_db
from app.services.common import new_uuid, utc_now
from app.services.mediapipe import assess_video_with_mediapipe, map_doctor_view
from app.services.storage import resolve_local_storage_path
from app.services.task_catalog import find_task_by_id

logger = logging.getLogger(__name__)


async def recover_pending_analysis_jobs() -> None:
    db = get_db()
    cursor = db.sessions.find({"analysis.status": {"$in": ["queued", "processing"]}})
    async for session in cursor:
        await run_session_analysis(session["sessionId"])


async def _sync_legacy_job_record(session: dict) -> None:
    db = get_db()
    analysis = session.get("analysis") or {}
    if not session.get("analysisJobId"):
        return
    await db.analysis_jobs.update_one(
        {"jobId": session["analysisJobId"]},
        {
            "$set": {
                "sessionId": session["sessionId"],
                "patientId": session["patientId"],
                "status": analysis.get("status", "queued"),
                "totalTasks": len(session.get("sessionTasks", [])),
                "completedTasks": sum(1 for task in session.get("sessionTasks", []) if task.get("analysisStatus") == "completed"),
                "failedTasks": sum(1 for task in session.get("sessionTasks", []) if task.get("analysisStatus") == "failed"),
                "taskResults": [
                    {"taskId": task.get("sessionTaskId"), "analysisResultId": task.get("analysisResultId")}
                    for task in session.get("sessionTasks", [])
                    if task.get("analysisResultId")
                ],
                "taskErrors": [
                    {"taskId": task.get("sessionTaskId"), "movementType": task.get("taskCode"), "error": task.get("analysisError")}
                    for task in session.get("sessionTasks", [])
                    if task.get("analysisError")
                ],
                "attemptCount": int(analysis.get("attemptCount") or 0),
                "lastError": analysis.get("lastError"),
                "startedAt": analysis.get("startedAt"),
                "finishedAt": analysis.get("finishedAt"),
                "updatedAt": analysis.get("updatedAt") or utc_now(),
                "createdAt": analysis.get("startedAt") or session.get("submittedAt") or session.get("createdAt"),
            }
        },
        upsert=True,
    )


async def run_analysis_job(job_id: str) -> None:
    db = get_db()
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        return
    await run_session_analysis(job["sessionId"])


async def run_session_analysis(session_id: str) -> None:
    db = get_db()
    session = await db.sessions.find_one({"sessionId": session_id})
    if not session:
        return

    now = utc_now()
    analysis = session.get("analysis") or {}
    attempt_count = int(analysis.get("attemptCount") or 0) + 1
    await db.sessions.update_one(
        {"sessionId": session_id},
        {
            "$set": {
                "status": "processing_analysis",
                "analysis.status": "processing",
                "analysis.attemptCount": attempt_count,
                "analysis.lastError": None,
                "analysis.startedAt": now,
                "analysis.updatedAt": now,
                "updatedAt": now,
            }
        },
    )
    session = await db.sessions.find_one({"sessionId": session_id})
    task_errors: list[dict] = []

    for task in session.get("sessionTasks", []):
        session_task_id = task.get("sessionTaskId")
        if task.get("analysisStatus") == "completed" and task.get("analysisResultId"):
            continue

        await db.sessions.update_one(
            {"sessionId": session_id, "sessionTasks.sessionTaskId": session_task_id},
            {
                "$set": {
                    "sessionTasks.$.analysisStatus": "processing",
                    "sessionTasks.$.analysisError": None,
                    "sessionTasks.$.updatedAt": utc_now(),
                    "updatedAt": utc_now(),
                }
            },
        )

        try:
            upload_id = task.get("uploadId")
            upload = await db.uploads.find_one({"$or": [{"uploadId": upload_id}, {"fileId": upload_id}], "patientId": session["patientId"]})
            if not upload:
                raise RuntimeError("Task upload file was not found.")

            task_def = await find_task_by_id(db, task.get("taskId"))
            if not task_def:
                raise RuntimeError("Task definition was not found.")

            raw_payload = await assess_video_with_mediapipe(
                patient_id=session.get("patientPublicId") or session["patientId"],
                movement_type=task_def.get("analysisConfig", {}).get("movementType") or task.get("taskCode"),
                view=task.get("view", "front"),
                file_path=resolve_local_storage_path(upload["objectKey"]),
                content_type=upload.get("contentType") or "video/mp4",
            )
            doctor_view = map_doctor_view(raw_payload)
            analysis_result = {
                "analysisResultId": new_uuid(),
                "sessionId": session_id,
                "sessionTaskId": session_task_id,
                "taskId": task.get("taskId"),
                "taskCode": task.get("taskCode"),
                "movementType": task.get("taskCode"),
                "mediaPipeSessionId": raw_payload.get("session_id"),
                "rawPayload": raw_payload if get_settings().store_raw_analysis_payload else {},
                "doctorView": doctor_view,
                "patientId": session["patientId"],
                "createdAt": utc_now(),
            }
            await db.analysis_results.insert_one(analysis_result)
            await db.sessions.update_one(
                {"sessionId": session_id, "sessionTasks.sessionTaskId": session_task_id},
                {
                    "$set": {
                        "sessionTasks.$.analysisResultId": analysis_result["analysisResultId"],
                        "sessionTasks.$.analysisStatus": "completed",
                        "sessionTasks.$.analysisError": None,
                        "sessionTasks.$.updatedAt": utc_now(),
                        "updatedAt": utc_now(),
                    }
                },
            )
        except Exception as exc:
            public_error = exc.detail if isinstance(exc, HTTPException) and isinstance(exc.detail, str) else "Movement analysis failed."
            task_errors.append({"taskId": session_task_id, "movementType": task.get("taskCode"), "error": public_error})
            await db.sessions.update_one(
                {"sessionId": session_id, "sessionTasks.sessionTaskId": session_task_id},
                {
                    "$set": {
                        "sessionTasks.$.analysisStatus": "failed",
                        "sessionTasks.$.analysisError": public_error,
                        "sessionTasks.$.updatedAt": utc_now(),
                        "updatedAt": utc_now(),
                    }
                },
            )
            logger.exception("Movement analysis task failed", extra={"session_id": session_id, "session_task_id": session_task_id})

    session = await db.sessions.find_one({"sessionId": session_id})
    final_status = "failed" if task_errors else "completed"
    session_status = "analysis_failed" if task_errors else "pending_doctor_review"
    now = utc_now()
    await db.sessions.update_one(
        {"sessionId": session_id},
        {
            "$set": {
                "status": session_status,
                "analysis.status": final_status,
                "analysis.lastError": task_errors[0]["error"] if task_errors else None,
                "analysis.finishedAt": now,
                "analysis.updatedAt": now,
                "updatedAt": now,
            }
        },
    )
    updated_session = await db.sessions.find_one({"sessionId": session_id})
    if updated_session:
        await _sync_legacy_job_record(updated_session)
