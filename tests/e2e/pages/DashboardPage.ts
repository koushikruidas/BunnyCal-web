import type { Page, Locator } from "@playwright/test";

type DashboardSection =
  | "meetings"
  | "event-types"
  | "event-editor"
  | "availability"
  | "availability-sources"
  | "integrations"
  | "linked-accounts"
  | "participation"
  | "settings";

export class DashboardPage {
  readonly page: Page;

  // Navigation
  readonly sidebar: Locator;
  readonly mobileNav: Locator;

  // Meetings section
  readonly nextUpHeading: Locator;
  readonly meetingList: Locator;
  readonly upcomingTab: Locator;
  readonly pastTab: Locator;
  readonly cancelledTab: Locator;

  // Event-types section
  readonly createEventLink: Locator;
  readonly eventCards: Locator;

  // Availability section
  readonly saveAvailabilityBtn: Locator;
  readonly addOverrideBtn: Locator;
  readonly overrideDateInput: Locator;
  readonly overrideStartInput: Locator;
  readonly overrideEndInput: Locator;
  readonly saveOverrideBtn: Locator;

  // Integrations section
  readonly integrationsSection: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sidebar = page.locator("nav, aside").first();
    this.mobileNav = page.locator(".mobile-nav, [data-testid='mobile-nav']").first();

    this.nextUpHeading = page.locator(".allclear h2");
    this.meetingList = page.locator(".meet-list");
    this.upcomingTab = page.locator(".mt-tab", { hasText: /Upcoming/ });
    this.pastTab = page.locator(".mt-tab", { hasText: /Past/ });
    this.cancelledTab = page.locator(".mt-tab", { hasText: /Cancelled/ });

    this.createEventLink = page.locator("a", { hasText: /New event|Create event/ });
    this.eventCards = page.locator(".et-card");

    this.saveAvailabilityBtn = page.locator("button, [role='button']", { hasText: "Save" }).first();
    this.addOverrideBtn = page.locator("button", { hasText: /Add override/ });
    this.overrideDateInput = page.locator("input[type='date']");
    this.overrideStartInput = page.locator("input[type='time']").first();
    this.overrideEndInput = page.locator("input[type='time']").last();
    this.saveOverrideBtn = page.locator("button", { hasText: /Save override/ });

    this.integrationsSection = page.locator("[class*='integrations']").first();
  }

  async goto(section?: DashboardSection) {
    const path = section && section !== "meetings"
      ? `/dashboard/${section}`
      : "/dashboard";
    await this.page.goto(path);
  }

  async waitForReady() {
    // Wait for the dashboard chrome container
    await this.page.locator(".dash-root").waitFor({ state: "visible" });
  }

  async navigateTo(section: DashboardSection) {
    const sectionPaths: Record<DashboardSection, string> = {
      meetings: "/dashboard",
      "event-types": "/dashboard/event-types",
      "event-editor": "/dashboard/event-editor",
      availability: "/dashboard/availability",
      "availability-sources": "/dashboard/availability/sources",
      integrations: "/dashboard/integrations",
      "linked-accounts": "/dashboard/linked-accounts",
      participation: "/dashboard/participation",
      settings: "/dashboard/settings",
    };
    await this.page.goto(sectionPaths[section]);
  }

  /** Returns true if a meeting row with the given guest name is visible. */
  async hasMeetingWith(guestName: string): Promise<boolean> {
    const row = this.page.locator(".meet-row .name", { hasText: guestName });
    return row.isVisible().catch(() => false);
  }

  async copyEventLink(eventName: string) {
    const card = this.eventCards.filter({ hasText: eventName });
    await card.locator("button", { hasText: /Copy link/ }).click();
    // Button briefly shows "Copied"
    await card.locator("button", { hasText: /Copied/ }).waitFor({ timeout: 3_000 });
  }

  async getEventBookingUrl(eventName: string): Promise<string> {
    const card = this.eventCards.filter({ hasText: eventName });
    const previewLink = card.locator("a", { hasText: /Preview/ });
    return previewLink.getAttribute("href").then((h) => h ?? "");
  }
}
