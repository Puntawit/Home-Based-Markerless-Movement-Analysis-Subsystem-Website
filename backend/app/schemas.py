from typing import Any, Literal

from pydantic import BaseModel, Field

MovementType = Literal[
    "hip_flexion",
    "hip_extension",
    "knee_flexion",
    "knee_extension",
    "ankle_dorsiflexion",
    "ankle_plantarflexion",
    "gait_walk",
    "sit_to_stand",
    "single_leg_stance",
    "shoulder_flexion",
    "stair_task",
]
PatientView = Literal["front", "side", "front_and_side"]
RiskLevel = Literal["low", "moderate", "high", "unknown"]
SessionStatus = Literal[
    "assigned",
    "draft",
    "ready_to_submit",
    "queued_analysis",
    "processing_analysis",
    "pending_doctor_review",
    "feedback_ready",
    "analysis_failed",
]
TaskStatus = Literal["not_started", "recorded", "needs_retake"]
AnalysisStatus = Literal["not_started", "processing", "completed", "failed"]
AnalysisJobStatus = Literal["queued", "processing", "completed", "failed"]


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Literal["patient", "doctor", "admin"] | None = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


class UserResponse(BaseModel):
    id: str
    publicId: str | None = None
    role: str
    displayName: str


class LoginResponse(BaseModel):
    accessToken: str
    expiresAt: str
    user: UserResponse
    mustChangePassword: bool = False


class UploadResponse(BaseModel):
    uploadId: str | None = None
    fileId: str
    originalFileName: str | None = None
    fileName: str
    contentType: str
    sizeBytes: int


class PlaybackTokenResponse(BaseModel):
    videoUrl: str
    expiresAt: str


class SaveTaskRequest(BaseModel):
    uploadId: str | None = None
    fileId: str | None = None
    view: PatientView
    quality: dict[str, Any] = Field(default_factory=dict)
    symptomReport: dict[str, Any] = Field(default_factory=dict)
    note: str | None = None


class CreateDoctorSessionRequest(BaseModel):
    taskCodes: list[MovementType]
    instructions: str | None = None


class FeedbackRequest(BaseModel):
    patientSummary: str
    clinicalSummary: str
    recommendations: list[str] = Field(default_factory=list)
    exercisePlan: list[dict[str, Any]] = Field(default_factory=list)
    retakeRequests: list[dict[str, Any]] = Field(default_factory=list)
    taskNotes: list[dict[str, Any]] = Field(default_factory=list)


class DoctorViewSummary(BaseModel):
    riskLevel: RiskLevel = "unknown"
    confidence: int | None = None
    qualityScore: int | None = None
    qualityIssues: list[str] = Field(default_factory=list)
    flags: list[Any] = Field(default_factory=list)
    metrics: list[dict[str, Any]] = Field(default_factory=list)
    transformMatrix6dof: Any | None = None
    videoMetadata: dict[str, Any] = Field(default_factory=dict)


class AnalysisResultSummary(BaseModel):
    analysisResultId: str
    sessionId: str
    sessionTaskId: str | None = None
    taskId: str
    taskCode: str | None = None
    movementType: MovementType
    mediaPipeSessionId: str | None = None
    rawPayload: dict[str, Any] = Field(default_factory=dict)
    doctorView: DoctorViewSummary
    createdAt: str


class SessionTaskResponse(BaseModel):
    sessionTaskId: str | None = None
    taskId: str
    movementType: MovementType
    taskLabel: str | None = None
    status: TaskStatus
    analysisStatus: AnalysisStatus = "not_started"
    analysisError: str | None = None
    analysisResultId: str | None = None
    analysisResult: AnalysisResultSummary | None = None
    view: PatientView | None = None
    uploadId: str | None = None
    fileId: str | None = None
    fileName: str | None = None
    videoUrl: str | None = None
    quality: dict[str, Any] | None = None
    symptomReport: dict[str, Any] | None = None
    note: str | None = None
    updatedAt: str | None = None


class AnalysisJobTaskResult(BaseModel):
    taskId: str
    analysisResultId: str


class AnalysisJobTaskError(BaseModel):
    taskId: str | None = None
    movementType: MovementType | None = None
    error: str


class AnalysisJobResponse(BaseModel):
    jobId: str
    sessionId: str
    patientId: str
    status: AnalysisJobStatus
    totalTasks: int
    completedTasks: int
    failedTasks: int
    taskResults: list[AnalysisJobTaskResult] = Field(default_factory=list)
    taskErrors: list[AnalysisJobTaskError] = Field(default_factory=list)
    attemptCount: int = 0
    lastError: str | None = None
    startedAt: str | None = None
    finishedAt: str | None = None
    createdAt: str
    updatedAt: str


class SessionResponse(BaseModel):
    sessionId: str
    patientId: str
    patientPublicId: str | None = None
    patientName: str
    doctorId: str | None = None
    status: SessionStatus
    analysis: dict[str, Any] | None = None
    sessionTasks: list[SessionTaskResponse] | None = None
    tasks: list[SessionTaskResponse]
    analysisJobId: str | None = None
    analysisJob: AnalysisJobResponse | None = None
    feedbackId: str | None = None
    createdAt: str
    submittedAt: str | None = None
    updatedAt: str | None = None


