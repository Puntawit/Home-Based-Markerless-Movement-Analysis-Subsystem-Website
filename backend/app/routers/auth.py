from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, create_access_token, get_current_user, verify_password
from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas import AdminLoginRequest, MockLoginRequest, MockLoginResponse, UserResponse
from app.services.audit import audit_event
from app.services.users import require_active_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin-login", response_model=MockLoginResponse)
async def admin_login(payload: AdminLoginRequest, request: Request) -> MockLoginResponse:
    settings = get_settings()
    db = get_db()
    username = payload.username.strip()
    admin_public_id = sorted(settings.demo_admin_ids)[0]
    admin = await require_active_user(db, role="admin", identifier=admin_public_id)

    if not settings.admin_password_hash:
        await audit_event(
            action="auth.admin_login",
            outcome="denied",
            request=request,
            resource_type="admin",
            resource_id=username or None,
            details={"reason": "missing_password_hash"},
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin password hash is not configured.")

    if username != settings.admin_username or not verify_password(payload.password, settings.admin_password_hash):
        await audit_event(
            action="auth.admin_login",
            outcome="denied",
            request=request,
            resource_type="admin",
            resource_id=username or None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin username or password.")

    token, expires_at = create_access_token(
        user_id=admin["userId"],
        public_id=admin["publicId"],
        role="admin",
        display_name=admin.get("name") or "Admin",
    )
    await audit_event(
        action="auth.admin_login",
        outcome="success",
        request=request,
        resource_type="admin",
        resource_id=admin["userId"],
    )
    return MockLoginResponse(
        accessToken=token,
        expiresAt=expires_at,
        user=UserResponse(id=admin["userId"], publicId=admin["publicId"], role="admin", displayName=admin.get("name") or "Admin"),
    )


@router.post("/mock-login", response_model=MockLoginResponse)
async def mock_login(payload: MockLoginRequest, request: Request) -> MockLoginResponse:
    settings = get_settings()
    db = get_db()
    if payload.role == "admin":
        admin = await require_active_user(db, role="admin", identifier=sorted(settings.demo_admin_ids)[0])
        token, expires_at = create_access_token(
            user_id=admin["userId"],
            public_id=admin["publicId"],
            role="admin",
            display_name=admin.get("name") or "Admin Demo",
        )
        await audit_event(
            action="auth.mock_login",
            outcome="success",
            request=request,
            resource_type="admin",
            resource_id=admin["userId"],
        )
        return MockLoginResponse(
            accessToken=token,
            expiresAt=expires_at,
            user=UserResponse(id=admin["userId"], publicId=admin["publicId"], role="admin", displayName=admin.get("name") or "Admin Demo"),
        )

    if payload.role == "doctor":
        doctor = await require_active_user(db, role="doctor", identifier=sorted(settings.demo_doctor_ids)[0])
        token, expires_at = create_access_token(
            user_id=doctor["userId"],
            public_id=doctor["publicId"],
            role="doctor",
            display_name=doctor.get("name") or "Dr. Demo",
        )
        await audit_event(
            action="auth.mock_login",
            outcome="success",
            request=request,
            resource_type="doctor",
            resource_id=doctor["userId"],
        )
        return MockLoginResponse(
            accessToken=token,
            expiresAt=expires_at,
            user=UserResponse(id=doctor["userId"], publicId=doctor["publicId"], role="doctor", displayName=doctor.get("name") or "Dr. Demo"),
        )

    patient_id = payload.patientId.strip().upper() if payload.patientId else "PATIENT-7712"
    if not patient_id:
        patient_id = "PATIENT-7712"
    if patient_id not in settings.demo_patient_ids:
        await audit_event(
            action="auth.mock_login",
            outcome="denied",
            request=request,
            resource_type="patient",
            resource_id=patient_id or None,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient is not allowed for this demo.")

    patient = await require_active_user(db, role="patient", identifier=patient_id)
    token, expires_at = create_access_token(
        user_id=patient["userId"],
        public_id=patient["publicId"],
        role="patient",
        display_name=patient.get("name") or patient["publicId"],
    )
    await audit_event(
        action="auth.mock_login",
        outcome="success",
        request=request,
        resource_type="patient",
        resource_id=patient["userId"],
        patient_id=patient["userId"],
    )
    return MockLoginResponse(
        accessToken=token,
        expiresAt=expires_at,
        user=UserResponse(
            id=patient["userId"],
            publicId=patient["publicId"],
            role="patient",
            displayName=patient.get("name") or patient["publicId"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, publicId=user.public_id, role=user.role, displayName=user.display_name)
