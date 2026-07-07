from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, create_access_token, get_current_user, verify_password
from app.core.config import get_settings
from app.schemas import AdminLoginRequest, MockLoginRequest, MockLoginResponse, UserResponse
from app.services.audit import audit_event

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin-login", response_model=MockLoginResponse)
async def admin_login(payload: AdminLoginRequest, request: Request) -> MockLoginResponse:
    settings = get_settings()
    username = payload.username.strip()
    admin_id = sorted(settings.demo_admin_ids)[0]

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

    token, expires_at = create_access_token(user_id=admin_id, role="admin", display_name="Admin")
    await audit_event(
        action="auth.admin_login",
        outcome="success",
        request=request,
        resource_type="admin",
        resource_id=admin_id,
    )
    return MockLoginResponse(
        accessToken=token,
        expiresAt=expires_at,
        user=UserResponse(id=admin_id, role="admin", displayName="Admin"),
    )


@router.post("/mock-login", response_model=MockLoginResponse)
async def mock_login(payload: MockLoginRequest, request: Request) -> MockLoginResponse:
    settings = get_settings()
    if payload.role == "admin":
        admin_id = sorted(settings.demo_admin_ids)[0]
        token, expires_at = create_access_token(user_id=admin_id, role="admin", display_name="Admin Demo")
        await audit_event(
            action="auth.mock_login",
            outcome="success",
            request=request,
            resource_type="admin",
            resource_id=admin_id,
        )
        return MockLoginResponse(
            accessToken=token,
            expiresAt=expires_at,
            user=UserResponse(id=admin_id, role="admin", displayName="Admin Demo"),
        )

    if payload.role == "doctor":
        doctor_id = sorted(settings.demo_doctor_ids)[0]
        token, expires_at = create_access_token(user_id=doctor_id, role="doctor", display_name="Dr. Demo")
        await audit_event(
            action="auth.mock_login",
            outcome="success",
            request=request,
            resource_type="doctor",
            resource_id=doctor_id,
        )
        return MockLoginResponse(
            accessToken=token,
            expiresAt=expires_at,
            user=UserResponse(id=doctor_id, role="doctor", displayName="Dr. Demo"),
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

    token, expires_at = create_access_token(user_id=patient_id, role="patient", display_name=patient_id)
    await audit_event(
        action="auth.mock_login",
        outcome="success",
        request=request,
        resource_type="patient",
        resource_id=patient_id,
        patient_id=patient_id,
    )
    return MockLoginResponse(
        accessToken=token,
        expiresAt=expires_at,
        user=UserResponse(id=patient_id, role="patient", displayName=patient_id),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, role=user.role, displayName=user.display_name)
