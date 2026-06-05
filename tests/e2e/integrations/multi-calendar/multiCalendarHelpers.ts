import type { Page } from "@playwright/test";

export interface CalendarSelectionRowSnapshot {
  label: string;
  provider: string;
  selected: boolean;
}

export async function readOnboardingDraft(page: Page) {
  return page.evaluate(() => {
    const key = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .find((name): name is string => Boolean(name && name.startsWith("onboarding-draft:")));
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
}

export async function getCalendarSelectionRows(page: Page): Promise<CalendarSelectionRowSnapshot[]> {
  const rows = page.locator(".cp-lrow");
  const count = await rows.count();
  const snapshot: CalendarSelectionRowSnapshot[] = [];

  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    snapshot.push({
      label: (await row.locator(".nm").innerText().catch(() => "")).trim(),
      provider: (await row.locator(".sb").innerText().catch(() => "")).trim(),
      selected: (await row.locator("button[role='switch']").getAttribute("aria-checked")) === "true",
    });
  }

  return snapshot;
}

export async function getProjectionSelectionRows(page: Page) {
  const rows = page.locator(".cp-dest-grid [role='radio']");
  const count = await rows.count();
  const snapshot: Array<{ label: string; provider: string; selected: boolean }> = [];

  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    snapshot.push({
      label: (await row.locator(".cp-dest-name").innerText().catch(() => "")).trim(),
      provider: (await row.locator(".cp-dest-sub").innerText().catch(() => "")).trim(),
      selected: (await row.getAttribute("aria-checked")) === "true",
    });
  }

  return snapshot;
}