class FeedbackResponse(BaseModel):
    feedbackId: str
    sessionId: str
    patientId: str
    doctorId: str
    doctorName: str
    patientSummary: str
    clinicalSummary: str
    summary: str
    recommendations: list[str] = Field(default_factory=list)
    exercisePlan: list[dict[str, Any]] = Field(default_factory=list)
    retakeRequests: list[dict[str, Any]] = Field(default_factory=list)
    taskNotes: list[dict[str, Any]] = Field(default_factory=list)
    createdAt: str


class HealthResponse(BaseModel):
    status: str


class AdminUserCounts(BaseModel):
    total: int
    patients: int
    doctors: int
    admins: int


class AdminUploadStats(BaseModel):
    totalUploads: int
    totalSizeBytes: int


class AdminServiceHealth(BaseModel):
    backend: str
    mongodb: str
    mediapipeConfigured: bool
    mediapipeServiceUrl: str | None = None


class AdminDemoUsers(BaseModel):
    patients: list[str] = Field(default_factory=list)
    doctors: list[str] = Field(default_factory=list)
    admins: list[str] = Field(default_factory=list)


class AdminAuditEventSummary(BaseModel):
    eventId: str
    timestamp: str
    actorRole: str | None = None
    action: str
    outcome: str


class AdminOverviewResponse(BaseModel):
    userCounts: AdminUserCounts
    envConfiguredDemoUsers: AdminDemoUsers
    sessionCounts: dict[str, int]
    uploadStats: AdminUploadStats
    analysisJobCounts: dict[str, int]
    feedbackCount: int
    auditEventCounts: dict[str, dict[str, int] | int]
    serviceHealth: AdminServiceHealth
    recentAuditEvents: list[AdminAuditEventSummary] = Field(default_factory=list)


class AdminPatientRecentAssessment(BaseModel):
    label: str
    date: str | None = None
    score: int | None = None


class AdminPatientSummary(BaseModel):
    patientId: str
    patientName: str
    initials: str
    status: Literal["active", "inactive"]
    riskLevel: RiskLevel
    riskScore: int | None = None
    assignedDoctorId: str | None = None
    assignedDoctorName: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    nextAppointmentAt: str | None = None
    lastAssessmentAt: str | None = None
    latestSessionId: str | None = None
    recentAssessments: list[AdminPatientRecentAssessment] = Field(default_factory=list)


class AdminPatientsStats(BaseModel):
    totalPatients: int
    activePatients: int
    highRiskPatients: int
    assessmentsLast30Days: int
    completedAssessments: int


class AdminPatientsResponse(BaseModel):
    stats: AdminPatientsStats
    patients: list[AdminPatientSummary] = Field(default_factory=list)


AdminUserRole = Literal["patient", "doctor"]
AdminUserStatus = Literal["active", "inactive", "at_risk"]


class AdminCreateUserRequest(BaseModel):
    role: AdminUserRole
    name: str
    userId: str | None = None
    specialty: str | None = None
    age: int | None = None
    gender: str | None = None
    email: str | None = None
    phone: str | None = None
    assignedDoctorId: str | None = None
    temporaryPassword: str | None = None


class AdminUpdateUserRequest(BaseModel):
    name: str
    specialty: str | None = None
    age: int | None = None
    gender: str | None = None
    email: str | None = None
    phone: str | None = None
    assignedDoctorId: str | None = None


class AdminUserSummary(BaseModel):
    id: str
    publicId: str | None = None
    role: AdminUserRole
    name: str
    subtitle: str | None = None
    assignedLabel: str | None = None
    lastSessionAt: str | None = None
    status: AdminUserStatus
    riskLevel: RiskLevel = "unknown"
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    specialty: str | None = None
    # Returned exactly once, when the backend generated the password. Never stored
    # in plaintext and never echoed by any other endpoint.
    temporaryPassword: str | None = None


class AdminUsersResponse(BaseModel):
    patientCount: int
    doctorCount: int
    users: list[AdminUserSummary] = Field(default_factory=list)


class AdminVideoSummary(BaseModel):
    taskId: str
    sessionId: str
    title: str
    createdAt: str | None = None
    sizeBytes: int | None = None
    status: str
    riskLevel: RiskLevel = "unknown"
    videoUrl: str | None = None


class AdminFeedbackSummary(BaseModel):
    feedbackId: str
    sessionId: str
    doctorName: str
    clinicalSummary: str
    patientSummary: str
    createdAt: str | None = None
    riskLevel: RiskLevel = "unknown"
    tags: list[str] = Field(default_factory=list)


class AdminMediaPipePayloadSummary(BaseModel):
    analysisResultId: str | None = None
    sessionId: str | None = None
    taskId: str | None = None
    mediaPipeSessionId: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class AdminUserDetailResponse(BaseModel):
    user: AdminUserSummary
    videos: list[AdminVideoSummary] = Field(default_factory=list)
    latestFeedback: AdminFeedbackSummary | None = None
    mediaPipePayload: AdminMediaPipePayloadSummary | None = None
