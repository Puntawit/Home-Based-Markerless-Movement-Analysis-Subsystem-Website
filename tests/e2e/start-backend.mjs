import { spawn } from "node:child_process";
import process from "node:process";

const command = process.platform === "win32" ? "uv.exe" : "uv";
const args = ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", process.env.E2E_BACKEND_PORT ?? "8001"];

const child = spawn(command, args, {
  cwd: "backend",
  env: {
    ...process.env,
    ADMIN_PASSWORD_HASH: "pbkdf2_sha256$390000$test-salt$-dAIhjNAERKEVjRmjZCDlc8Ov5aav-54MPFCie6RMTc",
    ADMIN_USERNAME: "admin",
    // Must be >= MIN_AUTH_SECRET_LENGTH (32) or validate_security_settings refuses to start.
    AUTH_SECRET_KEY: process.env.E2E_AUTH_SECRET ?? "e2e-test-secret-key-0123456789abcdef",
    DATABASE_NAME: "movement_analysis_e2e",
    // Seed the demo users the specs log in as, independently of backend/.env
    // (which no longer seeds any patient/doctor).
    DEMO_PATIENTS: "PATIENT-7712",
    DEMO_DOCTORS: "DOCTOR-DEMO",
    DEMO_ADMINS: "ADMIN-DEMO",
    DEMO_DOCTOR_PATIENT_IDS: "DOCTOR-DEMO:PATIENT-7712",
    // Gives the seeded demo patient/doctor a usable password. Empty in production.
    DEMO_LOGIN_PASSWORD: process.env.E2E_DEMO_PASSWORD ?? "Movecheck-e2e-1",
    FRONTEND_ORIGIN: `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "5173"}`,
    MEDIAPIPE_SERVICE_URL: "http://127.0.0.1:8010",
    MONGODB_URI: "mongodb://127.0.0.1:27018",
    // Keep the KDF cheap in tests; the stored hash embeds its own iteration count.
    PBKDF2_ITERATIONS: "100000",
    RECOVER_ANALYSIS_JOBS_ON_STARTUP: "false",
    STORE_RAW_ANALYSIS_PAYLOAD: "true",
    UPLOAD_DIR: "uploads-e2e",
  },
  stdio: "inherit",
});

function stop() {
  if (!child.killed) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
