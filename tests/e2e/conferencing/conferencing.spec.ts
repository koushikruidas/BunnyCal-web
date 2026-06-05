import { test, expect } from "../fixtures";
import { waitForApplicationReady } from "../helpers/appHelpers";

/**
 * Conferencing provider selection — verifies that conferencing options
 * (Zoom, Google Meet, Teams) appear in the event wizard and integrations page.
 * Requires authenticated session (chromium-auth project).
 */

test.describe("Conferencing provider selection", () => {
  test("integrations page shows conferencing section", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await waitForApplicationReady(page);

    // Should have a section for conferencing / video providers
    await expect(
      page.locator("text=/Conferencing|Video|Zoom|Meet|Teams/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("event wizard exposes conferencing picker", async ({ page, eventWizardPage }) => {
    await eventWizardPage.goto();
    await waitForApplicationReady(page);

    // Navigate through step 1 to reach the conferencing step
    await eventWizardPage.fillEventName("Conferencing Test Meeting");

    // Check if conferencing options appear on this step or after continuing
    const onCurrentStep = await page
      .locator("text=/How you'll meet|Conferencing|Zoom|Google Meet/i")
      .first()
      .isVisible()
      .catch(() => false);

    if (!onCurrentStep) {
      await eventWizardPage.clickContinue();
      await page.waitForTimeout(500);
    }

    // Eventually conferencing options should be visible somewhere in the wizard
    await expect(
      page.locator("text=/How you'll meet|Conferencing|Zoom|Google Meet|Teams/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
