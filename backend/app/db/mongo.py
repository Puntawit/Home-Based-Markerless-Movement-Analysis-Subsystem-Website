from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.core.config import get_settings

client: AsyncIOMotorClient | None = None


async def connect_to_mongo() -> None:
    global client
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await client.admin.command("ping")
    await create_indexes()


async def close_mongo_connection() -> None:
    if client is not None:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    if client is None:
        raise RuntimeError("MongoDB client is not connected.")
    return client[get_settings().database_name]


async def create_indexes() -> None:
    db = get_db()

    await ensure_partial_unique_string_index(db.users, "userId")
    await ensure_partial_unique_string_index(db.users, "publicId")
    await db.users.create_index([("role", 1), ("assignedDoctorId", 1)])
    await ensure_partial_unique_string_index(db.tasks, "taskId")
    await ensure_partial_unique_string_index(db.tasks, "code")
    await db.tasks.create_index([("isActive", 1), ("category", 1)])
    await db.sessions.create_index([("patientId", 1), ("status", 1)])
    await db.sessions.create_index([("doctorId", 1), ("status", 1), ("submittedAt", -1)])
    await ensure_partial_unique_string_index(db.sessions, "sessionId")
    await ensure_partial_unique_string_index(db.uploads, "uploadId")
    await ensure_partial_unique_string_index(db.uploads, "fileId")
    await db.uploads.create_index([("patientId", 1), ("createdAt", -1)])
    await db.uploads.create_index("sessionId")
    await db.uploads.create_index("sessionTaskId")
    await ensure_partial_unique_string_index(db.analysis_results, "analysisResultId")
    await db.analysis_results.create_index("sessionId")
    await db.analysis_results.create_index("sessionTaskId")
    await ensure_partial_unique_string_index(db.feedback, "feedbackId")
    await db.feedback.create_index([("patientId", 1), ("createdAt", -1)])
    await db.feedback.create_index("sessionId")
    await db.audit_events.create_index([("timestamp", -1)])
    await db.audit_events.create_index("actorId")
    await db.audit_events.create_index("patientId")
    await db.audit_events.create_index("action")


async def ensure_partial_unique_string_index(collection, field: str) -> None:
    index_name = f"{field}_1"
    expected_key = [(field, ASCENDING)]
    expected_filter = {field: {"$type": "string"}}
    existing = await collection.index_information()
    index = existing.get(index_name)

    if index is not None:
        has_expected_key = index.get("key") == expected_key
        has_expected_unique = index.get("unique") is True
        has_expected_filter = index.get("partialFilterExpression") == expected_filter
        if not (has_expected_key and has_expected_unique and has_expected_filter):
            await collection.drop_index(index_name)

    await collection.create_index(
        field,
        name=index_name,
        unique=True,
        partialFilterExpression=expected_filter,
    )
