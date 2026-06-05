import type { Page } from "@playwright/test";
import { expect, test, assertAuthStateReady, PERSONAS } from "../../fixtures";
import { createUniqueEvent } from "../../helpers/appHelpers";
import {
  getCalendarSelectionRows,
  getProjectionSelectionRows,
  readOnboardingDraft,
} from "./multiCalendarHelpers";

async function goToCalendarsStep(page: Page, eventWizardPage: { goto: (options?: { resetSession?: boolean }) => Promise<void>; fillEventName: (name: string) => Promise<void>; clickContinue: () => Promise<void>; }) {
  await eventWizardPage.goto({ resetSession: true });
  await eventWizardPage.fillEventName(createUniqueEvent("E2E Multi Calendar"));
  await eventWizardPage.clickContinue();
  await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 10_000 });
}

test.describe("Multi-calendar onboarding", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleMultiCalendar, "google-multi-calendar");
  });

  test("displays multiple connected calendars and persists selections across onboarding steps", async ({
    page,
    eventWizardPage,
  }) => {
    await goToCalendarsStep(page, eventWizardPage);

    const calendarRows = await getCalendarSelectionRows(page);
    const projectionRows = await getProjectionSelectionRows(page);

    console.log("[multi-calendar] availability rows", calendarRows);
    console.log("[multi-calendar] projection rows", projectionRows);

    expect(calendarRows.length).toBeGreaterThan(1);
    expect(projectionRows.length).toBeGreaterThan(0);

    const availabilityToggles = page.locator(".cp-lrow button[role='switch']");
    for (let i = 0; i < Math.min(2, calendarRows.length); i += 1) {
      const toggle = availabilityToggles.nth(i);
      const checked = await toggle.getAttribute("aria-checked");
      if (checked !== "true") {
        await toggle.click();
      }
    }

    const projectionRadios = page.locator(".cp-dest-grid [role='radio']");
    await projectionRadios.first().click();

    await eventWizardPage.clickContinue();
    await expect(page).toHaveURL(/\/onboarding\/event\?step=3/, { timeout: 10_000 });

    await eventWizardPage.clickBack();
    await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 10_000 });

    const persistedRows = await getCalendarSelectionRows(page);
    const persistedProjectionRows = await getProjectionSelectionRows(page);

    expect(persistedRows.filter((row) => row.selected).length).toBeGreaterThanOrEqual(1);
    expect(persistedProjectionRows.filter((row) => row.selected).length).toBe(1);
  });

  test("blocks progression until at least one availability calendar and projection calendar are selected", async ({
    page,
    eventWizardPage,
  }) => {
    await goToCalendarsStep(page, eventWizardPage);

    const calendarRows = await getCalendarSelectionRows(page);
    const projectionRows = await getProjectionSelectionRows(page);

    expect(calendarRows.length).toBeGreaterThan(1);
    expect(projectionRows.length).toBeGreaterThan(0);

    await expect(
      page.locator(".cp-note", { hasText: /Pick where confirmed bookings should land before you continue/i }),
    ).toBeVisible();
    await eventWizardPage.clickContinue();
    await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 5_000 });
    await expect(page.locator(".onb-error")).toContainText(/Please complete this step before continuing/i);

    const draft = await readOnboardingDraft(page);
    expect(draft).not.toBeNull();
  });

  test("reflects selection changes in the persisted onboarding draft state", async ({
    page,
    eventWizardPage,
  }) => {
    await goToCalendarsStep(page, eventWizardPage);

    const projectionRows = await getProjectionSelectionRows(page);
    expect(projectionRows.length).toBeGreaterThan(0);

    const availabilityToggles = page.locator(".cp-lrow button[role='switch']");
    const rowCount = await availabilityToggles.count();
    expect(rowCount).toBeGreaterThan(1);

    const firstToggle = availabilityToggles.nth(0);
    const secondToggle = availabilityToggles.nth(1);

    if ((await firstToggle.getAttribute("aria-checked")) !== "true") {
      await firstToggle.click();
    }
    if ((await secondToggle.getAttribute("aria-checked")) !== "true") {
      await secondToggle.click();
    }

    const projectionRadios = page.locator(".cp-dest-grid [role='radio']");
    await projectionRadios.nth(0).click();
    await eventWizardPage.clickContinue();
    await expect(page).toHaveURL(/\/onboarding\/event\?step=3/, { timeout: 10_000 });

    await eventWizardPage.clickBack();
    await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 10_000 });

    const draftAfterFirstSelection = await readOnboardingDraft(page);
    expect(draftAfterFirstSelection).not.toBeNull();
    expect((await getCalendarSelectionRows(page)).filter((row) => row.selected).length).toBeGreaterThanOrEqual(2);
    expect((await getProjectionSelectionRows(page)).filter((row) => row.selected).length).toBe(1);

    if (projectionRows.length > 1) {
      await projectionRadios.nth(1).click();
      await eventWizardPage.clickContinue();
      await expect(page).toHaveURL(/\/onboarding\/event\?step=3/, { timeout: 10_000 });

      await eventWizardPage.clickBack();
      await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 10_000 });

      const projectionAfterSwap = await getProjectionSelectionRows(page);
      expect(projectionAfterSwap.filter((row) => row.selected).length).toBe(1);
      expect(projectionAfterSwap[1].selected).toBe(true);
    }
  });
});
