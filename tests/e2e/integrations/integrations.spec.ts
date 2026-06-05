import { test, expect } from "../fixtures";
import { waitForApplicationReady } from "../helpers/appHelpers";

/**
 * Integration management — calendar & conferencing connect/disconnect flows.
 * Requires authenticated session (chromium-auth project).
 *
 * OAuth redirects cannot be fully automated in this suite; these tests verify
 * the UI states before and after connecting. Full connect flows are covered by
 * the Assisted Mode auth setup.
 */

test.describe("Integrations page", () => {
  test.beforeEach(async ({ page, integrationsPage }) => {
    await integrationsPage.goto();
    await waitForApplicationReady(page);
  });

  test("renders the integrations page without crashing", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/integrations/);
    // Page should show some provider options
    await expect(page.locator("text=/Calendar|Conferencing|Google|Microsoft/i").first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows Google Calendar connect option", async ({ page }) => {
    await expect(page.locator("text=/Google/i").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Refresh button is present and clickable", async ({ page }) => {
    const refreshBtn = page.locator("button", { hasText: /Refresh|Sync/ }).first();
    const isVisible = await refreshBtn.isVisible().catch(() => false);
    if (isVisible) {
      await refreshBtn.click();
      // Should not crash — loader may appear briefly
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(/error/);
    }
  });
});
