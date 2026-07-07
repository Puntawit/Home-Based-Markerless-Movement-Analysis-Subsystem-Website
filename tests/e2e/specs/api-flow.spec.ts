import { expect, request, test } from "@playwright/test";

const backendURL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:8001";
const movementTypes = [
  "hip_flexion",
  "hip_extension",
  "knee_flexion",
  "knee_extension",
  "ankle_dorsiflexion",
  "ankle_plantarflexion",
];

async function login(role: "admin" | "doctor" | "patient") {
  const api = await request.newContext({ baseURL: backendURL });
  const response = await api.post("/auth/mock-login", {
    data: role === "patient" ? { patientId: "PATIENT-7712", role } : { role },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  await api.dispose();
  return body.accessToken as string;
}

async function pollLatestSession(patientToken: string) {
  const api = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${patientToken}` },
  });

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await api.get("/patient/sessions/latest");
      expect(response.ok()).toBeTruthy();
      const session = await response.json();
      if (session?.status === "pending_doctor_review") return session;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Session did not become ready for doctor review.");
  } finally {
    await api.dispose();
  }
}

test("backend critical path completes patient submit, analysis, feedback, and admin visibility", async () => {
  const patientToken = await login("patient");
  const patientApi = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${patientToken}` },
  });

  for (const movementType of movementTypes) {
    const upload = await patientApi.post("/uploads/video", {
      multipart: {
        file: {
          buffer: Buffer.from(`fake ${movementType} video`),
          mimeType: "video/webm",
          name: `${movementType}.webm`,
        },
      },
    });
    expect(upload.ok()).toBeTruthy();
    const uploadBody = await upload.json();

    const save = await patientApi.post(`/patient/sessions/draft/tasks/${movementType}`, {
      data: {
        fileId: uploadBody.fileId,
        note: `API E2E ${movementType}`,
        quality: {
          bodyFraming: "passed",
          calibrationMethod: "a4_reference",
          calibrationVisible: true,
          cameraAngle: "passed",
          distanceConfirmed: true,
          issues: [],
          lighting: "passed",
          occlusion: "passed",
          qualityScore: 94,
        },
        symptomReport: { items: [] },
        view: "side",
      },
    });
    expect(save.ok()).toBeTruthy();
  }

  const submit = await patientApi.post("/patient/sessions/submit");
  expect(submit.ok()).toBeTruthy();
  await patientApi.dispose();

  const readySession = await pollLatestSession(patientToken);
  expect(readySession.tasks).toHaveLength(6);
  expect(readySession.tasks.every((task: { analysisStatus: string }) => task.analysisStatus === "completed")).toBe(true);

  const doctorToken = await login("doctor");
  const doctorApi = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${doctorToken}` },
  });
  const sessions = await doctorApi.get("/doctor/sessions");
  expect(sessions.ok()).toBeTruthy();
  const doctorSessions = await sessions.json();
  expect(doctorSessions.some((session: { sessionId: string }) => session.sessionId === readySession.sessionId)).toBe(true);

  const feedback = await doctorApi.post(`/doctor/sessions/${readySession.sessionId}/feedback`, {
    data: {
      clinicalSummary: "API E2E clinical summary",
      exercisePlan: [
        {
          frequency: "Daily",
          id: "api-e2e-rom",
          reps: "8 reps",
          safetyNote: "Stop if pain increases.",
          sets: "2 sets",
          title: "API E2E ROM practice",
        },
      ],
      patientSummary: "API E2E patient summary",
      recommendations: ["Continue gentle practice."],
      retakeRequests: [],
      taskNotes: [],
    },
  });
  expect(feedback.ok()).toBeTruthy();
  await doctorApi.dispose();

  const patientFeedbackApi = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${patientToken}` },
  });
  const latestFeedback = await patientFeedbackApi.get("/patient/feedback/latest");
  expect(latestFeedback.ok()).toBeTruthy();
  const latestFeedbackBody = await latestFeedback.json();
  expect(latestFeedbackBody.patientSummary).toBe("API E2E patient summary");
  await patientFeedbackApi.dispose();

  const adminApi = await request.newContext({ baseURL: backendURL });
  const adminLogin = await adminApi.post("/auth/admin-login", {
    data: { password: process.env.E2E_ADMIN_PASSWORD ?? "admin-test", username: "admin" },
  });
  expect(adminLogin.ok()).toBeTruthy();
  const adminToken = (await adminLogin.json()).accessToken;
  await adminApi.dispose();

  const authedAdminApi = await request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
  });
  const detail = await authedAdminApi.get("/admin/users/PATIENT-7712/detail");
  expect(detail.ok()).toBeTruthy();
  const detailBody = await detail.json();
  expect(detailBody.videos).toHaveLength(6);
  expect(detailBody.latestFeedback.patientSummary).toBe("API E2E patient summary");
  expect(detailBody.mediaPipePayload).toBeTruthy();
  await authedAdminApi.dispose();
});
