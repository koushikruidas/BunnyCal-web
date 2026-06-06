import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

type DayLabel =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export class AvailabilityPage {
  readonly page: Page;

  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly addOverrideToggle: Locator;
  readonly unavailableAllDayTab: Locator;
  readonly customHoursTab: Locator;
  readonly overrideDateInput: Locator;
  readonly overrideStartInput: Locator;
  readonly overrideEndInput: Locator;
  readonly saveOverrideButton: Locator;
  readonly overridesPanel: Locator;

  constructor(page: Page) {
    this.page = page;

    this.editButton = page.getByRole("button", { name: /Edit|Hide editor/i }).first();
    this.saveButton = page.getByRole("button", { name: /^Save$/ }).first();
    this.addOverrideToggle = page.getByRole("button", { name: /Add override|Close/i });
    this.unavailableAllDayTab = page.getByRole("button", { name: /Unavailable all day/i });
    this.customHoursTab = page.getByRole("button", { name: /Custom hours/i });
    this.overrideDateInput = page.locator("input[type='date']").first();
    this.overrideStartInput = page.locator("input[type='time']").first();
    this.overrideEndInput = page.locator("input[type='time']").last();
    this.saveOverrideButton = page.getByRole("button", { name: /Save override/i });
    this.overridesPanel = page.locator(".override-row").locator("..");
  }

  async goto() {
    await this.page.goto("/dashboard/availability");
  }

  async waitForReady(timeout = 20_000) {
    await expect(this.page.locator(".av-studio")).toBeVisible({ timeout });
  }

  async openEditor() {
    const label = await this.editButton.innerText().catch(() => "");
    if (/Hide editor/i.test(label)) return;
    await this.editButton.click();
  }

  private dayRow(day: DayLabel) {
    return this.page.locator(".avail-day-row").filter({ hasText: day }).first();
  }

  async setDayRule(day: DayLabel, rule: { enabled: boolean; startTime?: string; endTime?: string }) {
    await this.openEditor();
    const row = this.dayRow(day);
    await row.waitFor({ state: "visible", timeout: 10_000 });

    const enabledInput = row.locator("input[type='checkbox']");
    const checked = await enabledInput.isChecked();
    if (checked !== rule.enabled) {
      await enabledInput.click();
    }

    if (rule.enabled) {
      if (rule.startTime) await row.locator("input[type='time']").nth(0).fill(rule.startTime);
      if (rule.endTime) await row.locator("input[type='time']").nth(1).fill(rule.endTime);
    }
  }

  async saveWeeklyRules() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.url().includes("/api/availability/rules/bulk"),
    );
    await this.saveButton.click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
  }

  async openAddOverride() {
    const label = await this.addOverrideToggle.innerText().catch(() => "");
    if (/Close/i.test(label)) return;
    await this.addOverrideToggle.click();
  }

  async addUnavailableOverride(date: string) {
    await this.openAddOverride();
    await this.overrideDateInput.fill(date);
    await this.unavailableAllDayTab.click();

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/availability/overrides"),
    );
    await this.saveOverrideButton.click();
    const response = await responsePromise;
    const body = await response.text().catch(() => "");
    if (!response.ok()) {
      throw new Error(`addUnavailableOverride failed: ${response.status()} ${body}`);
    }
  }

  async addCustomHoursOverride(date: string, startTime: string, endTime: string) {
    await this.openAddOverride();
    await this.overrideDateInput.fill(date);
    await this.customHoursTab.click();
    await this.overrideStartInput.fill(startTime);
    await this.overrideEndInput.fill(endTime);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/availability/overrides"),
    );
    await this.saveOverrideButton.click();
    const response = await responsePromise;
    const body = await response.text().catch(() => "");
    if (!response.ok()) {
      throw new Error(`addCustomHoursOverride failed: ${response.status()} ${body}`);
    }
  }

  async overrideRowText(dateLabel: string): Promise<string> {
    return this.page.locator(".override-row").filter({ hasText: dateLabel }).innerText();
  }

  async removeAllOverrides() {
    while (await this.page.getByRole("button", { name: /Delete override for/i }).count()) {
      const deleteButton = this.page.getByRole("button", { name: /Delete override for/i }).first();
      const responsePromise = this.page.waitForResponse(
        (response) =>
          response.request().method() === "DELETE" &&
          response.url().includes("/api/availability/overrides/"),
      );
      await deleteButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBe(true);
    }
  }

  async clearAllOverridesViaApi() {
    const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";
    await this.page.evaluate(async ({ apiBaseUrl }) => {
      const token = window.localStorage.getItem("auth-access-token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const listResponse = await fetch(`${apiBaseUrl}/api/availability/overrides`, {
        credentials: "include",
        headers,
      });
      if (!listResponse.ok) {
        throw new Error(`clearAllOverridesViaApi: GET failed with ${listResponse.status}`);
      }

      const payload = await listResponse.json() as { data?: Array<{ id?: string }> };
      const overrides = Array.isArray(payload.data) ? payload.data : [];
      for (const override of overrides) {
        if (!override.id) continue;
        const deleteResponse = await fetch(`${apiBaseUrl}/api/availability/overrides/${override.id}`, {
          method: "DELETE",
          credentials: "include",
          headers,
        });
        if (!deleteResponse.ok) {
          throw new Error(`clearAllOverridesViaApi: DELETE failed for ${override.id} with ${deleteResponse.status}`);
        }
      }
    }, { apiBaseUrl });
  }
}
