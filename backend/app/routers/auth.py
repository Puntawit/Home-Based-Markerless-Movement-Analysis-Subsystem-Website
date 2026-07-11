from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import (
    CurrentUser,
    create_access_token,
    get_current_user,
    hash_password,
    validate_password_policy,
    verify_password,
)
from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
)
from app.services.audit import audit_event
from app.services.common import utc_now
from app.services.login_throttle import clear_failures, enforce_not_locked, record_failure
from app.services.users import find_user_for_reference

router = APIRouter(prefix="/auth", tags=["auth"])


async def _resolve_login_user(db, identifier: str, role: str | None) -> dict[str, Any] | None:
    user = await find_user_for_reference(db, identifier)
    if user:
        return user
    # The bootstrap admin logs in with ADMIN_USERNAME, which is not a publicId.
    settings = get_settings()
    if role in (None, "admin") and identifier == settings.admin_username and settings.demo_admin_ids:
        return await find_user_for_reference(db, sorted(settings.demo_admin_ids)[0])
    return None


def _stored_password_hash(user: dict[str, Any], identifier: str) -> str | None:
    """Resolve the hash to verify against.

    Falls back to ADMIN_PASSWORD_HASH so an operator can always log in on a fresh
    or legacy database (where every user has passwordHash=None) and provision the
    real credentials from there.
    """
    stored = user.get("passwordHash")
    if stored:
        return stored
    settings = get_settings()
    if user.get("role") == "admin" and settings.admin_password_hash and identifier == settings.admin_username:
        return settings.admin_password_hash
    return None


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request) -> LoginResponse:
    db = get_db()
    identifier = payload.identifier.strip()
    # Wrong password, unknown user, and "no password set" must be indistinguishable
    # to the client. The real reason is recorded in the audit log instead.
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials."
    )

    await enforce_not_locked(db, identifier, request)

    async def deny(reason: str) -> None:
        await record_failure(db, identifier, request)
        await audit_event(
            action="auth.login",
            outcome="denied",
            request=request,
            resource_type="user",
            resource_id=identifier or None,
            details={"reason": reason},
        )

    user = await _resolve_login_user(db, identifier, payload.role)
    if not user or (payload.role and user.get("role") != payload.role):
        await deny("unknown_user")
        raise invalid_credentials

    stored = _stored_password_hash(user, identifier)
    if not stored:
        await deny("password_not_set")
        raise invalid_credentials

    if not verify_password(payload.password, stored):
        await deny("bad_password")
        raise invalid_credentials

    if user.get("status") != "active":
        await audit_event(
            action="auth.login",
            outcome="denied",
            request=request,
            resource_type="user",
            resource_id=user["userId"],
            details={"reason": "inactive"},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive.")

    await clear_failures(db, identifier, request)
    display_name = user.get("name") or user["publicId"]
    token, expires_at = create_access_token(
        user_id=user["userId"],
        public_id=user["publicId"],
        role=user["role"],
        display_name=display_name,
    )
    await audit_event(
        action="auth.login",
        outcome="success",
        request=request,
        resource_type="user",
        resource_id=user["userId"],
        patient_id=user["userId"] if user["role"] == "patient" else None,
    )
    return LoginResponse(
        accessToken=token,
        expiresAt=expires_at,
        user=UserResponse(
            id=user["userId"],
            publicId=user["publicId"],
            role=user["role"],
            displayName=display_name,
        ),
        mustChangePassword=bool(user.get("mustChangePassword")),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> None:
    db = get_db()
    document = await find_user_for_reference(db, user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    settings = get_settings()
    stored = document.get("passwordHash") or (
        settings.admin_password_hash if document.get("role") == "admin" else None
    )
    if not stored or not verify_password(payload.currentPassword, stored):
        await audit_event(
            action="auth.change_password",
            outcome="denied",
            request=request,
            actor=user,
            resource_type="user",
            resource_id=user.id,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.")

    if payload.newPassword == payload.currentPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="New password must differ from the current one."
        )
    validate_password_policy(payload.newPassword)

    now = utc_now()
    await db.users.update_one(
        {"userId": document["userId"]},
        {
            "$set": {
                "passwordHash": hash_password(payload.newPassword),
                "mustChangePassword": False,
                "passwordUpdatedAt": now,
                "updatedAt": now,
            }
        },
    )
    await audit_event(
        action="auth.change_password",
        outcome="success",
        request=request,
        actor=user,
        resource_type="user",
        resource_id=user.id,
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, publicId=user.public_id, role=user.role, displayName=user.display_name)
