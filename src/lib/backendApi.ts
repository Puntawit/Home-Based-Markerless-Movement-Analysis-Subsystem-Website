const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8001";
const patientAuthTokenKey = "movement-analysis-patient-auth-token";
const doctorAuthTokenKey = "movement-analysis-doctor-auth-token";

export function setBackendAuthToken(token: string) {
  window.localStorage.setItem(patientAuthTokenKey, token);
}

export function getBackendAuthToken() {
  return window.localStorage.getItem(patientAuthTokenKey);
}

export async function backendRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getBackendAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Backend request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function ensureDoctorToken() {
  const current = window.localStorage.getItem(doctorAuthTokenKey);
  if (current) return current;

  const result = await backendRequest<{ accessToken: string }>("/auth/mock-login", {
    body: JSON.stringify({ role: "doctor" }),
    method: "POST",
  });
  window.localStorage.setItem(doctorAuthTokenKey, result.accessToken);
  return result.accessToken;
}

export function backendVideoUrl(fileId: string, token = getBackendAuthToken()) {
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${backendBaseUrl}/uploads/video/${fileId}${suffix}`;
}
