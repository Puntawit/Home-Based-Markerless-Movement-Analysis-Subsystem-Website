from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.schemas import MockLoginRequest, MockLoginResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/mock-login", response_model=MockLoginResponse)
async def mock_login(payload: MockLoginRequest) -> MockLoginResponse:
    if payload.role == "doctor":
        return MockLoginResponse(
            accessToken="mock-token-doctor-demo",
            user=UserResponse(id="DOCTOR-DEMO", role="doctor", displayName="Dr. Demo"),
        )

    return MockLoginResponse(
        accessToken="mock-token-patient-7712",
        user=UserResponse(id="PATIENT-7712", role="patient", displayName="Patient-7712"),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, role=user.role, displayName=user.display_name)
