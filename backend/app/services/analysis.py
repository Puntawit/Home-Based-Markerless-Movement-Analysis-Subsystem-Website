from pathlib import Path
from traceback import format_exc

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.mediapipe import assess_video_with_mediapipe, map_doctor_view
from app.services.sessions import new_id, utc_now


async def run_analysis_job(db: AsyncIOMotorDatabase, job_id: str) -> None:
    job = await db.analysis_jobs.find_one({"jobId": job_id})
    if not job:
        return

    session = await db.sessions.find_one({"sessionId": job["sessionId"]})
    if not session:
        await db.analysis_jobs.update_one(
            {"jobId": job_id},
            {"$set": {"status": "failed", "finishedAt": utc_now(), "taskErrors": [{"error": "Session not found"}]}},
        )
        return

    await db.analysis_jobs.update_one(
        {"jobId": job_id},
        {"$set": {"status": "processing", "startedAt": utc_now(), "updatedAt": utc_now()}},
    )
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"status": "processing_analysis", "updatedAt": utc_now()}},
    )

    task_results: list[dict] = []
    task_errors: list[dict] = []
    tasks = session.get("tasks", [])

    for task in tasks:
        movement_type = task.get("movementType")
        task_id = task.get("taskId")
        try:
            upload = await db.uploads.find_one({"fileId": task.get("fileId"), "patientId": session["patientId"]})
            if not upload:
                raise RuntimeError("Task upload file was not found.")

            raw_payload = await assess_video_with_mediapipe(
                patient_id=session["patientId"],
                movement_type=movement_type,
                view=task.get("view", "front"),
                file_path=Path(upload["path"]),
            )
            analysis_result = {
                "analysisResultId": new_id("analysis"),
                "sessionId": session["sessionId"],
                "taskId": task_id,
                "movementType": movement_type,
                "mediaPipeSessionId": raw_payload.get("session_id"),
                "rawPayload": raw_payload,
                "doctorView": map_doctor_view(raw_payload),
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
            error = {"taskId": task_id, "movementType": movement_type, "error": str(exc)}
            task_errors.append(error)
            await db.sessions.update_one(
                {"sessionId": session["sessionId"], "tasks.taskId": task_id},
                {"$set": {"tasks.$.analysisStatus": "failed", "tasks.$.analysisError": str(exc), "updatedAt": utc_now()}},
            )
            print(format_exc())

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
        {"$set": {"status": final_status, "finishedAt": now, "updatedAt": now}},
    )
    await db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {"$set": {"status": session_status, "updatedAt": now}},
    )
