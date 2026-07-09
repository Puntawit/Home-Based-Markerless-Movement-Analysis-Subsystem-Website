from datetime import datetime, timezone
from uuid import uuid4


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_uuid() -> str:
    return str(uuid4())


def new_prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
