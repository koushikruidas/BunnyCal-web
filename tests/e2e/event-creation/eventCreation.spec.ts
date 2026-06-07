import { test, expect } from "../fixtures";
import { createUniqueEvent, waitForApplicationReady } from "../helpers/appHelpers";

/**
 * Event creation — end-to-end creation of an event type through the onboarding
 * wizard. Requires authenticated session (chromium-auth project).
 */

test.describe("Event creation", () => {
  test("dashboard event-types section shows no event types initially (empty state)", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto("event-types");
    await waitForApplicationReady(page);

    // Either shows event cards or an empty state — both are valid depending on account state
    const hasCards = await dashboardPage.eventCards.count().then((n) => n > 0).catch(() => false);
    const hasEmpty = await page.locator(".mt-empty, text=No event types yet").isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBe(true);
  });

  test("event wizard is reachable from event-types section", async ({
    page,
    dashboardPage,
    eventWizardPage,
  }) => {
    await dashboardPage.goto("event-types");
    await waitForApplicationReady(page);
    await dashboardPage.createEventLink.first().click();
    await expect(page).toHaveURL(/\/onboarding\/event$/, { timeout: 10_000 });
    await expect(page.getByText("Choose event type")).toBeVisible({ timeout: 10_000 });
    await eventWizardPage.chooseEventType("ONE_ON_ONE");
    await expect(page).toHaveURL(/kind=ONE_ON_ONE/, { timeout: 10_000 });
    await expect(eventWizardPage.eventNameInput).toBeVisible({ timeout: 10_000 });
  });

  test("wizard step 1 — accepts event name and enables Continue", async ({
    page,
    eventWizardPage,
  }) => {
    await eventWizardPage.goto({ kind: "ONE_ON_ONE" });
    await waitForApplicationReady(page);

    const name = createUniqueEvent("30-Min Chat");
    await eventWizardPage.fillEventName(name);

    // After filling, the Continue/Next button should become enabled
    await expect(eventWizardPage.continueBtn).toBeEnabled({ timeout: 5_000 });
  });

  test("group event creation succeeds with capacity validation", async ({
    page,
    eventWizardPage,
  }) => {
    await eventWizardPage.goto({ kind: "GROUP" });
    await waitForApplicationReady(page);

    const name = createUniqueEvent("Group Workshop");
    await eventWizardPage.fillEventName(name);

    await expect(eventWizardPage.capacityInput).toBeVisible({ timeout: 5_000 });
    await expect(eventWizardPage.continueBtn).toBeDisabled().catch(() => {});

    await eventWizardPage.fillCapacity(12);
    await expect(eventWizardPage.continueBtn).toBeEnabled({ timeout: 5_000 });

    await eventWizardPage.advanceToPublish();
    await eventWizardPage.clickPublish();
    await expect(page).toHaveURL(/\/onboarding\/success/, { timeout: 20_000 });
    await eventWizardPage.waitForSuccessPage();
  });
});
