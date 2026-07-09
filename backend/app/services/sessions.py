from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.common import new_prefixed_id, new_uuid, utc_now
from app.services.task_catalog import list_active_tasks
from app.services.users import find_user_for_reference


def new_id(prefix: str) -> str:
    return new_prefixed_id(prefix)


def session_analysis_summary(session: dict[str, Any]) -> dict[str, Any]:
    analysis = session.get("analysis") or {}
    return {
        "status": analysis.get("status", "not_started"),
        "attemptCount": int(analysis.get("attemptCount") or 0),
        "lastError": analysis.get("lastError"),
        "startedAt": analysis.get("startedAt"),
        "finishedAt": analysis.get("finishedAt"),
        "updatedAt": analysis.get("updatedAt"),
    }


def all_tasks_recorded(session_tasks: list[dict[str, Any]]) -> bool:
    return bool(session_tasks) and all(task.get("status") == "recorded" and task.get("uploadId") for task in session_tasks)


def refresh_session_status(session: dict[str, Any]) -> str:
    current_status = session.get("status")
    if current_status in {"queued_analysis", "processing_analysis", "pending_doctor_review", "feedback_ready", "analysis_failed"}:
        return current_status
    if current_status == "assigned" and not any(task.get("status") == "recorded" for task in session.get("sessionTasks", [])):
        return "assigned"
    return "ready_to_submit" if all_tasks_recorded(session.get("sessionTasks", [])) else "draft"


ACTIVE_RECORDING_STATUSES = {"assigned", "draft", "ready_to_submit"}


async def build_session_tasks(db: AsyncIOMotorDatabase, task_codes: list[str] | None = None) -> list[dict[str, Any]]:
    tasks = await list_active_tasks(db)
    if task_codes is not None:
        task_order = {code: index for index, code in enumerate(task_codes)}
        tasks = sorted([task for task in tasks if task["code"] in task_order], key=lambda task: task_order[task["code"]])
    now = utc_now()
    return [
        {
            "sessionTaskId": new_uuid(),
            "taskId": task["taskId"],
            "taskCode": task["code"],
            "taskVersion": task.get("version", 1),
            "taskLabel": task.get("name"),
            "status": "not_started",
            "uploadId": None,
            "analysisStatus": "not_started",
            "analysisResultId": None,
            "analysisError": None,
            "view": task.get("defaultView"),
            "quality": {},
            "symptomReport": {},
            "note": None,
            "assignedAt": now,
            "completedAt": None,
            "updatedAt": now,
        }
        for task in tasks
    ]


