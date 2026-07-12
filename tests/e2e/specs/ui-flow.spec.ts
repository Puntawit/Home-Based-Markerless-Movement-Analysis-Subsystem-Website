import { expect, test } from "@playwright/test";

const demoPassword = process.env.E2E_DEMO_PASSWORD ?? "Movecheck-e2e-1";

const movementTypes = [
  "hip_flexion",
  "hip_extension",
  "knee_flexion",
  "knee_extension",
  "ankle_dorsiflexion",
  "ankle_plantarflexion",
];

test("browser flow covers patient upload, doctor feedback, and admin review", async ({ page }) => {
  await page.goto("/auth/login?type=doctor");
  await page.getByTestId("doctor-password").fill(demoPassword);
  await page.getByTestId("doctor-login-submit").click();
  await expect(page).toHaveURL(/\/doctor$/);
  await expect(page.getByTestId("doctor-dashboard")).toBeVisible();
  await page.getByTestId("doctor-create-session").click();
  await expect(page.getByText("Waiting for patient recording")).toBeVisible();

  await page.goto("/auth/login?type=patient");
  await page.getByTestId("patient-password").fill(demoPassword);
  await page.getByTestId("patient-login-submit").click();
  await expect(page).toHaveURL(/\/patient$/);

  for (const movementType of movementTypes) {
    await page.getByTestId(`patient-task-${movementType}`).click();
    await page.getByTestId("patient-tutorial-continue").click();
    await expect(page).toHaveURL(new RegExp(`/patient/record\\?task=${movementType}`));

    await page.getByTestId("patient-video-upload").setInputFiles({
      buffer: Buffer.from(`ui fake ${movementType} video`),
      mimeType: "video/webm",
      name: `${movementType}.webm`,
    });
    await page.getByTestId("patient-save-task").click();
    await expect(page).toHaveURL(/\/patient$/);
  }

  await expect(page.getByTestId("patient-submit-session")).toBeEnabled();
  await page.getByTestId("patient-submit-session").click();
  await expect(page).toHaveURL(/\/patient\/status$/);

  await page.goto("/doctor");
  await expect(page).toHaveURL(/\/doctor$/);
  await expect(page.getByTestId("doctor-dashboard")).toBeVisible();
  await expect(page.getByText("PATIENT-7712").first()).toBeVisible();
  await page.getByTestId("doctor-feedback-patient-summary").fill("UI E2E patient summary");
  await page.getByTestId("doctor-send-feedback").click();
  await expect(page.getByTestId("doctor-feedback-success")).toBeVisible();

  await page.goto("/patient/feedback");
  await expect(page.getByTestId("patient-feedback-page")).toContainText("UI E2E patient summary");

  await page.goto("/admin/login");
  await page.getByTestId("admin-password").fill("admin-test");
  await page.getByTestId("admin-login-submit").click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await expect(page.getByTestId("admin-dashboard")).toContainText("PATIENT-7712");

  await page.goto("/admin/dashboard?user=PATIENT-7712");
  await expect(page.getByTestId("admin-dashboard")).toContainText("PATIENT-7712");
});
