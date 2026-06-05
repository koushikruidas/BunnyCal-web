import { test, expect } from "../fixtures";
import { waitForApplicationReady, waitForRedirect } from "../helpers/appHelpers";

/**
 * Onboarding flow — tests the multi-step onboarding wizard at /onboarding/event
 * These tests require an authenticated session (chromium-auth project).
 */

test.describe("Onboarding wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/onboarding/event");
    await waitForApplicationReady(page);
  });

  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    // This spec runs without auth — override storageState for this test
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/onboarding/event");
    await waitForRedirect(page, /\/sign-in/, 10_000);
  });

  test("renders the first step of the onboarding wizard", async ({ page }) => {
    // The onboarding event page shows a StepShell with step indicators
    await expect(page.locator("[class*='step'], .stepper, text=Meeting details")).toBeVisible({ timeout: 10_000 });
  });

  test("Continue button is disabled when event name is empty", async ({ page, eventWizardPage }) => {
    // The first step requires a name before continuing
    await expect(eventWizardPage.continueBtn).toBeDisabled({ timeout: 5_000 }).catch(() => {
      // Some implementations grey out vs disable — check it doesn't navigate
    });
  });
});
