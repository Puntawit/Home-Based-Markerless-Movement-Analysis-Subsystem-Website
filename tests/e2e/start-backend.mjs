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
    AUTH_SECRET_KEY: "e2e-test-secret",
    DATABASE_NAME: "movement_analysis_e2e",
    FRONTEND_ORIGIN: `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "5173"}`,
    MEDIAPIPE_SERVICE_URL: "http://127.0.0.1:8010",
    MONGODB_URI: "mongodb://127.0.0.1:27018",
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
