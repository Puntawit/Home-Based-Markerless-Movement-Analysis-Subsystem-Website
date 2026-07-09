from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.task_catalog import find_task_by_id


def public_doc(document: dict | None) -> dict | None:
    if document is None:
        return None
    document.pop("_id", None)
    return document


def legacy_task_from_session_task(session_task: dict[str, Any]) -> dict[str, Any]:
    return {
        "taskId": session_task.get("sessionTaskId") or session_task.get("taskId"),
        "movementType": session_task.get("taskCode"),
        "taskLabel": session_task.get("taskLabel"),
        "status": session_task.get("status", "not_started"),
        "analysisStatus": session_task.get("analysisStatus", "not_started"),
        "analysisError": session_task.get("analysisError"),
        "analysisResultId": session_task.get("analysisResultId"),
        "analysisResult": session_task.get("analysisResult"),
        "view": session_task.get("view"),
        "fileId": session_task.get("uploadId"),
        "fileName": session_task.get("fileName"),
        "videoUrl": session_task.get("videoUrl"),
        "quality": session_task.get("quality"),
        "symptomReport": session_task.get("symptomReport"),
        "note": session_task.get("note"),
        "updatedAt": session_task.get("updatedAt"),
    }


async def hydrate_session_document(db: AsyncIOMotorDatabase, session: dict[str, Any]) -> dict[str, Any]:
    session = public_doc(session) or {}
    session["analysisJobId"] = session.get("analysisJobId") or session.get("sessionId")
    session_tasks = session.get("sessionTasks")
    if not session_tasks and session.get("tasks"):
        session["tasks"] = session.get("tasks", [])
        return session

    hydrated_tasks: list[dict[str, Any]] = []
    for session_task in session_tasks or []:
        task_def = await find_task_by_id(db, session_task.get("taskId"))
        enriched = {
            **session_task,
            "movementType": session_task.get("movementType") or session_task.get("taskCode"),
            "taskLabel": session_task.get("taskLabel") or (task_def.get("name") if task_def else session_task.get("taskCode")),
            "fileId": session_task.get("fileId") or session_task.get("uploadId"),
            "fileName": session_task.get("fileName"),
            "videoUrl": session_task.get("videoUrl"),
        }
        hydrated_tasks.append(enriched)
    session["sessionTasks"] = hydrated_tasks
    session["tasks"] = [legacy_task_from_session_task(task) for task in hydrated_tasks]
    return session
