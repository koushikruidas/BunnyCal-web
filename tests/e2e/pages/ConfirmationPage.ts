import type { Page, Locator } from "@playwright/test";

export class ConfirmationPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly guestNameDisplay: Locator;
  readonly eventNameDisplay: Locator;
  readonly meetingTimeDisplay: Locator;
  readonly conferenceJoinLink: Locator;
  readonly calendarAddLink: Locator;
  readonly manageLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator("h1, h2", { hasText: /Beautifully done|Confirmed|You're booked/i }).first();
    this.guestNameDisplay = page.locator("[data-testid='guest-name'], .confirmed-guest-name").first();
    this.eventNameDisplay = page.locator("[data-testid='event-name'], .confirmed-event-name").first();
    this.meetingTimeDisplay = page.locator("[data-testid='meeting-time'], .confirmed-time").first();
    this.conferenceJoinLink = page.locator("a", { hasText: /Join meeting|Join call/i }).first();
    this.calendarAddLink = page.locator("a", { hasText: /Add to calendar/i }).first();
    this.manageLink = page.locator("a", { hasText: /Manage|Reschedule/i }).first();
  }

  async waitForConfirmed(timeout = 15_000) {
    await this.heading.waitFor({ state: "visible", timeout });
  }

  async isVisible(): Promise<boolean> {
    return this.heading.isVisible().catch(() => false);
  }

  /** Extracts the booking management URL from the page (used for reschedule/cancel tests). */
  async getManageUrl(): Promise<string | null> {
    const href = await this.manageLink.getAttribute("href").catch(() => null);
    if (href) return href;

    // Fallback: some confirmation views encode the bookingId in the current URL
    const url = this.page.url();
    return url.includes("/manage/") ? url : null;
  }
}
