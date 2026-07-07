import { backendRequest, requireAdminToken } from "@/lib/backendApi";

export type AdminOverview = {
  userCounts: {
    total: number;
    patients: number;
    doctors: number;
    admins: number;
  };
  envConfiguredDemoUsers: {
    patients: string[];
    doctors: string[];
    admins: string[];
  };
  sessionCounts: Record<string, number>;
  uploadStats: {
    totalUploads: number;
    totalSizeBytes: number;
  };
  analysisJobCounts: Record<string, number>;
  feedbackCount: number;
  auditEventCounts: {
    total: number;
    byOutcome: Record<string, number>;
    byActorRole: Record<string, number>;
    byAction: Record<string, number>;
  };
  serviceHealth: {
    backend: string;
    mongodb: string;
    mediapipeConfigured: boolean;
    mediapipeServiceUrl?: string | null;
  };
  recentAuditEvents: {
    eventId: string;
    timestamp: string;
    actorRole?: string | null;
    action: string;
    outcome: string;
  }[];
};

export type AdminRiskLevel = "low" | "moderate" | "high" | "unknown";

export type AdminPatientRecentAssessment = {
  label: string;
  date?: string | null;
  score?: number | null;
};

export type AdminPatientSummary = {
  patientId: string;
  patientName: string;
  initials: string;
  status: "active" | "inactive";
  riskLevel: AdminRiskLevel;
  riskScore?: number | null;
  assignedDoctorId?: string | null;
  assignedDoctorName?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  nextAppointmentAt?: string | null;
  lastAssessmentAt?: string | null;
  latestSessionId?: string | null;
  recentAssessments: AdminPatientRecentAssessment[];
};

export type AdminPatientsResponse = {
  stats: {
    totalPatients: number;
    activePatients: number;
    highRiskPatients: number;
    assessmentsLast30Days: number;
    completedAssessments: number;
  };
  patients: AdminPatientSummary[];
};

export type AdminUserRole = "patient" | "doctor";
export type AdminUserStatus = "active" | "inactive" | "at_risk";

export type AdminUserSummary = {
  id: string;
  role: AdminUserRole;
  name: string;
  subtitle?: string | null;
  assignedLabel?: string | null;
  lastSessionAt?: string | null;
  status: AdminUserStatus;
  riskLevel: AdminRiskLevel;
};

export type AdminUsersResponse = {
  patientCount: number;
  doctorCount: number;
  users: AdminUserSummary[];
};

export type AdminCreateUserPayload = {
  role: AdminUserRole;
  name: string;
  userId?: string;
  specialty?: string;
  age?: number | null;
  gender?: string;
  email?: string;
  phone?: string;
  assignedDoctorId?: string;
};

export type AdminVideoSummary = {
  taskId: string;
  sessionId: string;
  title: string;
  createdAt?: string | null;
  sizeBytes?: number | null;
  status: string;
  riskLevel: AdminRiskLevel;
  videoUrl?: string | null;
};

export type AdminFeedbackSummary = {
  feedbackId: string;
  sessionId: string;
  doctorName: string;
  clinicalSummary: string;
  patientSummary: string;
  createdAt?: string | null;
  riskLevel: AdminRiskLevel;
  tags: string[];
};

export type AdminMediaPipePayloadSummary = {
  analysisResultId?: string | null;
  sessionId?: string | null;
  taskId?: string | null;
  mediaPipeSessionId?: string | null;
  payload: Record<string, unknown>;
};

export type AdminUserDetailResponse = {
  user: AdminUserSummary;
  videos: AdminVideoSummary[];
  latestFeedback?: AdminFeedbackSummary | null;
  mediaPipePayload?: AdminMediaPipePayloadSummary | null;
};

export async function getAdminOverview() {
  const adminToken = requireAdminToken();
  return backendRequest<AdminOverview>("/admin/overview", {
    authToken: adminToken,
  });
}

export async function getAdminPatients() {
  const adminToken = requireAdminToken();
  return backendRequest<AdminPatientsResponse>("/admin/patients", {
    authToken: adminToken,
  });
}

export async function getAdminUsers() {
  const adminToken = requireAdminToken();
  return backendRequest<AdminUsersResponse>("/admin/users", {
    authToken: adminToken,
  });
}

export async function createAdminUser(payload: AdminCreateUserPayload) {
  const adminToken = requireAdminToken();
  return backendRequest<AdminUserSummary>("/admin/users", {
    authToken: adminToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export async function getAdminUserDetail(userId: string) {
  const adminToken = requireAdminToken();
  return backendRequest<AdminUserDetailResponse>(`/admin/users/${encodeURIComponent(userId)}/detail`, {
    authToken: adminToken,
  });
}

export async function exportAdminMediaPipePayload(analysisResultId: string) {
  const adminToken = requireAdminToken();
  return backendRequest<Record<string, unknown>>(`/admin/analysis-results/${encodeURIComponent(analysisResultId)}/payload`, {
    authToken: adminToken,
  });
}
