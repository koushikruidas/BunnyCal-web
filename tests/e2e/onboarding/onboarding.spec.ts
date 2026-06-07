import { test, expect } from "../fixtures";
import { waitForApplicationReady, waitForRedirect } from "../helpers/appHelpers";

/**
 * Onboarding flow — tests the multi-step onboarding wizard at /onboarding/event
 * These tests require an authenticated session (chromium-auth project).
 */

test.describe("Onboarding event entry", () => {
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

  test("renders the event type selection screen", async ({ page, eventWizardPage }) => {
    await expect(page.getByText("Choose event type")).toBeVisible({ timeout: 10_000 });
    await expect(eventWizardPage.eventTypeCards).toHaveCount(4);
    await expect(eventWizardPage.oneOnOneCard).toBeEnabled();
    await expect(eventWizardPage.groupCard).toBeEnabled();
    await expect(eventWizardPage.roundRobinCard).toBeDisabled();
    await expect(eventWizardPage.collectiveCard).toBeDisabled();
  });

  test("One-to-One selection opens the existing wizard", async ({ page, eventWizardPage }) => {
    await eventWizardPage.chooseEventType("ONE_ON_ONE");
    await expect(page).toHaveURL(/kind=ONE_ON_ONE/, { timeout: 10_000 });
    await expect(eventWizardPage.eventNameInput).toBeVisible({ timeout: 10_000 });
  });
});
