import { createHmac } from "node:crypto";
import { expect, request, test } from "@playwright/test";

const backendURL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:8001";
const demoPassword = process.env.E2E_DEMO_PASSWORD ?? "Movecheck-e2e-1";
const authSecret = process.env.E2E_AUTH_SECRET ?? "e2e-test-secret-key-0123456789abcdef";

// A throwaway identifier: locking it out cannot affect the accounts the other specs use.
const lockoutIdentifier = "PATIENT-LOCKOUT-TEST";

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

/** Mints an access token with the backend's own scheme, but already expired. */
function expiredAccessToken() {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const past = Math.floor(Date.now() / 1000) - 3600;
  const payload = base64url(
    JSON.stringify({
      purpose: "access",
      sub: "00000000-0000-0000-0000-000000000000",
      publicId: "PATIENT-7712",
      role: "patient",
      displayName: "PATIENT-7712",
      iat: past,
      exp: past + 60,
    }),
  );
  const signature = createHmac("sha256", authSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function post(path: string, data: unknown) {
  const api = await request.newContext({ baseURL: backendURL });
  const response = await api.post(path, { data });
  await api.dispose();
  return response;
}

test("login rejects bad credentials without revealing which part was wrong", async () => {
  const wrongPassword = await post("/auth/login", {
    identifier: "PATIENT-7712",
    password: "definitely-not-the-password",
    role: "patient",
  });
  expect(wrongPassword.status()).toBe(401);

  const unknownUser = await post("/auth/login", {
    identifier: "PATIENT-DOES-NOT-EXIST",
    password: "definitely-not-the-password",
    role: "patient",
  });
  expect(unknownUser.status()).toBe(401);

  // Identical body: an attacker cannot use the response to enumerate accounts.
  expect(await wrongPassword.json()).toEqual(await unknownUser.json());

  const roleMismatch = await post("/auth/login", {
    identifier: "PATIENT-7712",
    password: demoPassword,
    role: "doctor",
  });
  expect(roleMismatch.status()).toBe(401);
});

test("the removed mock-login bypass is gone", async () => {
  const doctorBypass = await post("/auth/mock-login", { role: "doctor" });
  expect(doctorBypass.status()).toBe(404);

  const patientBypass = await post("/auth/mock-login", { patientId: "PATIENT-7712", role: "patient" });
  expect(patientBypass.status()).toBe(404);
});

test("repeated failures lock the account, and a successful login clears the throttle", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await post("/auth/login", { identifier: lockoutIdentifier, password: "wrong" });
    expect(response.status()).toBe(401);
  }

  const locked = await post("/auth/login", { identifier: lockoutIdentifier, password: "wrong" });
  expect(locked.status()).toBe(429);

  // A real account is unaffected by another identifier's lockout. This also clears the
  // shared per-IP counter so later specs are not throttled.
  const healthy = await post("/auth/login", {
    identifier: "PATIENT-7712",
    password: demoPassword,
    role: "patient",
  });
  expect(healthy.ok()).toBeTruthy();
});

test("protected routes reject missing, malformed, and expired tokens", async () => {
  const anonymous = await request.newContext({ baseURL: backendURL });
  expect((await anonymous.get("/auth/me")).status()).toBe(401);
  await anonymous.dispose();

  const malformed = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: "Bearer not-a-real-token" },
  });
  expect((await malformed.get("/auth/me")).status()).toBe(401);
  await malformed.dispose();

  const expired = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${expiredAccessToken()}` },
  });
  const expiredResponse = await expired.get("/auth/me");
  expect(expiredResponse.status()).toBe(401);
  expect((await expiredResponse.json()).detail).toContain("expired");
  await expired.dispose();
});

test("a patient token cannot reach doctor or admin endpoints", async () => {
  const login = await post("/auth/login", {
    identifier: "PATIENT-7712",
    password: demoPassword,
    role: "patient",
  });
  expect(login.ok()).toBeTruthy();
  const patientToken = (await login.json()).accessToken;

  const api = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${patientToken}` },
  });
  expect((await api.get("/doctor/sessions")).status()).toBe(403);
  expect((await api.get("/admin/overview")).status()).toBe(403);
  await api.dispose();
});
