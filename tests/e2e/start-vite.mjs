import { spawn } from "node:child_process";
import process from "node:process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const args = ["run", "dev", "--", "--host", "127.0.0.1", "--port", process.env.E2E_FRONTEND_PORT ?? "5173"];

const child = spawn(command, args, {
  env: {
    ...process.env,
    VITE_BACKEND_URL: `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? "8001"}`,
  },
  stdio: "inherit",
});

function stop() {
  if (!child.killed) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
