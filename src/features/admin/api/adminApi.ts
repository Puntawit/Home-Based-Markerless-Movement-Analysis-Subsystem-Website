import { backendRequest, requireAdminToken } from "@/lib/backendApi";

export type AdminRiskLevel = "low" | "moderate" | "high" | "unknown";

export type AdminUserRole = "patient" | "doctor";
export type AdminUserStatus = "active" | "inactive" | "at_risk";

export type AdminUserSummary = {
  id: string;
  publicId?: string | null;
  role: AdminUserRole;
  name: string;
  subtitle?: string | null;
  assignedLabel?: string | null;
  lastSessionAt?: string | null;
  status: AdminUserStatus;
  riskLevel: AdminRiskLevel;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  // Present only in the response to createAdminUser, when the backend generated
  // the password (which it always does, since the admin console never collects one).
  temporaryPassword?: string | null;
};

export type AdminUsersResponse = {
  patientCount: number;
  doctorCount: number;
  users: AdminUserSummary[];
};

export type AdminCreateUserPayload = {
  role: AdminUserRole;
  name: string;
  specialty?: string;
  age?: number | null;
  gender?: string;
  email?: string;
  phone?: string;
  assignedDoctorId?: string;
};

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

export type AdminUpdateUserPayload = {
  name: string;
  specialty?: string;
  age?: number | null;
  gender?: string;
  email?: string;
  phone?: string;
  assignedDoctorId?: string;
};

export async function updateAdminUser(userId: string, payload: AdminUpdateUserPayload) {
  const adminToken = requireAdminToken();
  return backendRequest<AdminUserSummary>(`/admin/users/${encodeURIComponent(userId)}`, {
    authToken: adminToken,
    body: JSON.stringify(payload),
    method: "PATCH",
  });
}

export async function deleteAdminUser(userId: string) {
  const adminToken = requireAdminToken();
  await backendRequest<void>(`/admin/users/${encodeURIComponent(userId)}`, {
    authToken: adminToken,
    method: "DELETE",
  });
}
