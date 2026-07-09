from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, require_patient
from app.schemas import UserResponse

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/me", response_model=UserResponse)
async def patient_me(user: CurrentUser = Depends(require_patient)) -> UserResponse:
    return UserResponse(id=user.id, publicId=user.public_id, role=user.role, displayName=user.display_name)
