from typing import Any
from uuid import uuid4

from fastapi import Request

from app.core.auth import CurrentUser
from app.db.mongo import get_db
from app.services.sessions import utc_now


async def audit_event(
    *,
    action: str,
    outcome: str,
    request: Request | None = None,
    actor: CurrentUser | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    patient_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    event = {
        "eventId": f"audit_{uuid4().hex}",
        "timestamp": utc_now(),
        "actorId": actor.id if actor else None,
        "actorRole": actor.role if actor else None,
        "action": action,
        "resourceType": resource_type,
        "resourceId": resource_id,
        "patientId": patient_id,
        "outcome": outcome,
        "requestId": getattr(request.state, "request_id", None) if request else None,
        "ip": request.client.host if request and request.client else None,
        "userAgent": request.headers.get("user-agent") if request else None,
        "details": details or {},
    }
    try:
        await get_db().audit_events.insert_one(event)
    except Exception:
        # Audit should be best-effort in this demo backend; production should fail closed.
        return
