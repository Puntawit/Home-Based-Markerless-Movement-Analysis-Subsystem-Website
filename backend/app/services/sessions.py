from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.movement_tasks import all_tasks_recorded, create_empty_tasks, uses_active_task_protocol


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


async def get_or_create_draft_session(db: AsyncIOMotorDatabase, patient_id: str, patient_name: str) -> dict:
    session = await db.sessions.find_one({"patientId": patient_id, "status": {"$in": ["draft", "ready_to_submit"]}})
    if session:
        if not uses_active_task_protocol(session.get("tasks", [])):
            now = utc_now()
            session["tasks"] = create_empty_tasks()
            session["status"] = "draft"
            session["updatedAt"] = now
            await db.sessions.update_one(
                {"sessionId": session["sessionId"]},
                {"$set": {"tasks": session["tasks"], "status": session["status"], "updatedAt": now}},
            )
        session.pop("_id", None)
        return session

    now = utc_now()
    session = {
        "sessionId": new_id("sess"),
        "patientId": patient_id,
        "patientName": patient_name,
        "status": "draft",
        "tasks": create_empty_tasks(),
        "createdAt": now,
        "updatedAt": now,
    }
    await db.sessions.insert_one(session)
    session.pop("_id", None)
    return session


def public_doc(document: dict | None) -> dict | None:
    if document is None:
        return None
    document.pop("_id", None)
    return document


def refresh_session_status(session: dict) -> str:
    return "ready_to_submit" if all_tasks_recorded(session.get("tasks", [])) else "draft"
