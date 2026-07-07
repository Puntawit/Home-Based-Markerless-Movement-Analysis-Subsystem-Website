const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8001";
const patientAuthTokenKey = "auth_token_patient";
const doctorAuthTokenKey = "auth_token_doctor";
const adminAuthTokenKey = "auth_token_admin";

type BackendRequestOptions = RequestInit & {
  authToken?: string | null;
};

type MockLoginRole = "admin" | "doctor";

export type AuthRole = "admin" | "doctor" | "patient";

export type AuthUser = {
  displayName: string;
  id: string;
  role: AuthRole;
};

export class BackendRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

export type MockLoginResponse = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

const authTokenKeys: Record<AuthRole, string> = {
  admin: adminAuthTokenKey,
  doctor: doctorAuthTokenKey,
  patient: patientAuthTokenKey,
};

export function setBackendAuthToken(token: string) {
  setBackendAuthTokenForRole("patient", token);
}

export function setDoctorBackendAuthToken(token: string) {
  setBackendAuthTokenForRole("doctor", token);
}

export function setAdminBackendAuthToken(token: string) {
  setBackendAuthTokenForRole("admin", token);
}

export function clearDoctorBackendAuthToken() {
  clearBackendAuthTokenForRole("doctor");
}

export function clearBackendAuthToken() {
  clearBackendAuthTokenForRole("patient");
}

export function clearAdminBackendAuthToken() {
  clearBackendAuthTokenForRole("admin");
}

export function getBackendAuthToken() {
  return getBackendAuthTokenForRole("patient");
}

export function getDoctorBackendAuthToken() {
  return getBackendAuthTokenForRole("doctor");
}

export function getAdminBackendAuthToken() {
  return getBackendAuthTokenForRole("admin");
}

export function getBackendAuthTokenForRole(role: AuthRole) {
  return window.localStorage.getItem(authTokenKeys[role]);
}

export function setBackendAuthTokenForRole(role: AuthRole, token: string) {
  window.localStorage.setItem(authTokenKeys[role], token);
}

export function clearBackendAuthTokenForRole(role: AuthRole) {
  window.localStorage.removeItem(authTokenKeys[role]);
}

export async function backendRequest<T>(path: string, options: BackendRequestOptions = {}): Promise<T> {
  const { authToken, ...requestOptions } = options;
  const token = authToken === undefined ? getBackendAuthToken() : authToken;
  const headers = new Headers(options.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    let detail = message;

    try {
      const parsed = JSON.parse(message) as { detail?: unknown };
      if (typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Keep the raw backend text when it is not JSON.
    }

    throw new BackendRequestError(detail || `Backend request failed with ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function mockRoleLogin(role: MockLoginRole) {
  return backendRequest<MockLoginResponse>("/auth/mock-login", {
    authToken: null,
    body: JSON.stringify({ role }),
    method: "POST",
  });
}

export async function loginDoctorDemo() {
  const result = await mockRoleLogin("doctor");
  setDoctorBackendAuthToken(result.accessToken);
  return result;
}

export async function loginAdminDemo() {
  const result = await mockRoleLogin("admin");
  setAdminBackendAuthToken(result.accessToken);
  return result;
}

export async function loginAdminWithPassword({ password, username }: { password: string; username: string }) {
  const result = await backendRequest<MockLoginResponse>("/auth/admin-login", {
    authToken: null,
    body: JSON.stringify({ password, username }),
    method: "POST",
  });
  setAdminBackendAuthToken(result.accessToken);
  return result;
}

export function requireDoctorToken() {
  const current = window.localStorage.getItem(doctorAuthTokenKey);
  if (!current) {
    throw new Error("Please sign in as a doctor before opening the doctor dashboard.");
  }
  return current;
}

export function requireAdminToken() {
  const current = window.localStorage.getItem(adminAuthTokenKey);
  if (!current) {
    throw new Error("Please sign in as an admin before opening the admin dashboard.");
  }
  return current;
}

export function isAuthExpiredError(error: unknown) {
  return (
    error instanceof BackendRequestError &&
    error.status === 401 &&
    error.message.toLowerCase().includes("token has expired")
  );
}

export async function backendVideoUrl(fileId: string, token = getBackendAuthToken()) {
  const result = await backendRequest<{ videoUrl: string; expiresAt: string }>(`/uploads/video/${fileId}/playback-token`, {
    authToken: token,
    method: "POST",
  });
  return result.videoUrl;
}

export async function validateBackendAuthToken(role: AuthRole, token: string) {
  const user = await backendRequest<AuthUser>("/auth/me", {
    authToken: token,
    method: "GET",
  });

  if (user.role !== role) {
    throw new BackendRequestError("Authenticated role does not match this page.", 403);
  }

  return user;
}
