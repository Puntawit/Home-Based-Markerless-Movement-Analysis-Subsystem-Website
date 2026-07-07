from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

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
    await db.sessions.create_index([("patientId", 1), ("status", 1)])
    await db.sessions.create_index("sessionId", unique=True)
    await db.uploads.create_index("fileId", unique=True)
    await db.uploads.create_index([("patientId", 1), ("createdAt", -1)])
    await db.analysis_jobs.create_index("jobId", unique=True)
    await db.analysis_jobs.create_index([("patientId", 1), ("status", 1)])
    await db.feedback.create_index([("patientId", 1), ("createdAt", -1)])
    await db.admin_users.create_index("userId", unique=True)
    await db.admin_users.create_index([("role", 1), ("name", 1)])
    await db.audit_events.create_index("timestamp")
    await db.audit_events.create_index("actorRole")
    await db.audit_events.create_index("action")
    await db.audit_events.create_index("patientId")
