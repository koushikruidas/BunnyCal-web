import type { Page } from "@playwright/test";
import { test, expect, assertAuthStateReady, PERSONAS } from "../fixtures";
import { createUniqueEvent } from "../helpers/appHelpers";
import { waitForApplicationReady } from "../helpers/appHelpers";
import { EventWizardPage } from "../pages/EventWizardPage";

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const runSalt = 12;

function futureIsoDate(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + runSalt + offsetDays);
  return isoDate(date);
}

async function openOnboardingAtAvailabilityStep(page: Page, eventWizardPage: EventWizardPage) {
  await eventWizardPage.goto({ resetSession: true });
  await eventWizardPage.fillEventName(createUniqueEvent("E2E Onboarding Hydration"));
  await eventWizardPage.clickContinue();
  await expect(page).toHaveURL(/\/onboarding\/event\?step=2/, { timeout: 10_000 });
  await eventWizardPage.configureCalendarsStep();
  await eventWizardPage.clickContinue();
  await expect(page).toHaveURL(/\/onboarding\/event\?step=3/, { timeout: 10_000 });
}

function trackOverrideCreationRequests(page: Page) {
  const requests: Array<{ status: number; url: string }> = [];
  page.on("response", async (response) => {
    if (response.request().method() !== "POST") return;
    if (!response.url().includes("/api/availability/overrides")) return;
    requests.push({ status: response.status(), url: response.url() });
  });
  return {
    requests,
    snapshot() {
      return requests.slice();
    },
  };
}

