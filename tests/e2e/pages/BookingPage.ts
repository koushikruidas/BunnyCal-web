import type { Page, Locator } from "@playwright/test";

export interface AttendeeDetails {
  name: string;
  email: string;
  notes?: string;
}

/**
 * Covers the public booking flow: SlotsView → DetailsView → HeldView → ConfirmedView.
 *
 * Key selectors derived from the source:
 *  SlotsView:   .bk-slots  /  SlotButton → <button> inside .bk-slot-btn
 *               Continue button: Button component disabled={!canContinue} → plain <button>
 *  DetailsView: #booking-guest-name, #booking-guest-email, textarea (notes)
 *               "Reserve this slot" button
 *  HeldView:    "Confirm booking" button  /  .bk-held-card
 *  ConfirmedView: .bk-success  /  .bk-success-title  /  .bk-success-pill
 */
export class BookingPage {
  readonly page: Page;

  // ── SlotsView ──────────────────────────────────────────────────────────
  readonly slotsSection: Locator;
  // Individual slot buttons live inside .bk-slot-btn wrappers
  readonly slotButtons: Locator;
  readonly slotsContinueBtn: Locator;
  readonly slotsLoadingSkeletons: Locator;
  readonly slotsEmptyState: Locator;

  // ── DetailsView ────────────────────────────────────────────────────────
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly notesTextarea: Locator;
  readonly reserveBtn: Locator;
  readonly detailsBackBtn: Locator;

  // ── HeldView ───────────────────────────────────────────────────────────
  readonly heldCard: Locator;
  readonly confirmBtn: Locator;
  readonly holdCountdown: Locator;
  readonly heldBackBtn: Locator;

  // ── ConfirmedView ──────────────────────────────────────────────────────
  readonly confirmedSection: Locator;
  readonly confirmedPill: Locator;
  readonly confirmedTitle: Locator;
  readonly confirmedSummary: Locator;
  readonly manageBookingLink: Locator;

  // ── Error ──────────────────────────────────────────────────────────────
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.slotsSection = page.locator(".bk-slots");
    this.slotButtons = page.locator(".bk-slot-btn button[type='button']:not([disabled])");
    this.slotsContinueBtn = page.locator(".bk-slot-foot button").filter({ hasText: /Continue/ });
    this.slotsLoadingSkeletons = page.locator(".bk-slot-panel [aria-label='Loading available time']");
    this.slotsEmptyState = page.locator(".bk-slot-panel").filter({ hasText: /No times available|No slots/ });

    this.nameInput = page.locator("#booking-guest-name");
    this.emailInput = page.locator("#booking-guest-email");
    this.notesTextarea = page.getByPlaceholder("A quick note so I can prep…");
    this.reserveBtn = page.locator("button", { hasText: /Reserve this slot/ });
    this.detailsBackBtn = page.locator("button", { hasText: /^Back$/ });

    this.heldCard = page.locator(".bk-held-card");
    this.confirmBtn = page.locator(".bk-held-card button", { hasText: /Confirm booking/ });
    this.holdCountdown = page.locator(".bk-held-card [aria-live='polite']");
    this.heldBackBtn = page.locator(".bk-held-card button", { hasText: /^Back$/ });

    this.confirmedSection = page.locator(".bk-success");
    this.confirmedPill = page.locator(".bk-success-pill");
    this.confirmedTitle = page.locator(".bk-success-title");
    this.confirmedSummary = page.locator(".bk-success-summary");
    this.manageBookingLink = page.locator("a", { hasText: /Manage booking/ });

