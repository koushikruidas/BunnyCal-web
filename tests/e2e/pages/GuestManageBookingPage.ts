import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class GuestManageBookingPage {
  readonly page: Page;

  readonly heroTitle: Locator;
  readonly currentTimeLabel: Locator;
  readonly rescheduleButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmCancelButton: Locator;
  readonly keepBookingButton: Locator;
  readonly backToBookingButton: Locator;
  readonly slotDayTitle: Locator;
  readonly slotButtons: Locator;
  readonly slotLoadingSkeletons: Locator;
  readonly noTimesMessage: Locator;
  readonly activeCalendarDays: Locator;
  readonly reviewNewTimeButton: Locator;
  readonly currentTimeReviewCard: Locator;
  readonly newTimeReviewCard: Locator;
  readonly confirmRescheduleButton: Locator;
  readonly terminalTitle: Locator;
  readonly terminalSubtitle: Locator;
  readonly statusValue: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heroTitle = page.locator("h1, h2").filter({ hasText: /Manage your booking|Confirm new time|Booking moved|Booking cancelled/i }).first();
    this.currentTimeLabel = page.locator("span").filter({ hasText: /Currently scheduled/i }).first();
    this.rescheduleButton = page.getByRole("button", { name: /Reschedule booking/i });
    this.cancelButton = page.getByRole("button", { name: /Cancel booking/i });
    this.confirmCancelButton = page.getByRole("button", { name: /Yes, cancel booking/i });
    this.keepBookingButton = page.getByRole("button", { name: /Keep booking/i });
    this.backToBookingButton = page.getByRole("button", { name: /Back to your booking/i });
    this.slotDayTitle = page.locator(".bk-slot-day");
    this.slotButtons = page.locator(".bk-slot-btn button[type='button']:not([disabled])");
    this.slotLoadingSkeletons = page.locator(".bk-slot-panel [aria-label='Loading available time']");
    this.noTimesMessage = page.locator(".bk-slot-panel").filter({ hasText: /No times available|No slots|Try another date/i });
    this.activeCalendarDays = page.locator(".bk-cal-cell.is-active");
    this.reviewNewTimeButton = page.getByRole("button", { name: /Review new time/i });
    this.currentTimeReviewCard = page.locator("div").filter({ hasText: /^Currently$/ }).first().locator("..");
    this.newTimeReviewCard = page.locator("div").filter({ hasText: /^New time$/ }).first().locator("..");
    this.confirmRescheduleButton = page.getByRole("button", { name: /Confirm reschedule|Confirming/i });
    this.terminalTitle = page.locator("h2").filter({ hasText: /Booking moved|Booking cancelled/i }).first();
    this.terminalSubtitle = page.locator(".bk-confirmed-sub").first();
    this.statusValue = page.locator("div").filter({ hasText: /^Status/i }).locator("span").last();
  }

  async waitForSummary(timeout = 20_000) {
    await expect(this.rescheduleButton).toBeVisible({ timeout });
  }

  async currentScheduledText(): Promise<string> {
    return this.currentTimeLabel.innerText();
  }

  async openReschedule() {
    await this.rescheduleButton.click();
  }

  async waitForRescheduleView(timeout = 20_000) {
    await expect(this.backToBookingButton).toBeVisible({ timeout });
  }

  async waitForSlots(timeout = 15_000) {
    await this.slotLoadingSkeletons.first().waitFor({ state: "hidden", timeout }).catch(() => {});
    await this.slotButtons.first().waitFor({ state: "visible", timeout });
  }

  async selectAlternativeSlot(maxDays = 14) {
    return this.selectNextAvailableSlot(new Set<string>(), maxDays);
  }

  async selectNextAvailableSlot(triedSlots: Set<string>, maxDays = 14) {
    for (let dayIndex = 0; dayIndex < maxDays; dayIndex++) {
      await this.slotLoadingSkeletons.first().waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});

      const dayLabel = await this.slotDayTitle.innerText().catch(() => `day-${dayIndex}`);
      const count = await this.slotButtons.count();
      for (let slotIndex = 0; slotIndex < count; slotIndex++) {
        const slot = this.slotButtons.nth(slotIndex);
        const slotLabel = await slot.innerText().catch(() => `slot-${slotIndex}`);
        const key = `${dayLabel} :: ${slotLabel}`;
        if (triedSlots.has(key)) continue;

        await slot.click();
        return key;
      }

      const day = this.activeCalendarDays.nth(dayIndex);
      if (!await day.isVisible().catch(() => false)) {
        break;
      }

      await day.click().catch(() => {});
      await this.page.waitForTimeout(1_500);
    }

    throw new Error("Reschedule flow did not expose any alternative slot across the scanned active days");
  }

  async continueToReview() {
    await this.reviewNewTimeButton.click();
  }

  async reviewedCurrentTimeText(): Promise<string> {
    return this.currentTimeReviewCard.innerText();
  }

  async reviewedNewTimeText(): Promise<string> {
    return this.newTimeReviewCard.innerText();
  }

  async confirmReschedule() {
    await this.confirmRescheduleButton.click();
  }

  async confirmCancel() {
    await this.confirmCancelButton.click();
  }

  async waitForCancelDialog(timeout = 10_000) {
    await expect(this.confirmCancelButton).toBeVisible({ timeout });
  }

  async waitForRescheduled(timeout = 20_000) {
    await expect(this.terminalTitle).toHaveText(/Booking moved/i, { timeout });
  }

  async waitForCancelled(timeout = 20_000) {
    await expect(this.terminalTitle).toHaveText(/Booking cancelled/i, { timeout });
  }
}
