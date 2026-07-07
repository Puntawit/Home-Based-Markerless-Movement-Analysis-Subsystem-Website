import { defineConfig, devices } from "@playwright/test";

const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8001);
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 5173);

export default defineConfig({
  testDir: "./tests/e2e/specs",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/e2e/start-backend.mjs",
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node tests/e2e/start-vite.mjs",
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