async def convert_legacy_tasks_to_session_tasks(db: AsyncIOMotorDatabase, tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    active_tasks = {task["code"]: task for task in await list_active_tasks(db)}
    now = utc_now()
    session_tasks: list[dict[str, Any]] = []
    for task in tasks:
        task_code = task.get("movementType")
        task_def = active_tasks.get(task_code)
        if not task_def:
            continue
        session_tasks.append(
            {
                "sessionTaskId": new_uuid(),
                "taskId": task_def["taskId"],
                "taskCode": task_code,
                "taskVersion": task_def.get("version", 1),
                "taskLabel": task.get("taskLabel") or task_def.get("name"),
                "status": task.get("status", "not_started"),
                "uploadId": task.get("fileId"),
                "analysisStatus": task.get("analysisStatus", "not_started"),
                "analysisResultId": task.get("analysisResultId"),
                "analysisError": task.get("analysisError"),
                "view": task.get("view") or task_def.get("defaultView"),
                "quality": task.get("quality") or {},
                "symptomReport": task.get("symptomReport") or {},
                "note": task.get("note"),
                "assignedAt": task.get("updatedAt") or now,
                "completedAt": task.get("updatedAt") if task.get("status") == "recorded" else None,
                "updatedAt": task.get("updatedAt") or now,
                "fileName": task.get("fileName"),
                "videoUrl": task.get("videoUrl"),
            }
        )
    return session_tasks


async def ensure_session_schema(db: AsyncIOMotorDatabase, session: dict[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if not session.get("sessionTasks"):
        legacy_tasks = session.get("tasks", [])
        updates["sessionTasks"] = await convert_legacy_tasks_to_session_tasks(db, legacy_tasks) if legacy_tasks else await build_session_tasks(db)
    if "analysis" not in session:
        updates["analysis"] = {
            "status": "not_started",
            "attemptCount": 0,
            "lastError": None,
            "startedAt": None,
            "finishedAt": None,
            "updatedAt": session.get("updatedAt") or utc_now(),
        }
    if "patientPublicId" not in session:
        patient = await find_user_for_reference(db, session.get("patientId"))
        updates["patientPublicId"] = patient.get("publicId") if patient else session.get("patientId")
    if "doctorId" not in session:
        patient = await find_user_for_reference(db, session.get("patientId"))
        updates["doctorId"] = patient.get("assignedDoctorId") if patient else None
    if not session.get("analysisJobId"):
        updates["analysisJobId"] = session["sessionId"]
    if updates:
        updates["updatedAt"] = utc_now()
        await db.sessions.update_one({"sessionId": session["sessionId"]}, {"$set": updates})
        session.update(updates)
    session["status"] = refresh_session_status(session)
    return session


async def get_active_recording_session(db: AsyncIOMotorDatabase, patient_id: str) -> dict[str, Any] | None:
    session = await db.sessions.find_one(
        {"patientId": patient_id, "status": {"$in": sorted(ACTIVE_RECORDING_STATUSES)}},
        sort=[("createdAt", -1)],
    )
    return await ensure_session_schema(db, session) if session else None


async def get_or_create_draft_session(db: AsyncIOMotorDatabase, patient_id: str, patient_name: str, patient_public_id: str) -> dict[str, Any]:
    session = await get_active_recording_session(db, patient_id)
    if session:
        return session

    patient = await find_user_for_reference(db, patient_id)
    now = utc_now()
    session_id = new_uuid()
    session = {
        "sessionId": session_id,
        "analysisJobId": session_id,
        "patientId": patient_id,
        "patientPublicId": patient_public_id,
        "patientName": patient_name,
        "doctorId": patient.get("assignedDoctorId") if patient else None,
        "status": "draft",
        "analysis": {
            "status": "not_started",
            "attemptCount": 0,
            "lastError": None,
            "startedAt": None,
            "finishedAt": None,
            "updatedAt": now,
        },
        "sessionTasks": await build_session_tasks(db),
        "feedbackId": None,
        "createdAt": now,
        "submittedAt": None,
        "updatedAt": now,
    }
    await db.sessions.insert_one(session)
    return session


async def create_assigned_session(
    db: AsyncIOMotorDatabase,
    *,
    patient: dict[str, Any],
    doctor_id: str,
    task_codes: list[str],
    instructions: str | None = None,
) -> dict[str, Any]:
    active_session = await get_active_recording_session(db, patient["userId"])
    if active_session:
        raise ValueError("active_session_exists")

    now = utc_now()
    session_id = new_uuid()
    session = {
        "sessionId": session_id,
        "analysisJobId": session_id,
        "patientId": patient["userId"],
        "patientPublicId": patient.get("publicId"),
        "patientName": patient.get("name") or patient.get("publicId") or patient["userId"],
        "doctorId": doctor_id,
        "status": "assigned",
        "instructions": instructions,
        "analysis": {
            "status": "not_started",
            "attemptCount": 0,
            "lastError": None,
            "startedAt": None,
            "finishedAt": None,
            "updatedAt": now,
        },
        "sessionTasks": await build_session_tasks(db, task_codes),
        "feedbackId": None,
        "createdAt": now,
        "submittedAt": None,
        "updatedAt": now,
    }
    await db.sessions.insert_one(session)
    return session
