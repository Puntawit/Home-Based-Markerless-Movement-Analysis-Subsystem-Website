from typing import Any, Literal

from pydantic import BaseModel, Field

MovementType = Literal["gait_walk", "sit_to_stand", "single_leg_stance", "shoulder_flexion"]
PatientView = Literal["front", "side", "front_and_side"]


class MockLoginRequest(BaseModel):
    role: Literal["patient", "doctor"] = "patient"


class UserResponse(BaseModel):
    id: str
    role: str
    displayName: str


class MockLoginResponse(BaseModel):
    accessToken: str
    user: UserResponse


class UploadResponse(BaseModel):
    fileId: str
    fileName: str
    contentType: str
    sizeBytes: int


class SaveTaskRequest(BaseModel):
    fileId: str
    view: PatientView
    quality: dict[str, Any] = Field(default_factory=dict)
    symptomReport: dict[str, Any] = Field(default_factory=dict)
    note: str | None = None


class FeedbackRequest(BaseModel):
    patientSummary: str
    clinicalSummary: str
    recommendations: list[str] = Field(default_factory=list)
    exercisePlan: list[dict[str, Any]] = Field(default_factory=list)
    retakeRequests: list[dict[str, Any]] = Field(default_factory=list)
    taskNotes: list[dict[str, Any]] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