    this.errorBanner = page.locator("[class*='border-accent-pink']").first();
  }

  async goto(username: string, eventTypeSlug: string) {
    await this.page.goto(`/book/${username}/${eventTypeSlug}`);
  }

  // ── Slot-readiness polling ────────────────────────────────────────────

  /**
   * Polls the booking page until at least one real bookable slot is found
   * across any active calendar day, or until `timeoutMs` elapses.
   *
   * Strategy:
   *   1. Reload the booking page to get a fresh state from the server.
   *   2. Scan every `.bk-cal-cell.is-active` day (skips disabled/past/weekend).
   *   3. For each active day, click it and wait up to `perDayMs` for slot
   *      buttons to appear (loading skeleton must clear first).
   *   4. If at least one slot appears on any day, return that day index (0-based).
   *   5. If no active day has slots, wait `retryIntervalMs` and reload, then retry.
   *   6. If `timeoutMs` is reached without finding a slot, return null.
   *
   * Returns the 0-based index of the first active day that had slots, or null on timeout.
   */
  async waitUntilEventBookable(options: {
    bookingUrl: string;
    timeoutMs?: number;
    perDayMs?: number;
    retryIntervalMs?: number;
    maxDaysPerScan?: number;
    onProgress?: (msg: string) => void;
  }): Promise<{ dayIndex: number; slotCount: number; elapsedMs: number } | null> {
    const {
      bookingUrl,
      timeoutMs = 60_000,
      perDayMs = 4_000,
      retryIntervalMs = 5_000,
      maxDaysPerScan = 14,
      onProgress = () => {},
    } = options;

    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt++;
      onProgress(`[waitUntilEventBookable] attempt ${attempt} — reload ${bookingUrl}`);
      await this.page.goto(bookingUrl, { waitUntil: "domcontentloaded" });

      // Wait for the calendar grid to render (the shell is always present)
      await this.slotsSection.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});

      // Collect all currently visible active day cells
      const activeDays = this.page.locator(".bk-cal-cell.is-active");
      const dayCount = await activeDays.count();
      onProgress(`  found ${dayCount} active day(s) in calendar grid`);

      for (let d = 0; d < Math.min(dayCount, maxDaysPerScan); d++) {
        if (Date.now() >= deadline) break;

        // Re-query each iteration — DOM may shift after a click
        const day = this.page.locator(".bk-cal-cell.is-active").nth(d);
        const dayLabel = await day.getAttribute("aria-label").catch(() => `day-${d}`);

        await day.click().catch(() => {});

        // Wait for loading skeletons to clear
        await this.slotsLoadingSkeletons.first()
          .waitFor({ state: "hidden", timeout: perDayMs })
          .catch(() => {});

        const slotCount = await this.slotButtons.count();
        onProgress(`  day ${d} (${dayLabel}): ${slotCount} slot(s)`);

        if (slotCount > 0) {
          const elapsedMs = Date.now() - (deadline - timeoutMs);
          return { dayIndex: d, slotCount, elapsedMs };
        }
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const wait = Math.min(retryIntervalMs, remaining);
      onProgress(`  no slots found on any day — waiting ${wait}ms before retry`);
      await this.page.waitForTimeout(wait);
    }

    return null;
  }

  // ── Slots step ────────────────────────────────────────────────────────

  async waitForSlots(timeout = 20_000) {
    // Wait for loading skeletons to disappear first
    await this.slotsLoadingSkeletons.first().waitFor({ state: "hidden", timeout }).catch(() => {});
    // Then wait for at least one enabled slot button
    await this.slotButtons.first().waitFor({ state: "visible", timeout });
  }

  /**
   * Clicks through calendar days until slots appear, trying up to maxDays weekdays.
   * Needed because the default selected date may be a weekend or a day with no slots yet.
   */
  async navigateToFirstSlotDay(maxDays = 14) {
    for (let i = 0; i < maxDays; i++) {
      // Wait for any loading skeleton to clear
      await this.slotsLoadingSkeletons.first().waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});

      // If slots are visible we're done
      const hasSlots = await this.slotButtons.first().isVisible().catch(() => false);
      if (hasSlots) return;

      // Click the first non-disabled, non-selected calendar cell to try the next weekday
      const nextDay = this.page.locator(".bk-cal-cell.is-active").first();
      if (!await nextDay.isVisible().catch(() => false)) break;

      await nextDay.click();
      // Give the slot panel API call time to start and return
      await this.page.waitForTimeout(2_000);
    }

    // Final check — raises a descriptive timeout error if still no slots
    await this.slotButtons.first().waitFor({ state: "visible", timeout: 10_000 });
  }

  async selectFirstAvailableSlot() {
    await this.waitForSlots();
    await this.slotButtons.first().click();
  }

  async selectSlotByText(timeLabel: string) {
    await this.slotButtons.filter({ hasText: timeLabel }).first().click();
  }

  async clickSlotsContinue() {
    await this.slotsContinueBtn.click();
  }

  // ── Details step ──────────────────────────────────────────────────────

  async waitForDetailsForm(timeout = 10_000) {
    await this.nameInput.waitFor({ state: "visible", timeout });
  }

  async fillAttendeeDetails(details: AttendeeDetails) {
    await this.waitForDetailsForm();
    await this.nameInput.fill(details.name);
    await this.emailInput.fill(details.email);
    if (details.notes) {
      await this.notesTextarea.fill(details.notes);
    }
  }

  async clickReserve() {
    await this.reserveBtn.click();
  }

  // ── Hold step ─────────────────────────────────────────────────────────

  async waitForHeldCard(timeout = 15_000) {
    await this.heldCard.waitFor({ state: "visible", timeout });
  }

  async clickConfirm() {
    await this.confirmBtn.click();
  }

  /**
   * Clicks Confirm and waits for ConfirmedView. If the backend returns
   * SLOT_UNAVAILABLE (the slot was taken since the hold was placed), navigates
   * back to SlotsView, picks the next untried slot on the same day, re-fills
   * attendee details, and retries. Tries up to `maxAttempts` different slots.
   */
  async confirmWithRetry(
    attendee: AttendeeDetails,
    maxAttempts = 5,
    confirmedTimeout = 20_000,
  ) {
    // Track which slot indices we've already tried on the current day
    let slotIndex = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // We are on HeldView — click Confirm
      await this.confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
      await this.confirmBtn.click();

      // Wait briefly for the state to settle (either success or error)
      await this.page.waitForTimeout(2_000);

      // Happy path: ConfirmedView appeared
      const confirmed = await this.confirmedSection.isVisible().catch(() => false);
      if (confirmed) return;

      // Check if an error appeared in the HeldView
      const errorVisible = await this.errorBanner.isVisible().catch(() => false);
      if (!errorVisible) {
        // No error but no success either — wait longer
        await this.confirmedSection.waitFor({ state: "visible", timeout: confirmedTimeout });
        return;
      }

      // SLOT_UNAVAILABLE — navigate back to SlotsView and pick the next slot
      // Step 1: Back from HeldView → DetailsView
      await this.heldBackBtn.click();
      await this.nameInput.waitFor({ state: "visible", timeout: 10_000 });

      // Step 2: Back from DetailsView → SlotsView
      await this.detailsBackBtn.click();
      await this.slotsSection.waitFor({ state: "visible", timeout: 10_000 });
      await this.slotsLoadingSkeletons.first().waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});

      // Step 3: Pick the next untried slot
      slotIndex++;
      const slots = this.slotButtons;
      const count = await slots.count();
      if (slotIndex >= count) {
        throw new Error(
          `confirmWithRetry: exhausted all ${count} slot(s) on this day — all returned SLOT_UNAVAILABLE`,
        );
      }
      await slots.nth(slotIndex).click();
      await this.slotsContinueBtn.waitFor({ state: "visible", timeout: 5_000 });
      await this.slotsContinueBtn.click();

      // Step 4: Re-fill attendee details
      await this.fillAttendeeDetails(attendee);
      await this.reserveBtn.click();
      await this.heldCard.waitFor({ state: "visible", timeout: 15_000 });
    }

    throw new Error(`confirmWithRetry: did not reach ConfirmedView after ${maxAttempts} attempts`);
  }

  // ── Confirmed step ────────────────────────────────────────────────────

  async waitForConfirmed(timeout = 20_000) {
    await this.confirmedSection.waitFor({ state: "visible", timeout });
  }

  async isConfirmed(): Promise<boolean> {
    return this.confirmedSection.isVisible().catch(() => false);
  }

  async confirmedPillText(): Promise<string> {
    return this.confirmedPill.innerText().catch(() => "");
  }

  async confirmedTitleText(): Promise<string> {
    return this.confirmedTitle.innerText().catch(() => "");
  }

  async getSummaryText(): Promise<string> {
    return this.confirmedSummary.innerText().catch(() => "");
  }
}
