import type { Page, Locator } from "@playwright/test";

export type IntegrationKind = "calendar" | "conferencing";

export class IntegrationsPage {
  readonly page: Page;

  readonly banner: Locator;
  readonly refreshBtn: Locator;
  readonly calendarSection: Locator;
  readonly conferencingSection: Locator;

  constructor(page: Page) {
    this.page = page;

    this.banner = page.locator("[class*='banner'], [role='alert']").first();
    this.refreshBtn = page.locator("button", { hasText: /Refresh|Sync/ }).first();
    this.calendarSection = page.locator("section, div").filter({ hasText: /Calendar/i }).first();
    this.conferencingSection = page.locator("section, div").filter({ hasText: /Conferencing|Video/i }).first();
  }

  async goto() {
    await this.page.goto("/dashboard/integrations");
  }

  /** Returns the visible status text for a given provider name. */
  async providerStatus(providerName: string): Promise<string> {
    const row = this.page.locator("[class*='provider'], .integration-row").filter({ hasText: providerName });
    const badge = row.locator("[class*='badge'], [class*='status'], [class*='chip']").first();
    return badge.innerText();
  }

  async clickConnect(providerName: string) {
    const row = this.page.locator("[class*='provider'], .integration-row").filter({ hasText: providerName });
    await row.locator("button", { hasText: /Connect/ }).click();
  }

  async clickDisconnect(providerName: string) {
    const row = this.page.locator("[class*='provider'], .integration-row").filter({ hasText: providerName });
    await row.locator("button", { hasText: /Disconnect/ }).click();
  }

  /** Waits until a provider card shows "connected" status. */
  async waitForConnected(providerName: string, timeout = 30_000) {
    const row = this.page.locator("[class*='provider'], .integration-row").filter({ hasText: providerName });
    await row.locator("text=/connected/i").waitFor({ timeout });
  }
}