test.describe("Onboarding availability hydration", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test.beforeEach(async ({ availabilityPage }) => {
    await availabilityPage.goto();
    await availabilityPage.page.waitForURL(/\/dashboard\/availability/, { timeout: 20_000 });
    await waitForApplicationReady(availabilityPage.page);
    await expect(availabilityPage.addOverrideToggle).toBeVisible({ timeout: 60_000 });
  });

  test.afterEach(async ({ availabilityPage }) => {
    await availabilityPage.goto();
    await availabilityPage.page.waitForURL(/\/dashboard\/availability/, { timeout: 20_000 });
    await waitForApplicationReady(availabilityPage.page);
    await expect(availabilityPage.addOverrideToggle).toBeVisible({ timeout: 60_000 });
  });

  test("shows existing date overrides in onboarding step 3", async ({ availabilityPage, page }) => {
    const blockedIso = futureIsoDate(1);

    await availabilityPage.addUnavailableOverride(blockedIso);

    const onboardingPage = await page.context().newPage();
    const onboardingWizard = new EventWizardPage(onboardingPage);
    await onboardingPage.addInitScript(() => {
      window.sessionStorage.clear();
    });

    await openOnboardingAtAvailabilityStep(onboardingPage, onboardingWizard);

    const overrideRows = onboardingPage.locator(".onb-override-row").filter({ hasText: blockedIso });
    await expect(overrideRows).toHaveCount(1);
    await expect(overrideRows).toContainText("Unavailable");

    await onboardingPage.close();
  });

  test("shows existing custom-hours overrides in onboarding step 3", async ({ availabilityPage, page }) => {
    const customIso = futureIsoDate(2);
    const startTime = "06:00";
    const endTime = "22:00";

    await availabilityPage.addCustomHoursOverride(customIso, startTime, endTime);

    const onboardingPage = await page.context().newPage();
    const onboardingWizard = new EventWizardPage(onboardingPage);
    await onboardingPage.addInitScript(() => {
      window.sessionStorage.clear();
    });

    await openOnboardingAtAvailabilityStep(onboardingPage, onboardingWizard);

    const overrideRows = onboardingPage.locator(".onb-override-row").filter({ hasText: customIso });
    await expect(overrideRows).toHaveCount(1);
    await expect(overrideRows).toContainText(startTime);
    await expect(overrideRows).toContainText(endTime);

    await onboardingPage.close();
  });

  test("keeps draft edits functional after hydration without duplicate rows", async ({ availabilityPage, page }) => {
    const customIso = futureIsoDate(3);

    await availabilityPage.addCustomHoursOverride(customIso, "09:00", "17:00");

    const onboardingPage = await page.context().newPage();
    const onboardingWizard = new EventWizardPage(onboardingPage);
    await onboardingPage.addInitScript(() => {
      window.sessionStorage.clear();
    });

    await openOnboardingAtAvailabilityStep(onboardingPage, onboardingWizard);

    const overrideCard = onboardingPage.locator(".onb-note-card").filter({ hasText: "Date overrides" }).first();
    const overrideRows = onboardingPage.locator(".onb-override-row").filter({ hasText: customIso });

    await expect(overrideRows).toHaveCount(1);
    await expect(overrideRows).toContainText("09:00");
    await expect(overrideRows).toContainText("17:00");

    await overrideCard.locator("input[type='date']").fill(customIso);
    await overrideCard.getByRole("button", { name: /Custom hours/i }).click();
    await overrideCard.locator("input[type='time']").first().fill("08:30");
    await overrideCard.locator("input[type='time']").last().fill("16:30");
    await overrideCard.getByRole("button", { name: /^Add$/ }).click();

    await expect(overrideRows).toHaveCount(1);
    await expect(overrideRows).toContainText("08:30");
    await expect(overrideRows).toContainText("16:30");

    await onboardingPage.close();
  });

  test("saves only newly added overrides after hydration", async ({ availabilityPage, page }) => {
    const blockedIso = futureIsoDate(4);
    const customIso = futureIsoDate(5);
    const newIso = futureIsoDate(6);

    await availabilityPage.addUnavailableOverride(blockedIso);
    await availabilityPage.addCustomHoursOverride(customIso, "06:00", "22:00");

    const onboardingPage = await page.context().newPage();
    const onboardingWizard = new EventWizardPage(onboardingPage);
    await onboardingPage.addInitScript(() => {
      window.sessionStorage.clear();
    });

    await openOnboardingAtAvailabilityStep(onboardingPage, onboardingWizard);

    const postedBodies: Array<Record<string, unknown>> = [];
    const postedStatuses: number[] = [];
    onboardingPage.on("request", (request) => {
      if (request.method() !== "POST" || !request.url().includes("/api/availability/overrides")) return;
      const payload = request.postDataJSON();
      if (payload && typeof payload === "object") {
        postedBodies.push(payload as Record<string, unknown>);
      }
    });
    onboardingPage.on("response", (response) => {
      if (response.request().method() !== "POST" || !response.url().includes("/api/availability/overrides")) return;
      postedStatuses.push(response.status());
    });

    const newOverrideCard = onboardingPage.locator(".onb-note-card").filter({ hasText: "Date overrides" }).first();
    await newOverrideCard.locator("input[type='date']").fill(newIso);
    await newOverrideCard.getByRole("button", { name: /Custom hours/i }).click();
    await newOverrideCard.locator("input[type='time']").first().fill("08:30");
    await newOverrideCard.locator("input[type='time']").last().fill("16:30");
    await newOverrideCard.getByRole("button", { name: /^Add$/ }).click();

    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=2/, { timeout: 20_000 }),
      onboardingWizard.clickBack(),
    ]);
    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=3/, { timeout: 20_000 }),
      onboardingWizard.clickContinue(),
    ]);

    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=4/, { timeout: 20_000 }),
      onboardingWizard.clickContinue(),
    ]);

    expect(postedBodies).toHaveLength(1);
    expect(postedBodies[0]).toMatchObject({
      date: newIso,
      available: true,
      isAvailable: true,
      startTime: "08:30",
      endTime: "16:30",
    });
    expect(postedStatuses).toEqual([200]);
    await expect(onboardingPage.locator(".onb-error")).toHaveCount(0);

    await onboardingPage.close();
  });

  test("treats server overrides as the baseline and only saves the delta", async ({ availabilityPage, page }) => {
    const blockedIso = futureIsoDate(7);
    const customIso = futureIsoDate(8);
    const deltaIso = futureIsoDate(9);

    await availabilityPage.addUnavailableOverride(blockedIso);
    await availabilityPage.addCustomHoursOverride(customIso, "06:00", "22:00");

    const onboardingPage = await page.context().newPage();
    const onboardingWizard = new EventWizardPage(onboardingPage);
    await onboardingPage.addInitScript(() => {
      window.sessionStorage.clear();
    });

    const overridePostTracker = trackOverrideCreationRequests(onboardingPage);

    await openOnboardingAtAvailabilityStep(onboardingPage, onboardingWizard);

    const baselineBlocked = onboardingPage.locator(".onb-override-row").filter({ hasText: blockedIso });
    const baselineCustom = onboardingPage.locator(".onb-override-row").filter({ hasText: customIso });
    await expect(baselineBlocked).toHaveCount(1);
    await expect(baselineBlocked).toContainText("Unavailable");
    await expect(baselineCustom).toHaveCount(1);
    await expect(baselineCustom).toContainText("06:00");
    await expect(baselineCustom).toContainText("22:00");

    const beforeContinueWithoutChanges = overridePostTracker.snapshot().length;
    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=4/, { timeout: 20_000 }),
      onboardingWizard.clickContinue(),
    ]);
    expect(overridePostTracker.snapshot().slice(beforeContinueWithoutChanges)).toEqual([]);
    await expect(onboardingPage.locator(".onb-error")).toHaveCount(0);

    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=3/, { timeout: 20_000 }),
      onboardingWizard.clickBack(),
    ]);
    await expect(baselineBlocked).toHaveCount(1);
    await expect(baselineCustom).toHaveCount(1);

    const deltaCard = onboardingPage.locator(".onb-note-card").filter({ hasText: "Date overrides" }).first();
    await deltaCard.locator("input[type='date']").fill(deltaIso);
    await deltaCard.getByRole("button", { name: /Custom hours/i }).click();
    await deltaCard.locator("input[type='time']").first().fill("08:30");
    await deltaCard.locator("input[type='time']").last().fill("16:30");
    await deltaCard.getByRole("button", { name: /^Add$/ }).click();

    const beforeDeltaContinue = overridePostTracker.snapshot().length;
    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=4/, { timeout: 20_000 }),
      onboardingWizard.clickContinue(),
    ]);
    const deltaPosts = overridePostTracker.snapshot().slice(beforeDeltaContinue);
    expect(deltaPosts).toHaveLength(1);
    expect(deltaPosts[0].status).toBe(200);
    await expect(onboardingPage.locator(".onb-error")).toHaveCount(0);

    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=3/, { timeout: 20_000 }),
      onboardingWizard.clickBack(),
    ]);
    await expect(onboardingPage.locator(".onb-override-row").filter({ hasText: blockedIso })).toHaveCount(1);
    await expect(onboardingPage.locator(".onb-override-row").filter({ hasText: customIso })).toHaveCount(1);
    await expect(onboardingPage.locator(".onb-override-row").filter({ hasText: deltaIso })).toHaveCount(1);

    const beforeFinalContinue = overridePostTracker.snapshot().length;
    await Promise.all([
      onboardingPage.waitForURL(/\/onboarding\/event\?step=4/, { timeout: 20_000 }),
      onboardingWizard.clickContinue(),
    ]);
    expect(overridePostTracker.snapshot().slice(beforeFinalContinue)).toEqual([]);
    await expect(onboardingPage.locator(".onb-error")).toHaveCount(0);

    await onboardingPage.close();
  });
});
