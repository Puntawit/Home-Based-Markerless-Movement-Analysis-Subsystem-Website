import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const dockerConfigDir = join(root, ".tmp", "docker-e2e-config");
const uploadsDir = join(root, "backend", "uploads-e2e");
const composeFile = "docker-compose.e2e.yml";
const composeProject = "movement-analysis-e2e";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, DOCKER_CONFIG: dockerConfigDir, ...options.env },
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function cleanupDocker() {
  await run("docker", ["compose", "-p", composeProject, "-f", composeFile, "down", "-v", "--remove-orphans"]);
}

async function cleanupUploads() {
  await rm(uploadsDir, { force: true, recursive: true });
}

async function main() {
  await mkdir(dockerConfigDir, { recursive: true });
  try {
    await run("docker", ["info"]);
  } catch (error) {
    throw new Error(
      "Docker is required for npm run test:e2e. Start Docker Desktop, then rerun the command.",
      { cause: error },
    );
  }

  try {
    await cleanupDocker();
  } finally {
    await cleanupUploads();
  }
  await run("docker", ["compose", "-p", composeProject, "-f", composeFile, "up", "-d", "--build"]);

  let testError;
  const cleanupErrors = [];
  try {
    await run("npx", ["playwright", "test"], {
      env: {
        E2E_ADMIN_PASSWORD: "admin-test",
        E2E_AUTH_SECRET: "e2e-test-secret-key-0123456789abcdef",
        E2E_BACKEND_PORT: "8001",
        E2E_DEMO_PASSWORD: "Movecheck-e2e-1",
        E2E_FRONTEND_PORT: "5173",
      },
    });
  } catch (error) {
    testError = error;
  } finally {
    try {
      await cleanupDocker();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await cleanupUploads();
    } catch (error) {
      cleanupErrors.push(error);
    }

    if (cleanupErrors.length > 0) {
      console.error("E2E cleanup did not complete cleanly.");
      for (const error of cleanupErrors) console.error(error);
    }
  }

  if (testError) throw testError;
  if (cleanupErrors.length > 0) throw cleanupErrors[0];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
