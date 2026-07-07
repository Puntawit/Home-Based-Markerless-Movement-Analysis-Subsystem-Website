import base64
import hashlib
import hmac
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException, status

from app.core.config import get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    role: str
    display_name: str
    assigned_patient_ids: set[str] = field(default_factory=set)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def _sign(message: str) -> str:
    secret = get_settings().auth_secret_key.encode("utf-8")
    signature = hmac.new(secret, message.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(signature)


def create_signed_token(payload: dict[str, Any], ttl: timedelta) -> tuple[str, str]:
    expires_at = utc_now() + ttl
    token_payload = {
        **payload,
        "iat": int(utc_now().timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(token_payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}"
    return f"{signing_input}.{_sign(signing_input)}", expires_at.isoformat().replace("+00:00", "Z")


def verify_signed_token(token: str, expected_purpose: str) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected_signature = _sign(signing_input)
        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError("Invalid signature")
        header = json.loads(_b64url_decode(encoded_header))
        payload = json.loads(_b64url_decode(encoded_payload))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    if header.get("alg") != "HS256" or payload.get("purpose") != expected_purpose:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    if int(payload.get("exp", 0)) <= int(utc_now().timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired.")
    return payload


def create_access_token(*, user_id: str, role: str, display_name: str) -> tuple[str, str]:
    settings = get_settings()
    return create_signed_token(
        {
            "purpose": "access",
            "sub": user_id,
            "role": role,
            "displayName": display_name,
        },
        timedelta(minutes=settings.access_token_ttl_minutes),
    )


def hash_password(password: str, *, salt: str | None = None, iterations: int = 390000) -> str:
    password_salt = salt or base64.urlsafe_b64encode(os.urandom(16)).decode("ascii").rstrip("=")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), password_salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${password_salt}${_b64url_encode(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt, expected_hash = password_hash.split("$", 3)
        iterations = int(iteration_text)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256" or iterations < 100000:
        return False

    candidate = hash_password(password, salt=salt, iterations=iterations).split("$", 3)[3]
    return hmac.compare_digest(candidate, expected_hash)


def create_playback_token(
    *,
    actor: CurrentUser,
    file_id: str,
    patient_id: str,
) -> tuple[str, str]:
    settings = get_settings()
    return create_signed_token(
        {
            "purpose": "video_playback",
            "sub": actor.id,
            "role": actor.role,
            "fileId": file_id,
            "patientId": patient_id,
        },
        timedelta(minutes=settings.playback_token_ttl_minutes),
    )


def user_from_access_payload(payload: dict[str, Any]) -> CurrentUser:
    user_id = str(payload.get("sub") or "").upper()
    role = str(payload.get("role") or "")
    display_name = str(payload.get("displayName") or user_id)
    settings = get_settings()

    if role == "patient":
        if user_id not in settings.demo_patient_ids:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient is not allowed.")
        return CurrentUser(id=user_id, role=role, display_name=display_name)

    if role == "doctor":
        if user_id not in settings.demo_doctor_ids:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Doctor is not allowed.")
        return CurrentUser(
            id=user_id,
            role=role,
            display_name=display_name,
            assigned_patient_ids=settings.doctor_patient_assignments.get(user_id, set()),
        )

    if role == "admin":
        if user_id not in settings.demo_admin_ids:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin is not allowed.")
        return CurrentUser(id=user_id, role=role, display_name=display_name)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user role.")


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()
    return user_from_access_payload(verify_signed_token(token, "access"))


def require_patient(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient role required.")
    return user


def require_doctor(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor role required.")
    return user


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")
    return user


def can_access_patient(user: CurrentUser, patient_id: str) -> bool:
    patient_id = patient_id.upper()
    if user.role == "admin":
        return True
    if user.role == "patient":
        return user.id == patient_id
    if user.role == "doctor":
        return patient_id in user.assigned_patient_ids
    return False


def require_patient_access(user: CurrentUser, patient_id: str) -> None:
    if not can_access_patient(user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access denied.")
