"""Login attempt throttling backed by Mongo.

Implemented against Mongo rather than redis/slowapi to avoid adding a dependency
(and an extra service to operate) for a single-clinic deployment. The atomic
`$inc` keeps it correct across multiple app instances too.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.core.config import get_settings

LOCKED_DETAIL = "Too many failed login attempts. Please wait and try again."


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def identifier_key(identifier: str) -> str:
    return f"id:{identifier.strip().upper()}"


def client_ip(request: Request | None) -> str | None:
    """Best-effort client IP.

    Only trustworthy once a reverse proxy sets a validated forwarded header and
    uvicorn runs with --proxy-headers. Until then this is advisory and the
    per-identifier limit does the real work.
    """
    if request is None or request.client is None:
        return None
    return request.client.host


def ip_key(ip: str) -> str:
    return f"ip:{ip}"


def _limit_for(key: str) -> int:
    settings = get_settings()
    # A shared clinic NAT can produce many legitimate failures, so the per-IP
    # ceiling is deliberately looser than the per-account one.
    return settings.max_failed_logins * 4 if key.startswith("ip:") else settings.max_failed_logins


async def _locked_until(db: AsyncIOMotorDatabase, key: str) -> datetime | None:
    document = await db.login_attempts.find_one({"key": key}, {"lockedUntil": 1})
    locked_until = (document or {}).get("lockedUntil")
    if not isinstance(locked_until, datetime):
        return None
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    return locked_until if locked_until > _utc_now() else None


async def enforce_not_locked(db: AsyncIOMotorDatabase, identifier: str, request: Request | None) -> None:
    keys = [identifier_key(identifier)]
    ip = client_ip(request)
    if ip:
        keys.append(ip_key(ip))
    for key in keys:
        if await _locked_until(db, key):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=LOCKED_DETAIL)


async def _record_failure_for_key(db: AsyncIOMotorDatabase, key: str) -> None:
    settings = get_settings()
    now = _utc_now()
    document = await db.login_attempts.find_one_and_update(
        {"key": key},
        {"$inc": {"failedCount": 1}, "$setOnInsert": {"firstFailedAt": now}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if int((document or {}).get("failedCount") or 0) >= _limit_for(key):
        await db.login_attempts.update_one(
            {"key": key},
            {"$set": {"lockedUntil": now + timedelta(minutes=settings.lockout_minutes)}},
        )


async def record_failure(db: AsyncIOMotorDatabase, identifier: str, request: Request | None) -> None:
    await _record_failure_for_key(db, identifier_key(identifier))
    ip = client_ip(request)
    if ip:
        await _record_failure_for_key(db, ip_key(ip))


async def clear_failures(db: AsyncIOMotorDatabase, identifier: str, request: Request | None) -> None:
    keys = [identifier_key(identifier)]
    ip = client_ip(request)
    if ip:
        keys.append(ip_key(ip))
    await db.login_attempts.delete_many({"key": {"$in": keys}})
