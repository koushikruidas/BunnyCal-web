import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export interface EventDetails {
  name: string;
  duration?: number;
  description?: string;
}

/**
 * Covers /onboarding/event — the StepShell-based multi-step wizard.
 *
 * Key selectors derived from StepShell.tsx and OnboardingEventPage.tsx:
 *  - Footer buttons: .onb-btn-primary (Continue / Publish gently), .onb-btn-secondary (← Back)
 *  - Step indicators: .onb-step[aria-current="step"]
 *  - Error: .onb-error
 *  - Success page: .onb-success  +  .onb-success-link-box
 */
export class EventWizardPage {
  readonly page: Page;

  // Step navigation (StepShell footer)
  readonly continueBtn: Locator;
  readonly backBtn: Locator;
  readonly publishBtn: Locator;

  // Step indicator
  readonly activeStep: Locator;

  // Error banner
  readonly errorMsg: Locator;

  // Step 1 — Meeting details inputs
  // Anonymous flow also requires hostEmail (#hostEmail) and hostDisplayName (#hostDisplayName)
  readonly eventNameInput: Locator;
  readonly hostEmailInput: Locator;
  readonly hostDisplayNameInput: Locator;

  // Success page (/onboarding/success)
  readonly successTitle: Locator;
  readonly bookingLinkBox: Locator;
  readonly copyLinkBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // StepShell renders exactly one .onb-btn-primary in the footer
    this.continueBtn = page.locator(".onb-footer .onb-btn-primary");
    this.backBtn = page.locator(".onb-footer .onb-btn-secondary");
    this.publishBtn = page.locator(".onb-footer .onb-btn-primary");  // same slot, last step

    this.activeStep = page.locator(".onb-step[aria-current='step']");
    this.errorMsg = page.locator(".onb-error");

    // OnboardingEventPage step 1: id="eventName" (no label wraps this input)
    this.eventNameInput = page.locator("#eventName");
    this.hostEmailInput = page.locator("#hostEmail");
    this.hostDisplayNameInput = page.locator("#hostDisplayName");

    // OnboardingSuccessPage
    this.successTitle = page.locator(".onb-success-title");
    this.bookingLinkBox = page.locator(".onb-success-link-box");
    this.copyLinkBtn = page.locator(".onb-btn-primary", { hasText: /Copy link|Copied/ });
  }

  async goto({ anonymous = false }: { anonymous?: boolean } = {}) {
    const url = anonymous
      ? "/onboarding/event?mode=anonymous&step=1&fresh=1"
      : "/onboarding/event";
    await this.page.goto(url);
  }

  /** Returns the label of the currently active step. */
  async activeStepLabel(): Promise<string> {
    return this.activeStep.locator(".label").innerText();
  }

  async fillEventName(name: string) {
    await this.eventNameInput.waitFor({ state: "visible" });
    await this.eventNameInput.fill(name);
  }

  async fillHostEmail(email: string) {
    await this.hostEmailInput.waitFor({ state: "visible" });
    await this.hostEmailInput.fill(email);
  }

  /**
   * Handles step 2 (Calendars & projection) for the authenticated flow.
   *
   * Case 1 — connected calendars exist:
   *   Enables the first availability toggle if none are on, selects the first
   *   projection calendar if none is selected, then returns so the caller can
   *   click Continue.
   *
   * Case 2 — no connected calendar:
   *   Prints instructions to the console and polls every 5 s until at least one
   *   calendar row appears (i.e. the user connected a calendar in the browser),
   *   then falls through to Case 1.
   */
  async configureCalendarsStep(waitForConnectionMs = 300_000) {
    const emptyState = this.page.locator(
      "[role='region'][aria-label='Connect a calendar provider']",
    );

    // ── Case 2: no connected calendars ────────────────────────────────────────
    const isEmptyState = await emptyState.isVisible().catch(() => false);
    if (isEmptyState) {
      console.log(
        "\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "  MANUAL ACTION REQUIRED — Step 2: Calendars & projection\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "  No calendar integration is connected for this persona.\n" +
        "\n" +
        "  Please:\n" +
        "    1. Switch to the Playwright browser window.\n" +
        "    2. Click 'Connect calendar' and complete the OAuth flow.\n" +
        "    3. Return to the onboarding wizard (step 2 will reload).\n" +
        "\n" +
        "  This test will resume automatically once a calendar appears.\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
      );

      // Poll until the empty-state disappears (a calendar row became available)
      const availToggle = this.page.locator(
        "button[role='switch'][aria-label^='Check']",
      ).first();
      await availToggle.waitFor({ state: "visible", timeout: waitForConnectionMs });
    }

    // ── Case 1: connected calendars present ───────────────────────────────────
    // Enable the first availability toggle if none are currently on.
    const availToggles = this.page.locator(
      "button[role='switch'][aria-label^='Check']",
    );
    const toggleCount = await availToggles.count();
    let anyToggleOn = false;
    for (let i = 0; i < toggleCount; i++) {
      if ((await availToggles.nth(i).getAttribute("aria-checked")) === "true") {
        anyToggleOn = true;
        break;
      }
    }
    if (!anyToggleOn && toggleCount > 0) {
      await availToggles.first().click();
    }

    // Select the first writable projection (booking destination) radio if none selected.
    const projectionRadios = this.page.locator(
      "[role='radiogroup'][aria-label='Booking destination calendar'] button[role='radio']",
    );
    const radioCount = await projectionRadios.count();
    let anyRadioSelected = false;
    for (let i = 0; i < radioCount; i++) {
      if ((await projectionRadios.nth(i).getAttribute("aria-checked")) === "true") {
        anyRadioSelected = true;
        break;
      }
    }
    if (!anyRadioSelected && radioCount > 0) {
      await projectionRadios.first().click();
    }
  }

  /** Selects a location/conferencing card by its visible name (step 3 of anonymous flow). */
  async selectLocation(name: string | RegExp) {
    await this.page.locator(".onb-radio-card").filter({ hasText: name }).click();
  }

  async clickContinue() {
    await this.continueBtn.click();
  }

  async clickBack() {
    await this.backBtn.click();
  }

  async clickPublish() {
    await this.publishBtn.click();
  }

  /**
   * Clicks Continue on every wizard step until the Publish button appears.
   *
   * Step 2 (Calendars & projection) is handled specially:
   *   - If calendars are connected, auto-enables the first availability toggle and
   *     selects the first projection calendar, then retries Continue.
   *   - If no calendar is connected, prints console instructions and waits for the
   *     user to connect one before proceeding (see configureCalendarsStep).
   */
  async advanceToPublish(stepTimeout = 10_000) {
    let safety = 10;
    let calendarStepHandled = false;

    while (safety-- > 0) {
      const label = await this.continueBtn.innerText().catch(() => "");
      if (/publish/i.test(label)) break;

      const urlBefore = this.page.url();
      await this.continueBtn.click();

      // Wait for URL to change — confirms the step advanced
      try {
        await this.page.waitForFunction(
          (before) => window.location.href !== before,
          urlBefore,
          { timeout: stepTimeout },
        );
      } catch {
        // URL unchanged: step validation blocked the advance.
        // Step 2 is the only step that may legitimately need intervention.
        if (this.page.url().includes("step=2") && !calendarStepHandled) {
          calendarStepHandled = true;
          await this.configureCalendarsStep();
          // Don't consume a safety count — loop back and re-click Continue
          safety++;
          continue;
        }
        const err = await this.errorMsg.innerText().catch(() => "");
        throw new Error(
          `advanceToPublish: step did not advance.\n  URL: ${this.page.url()}\n  Wizard error: ${err || "(none)"}`,
        );
      }

      // Brief settle after React re-render following navigation
      await this.page.waitForTimeout(300);
    }
  }

  async waitForSuccessPage(timeout = 15_000) {
    await this.successTitle.waitFor({ state: "visible", timeout });
  }

  /** Returns the booking link shown on the success page. */
  async getBookingLink(): Promise<string> {
    await this.waitForSuccessPage();
    return this.bookingLinkBox.innerText();
  }

  async isOnSuccessPage(): Promise<boolean> {
    return this.page.url().includes("/onboarding/success");
  }

  async hasError(): Promise<boolean> {
    return this.errorMsg.isVisible().catch(() => false);
  }

  async errorText(): Promise<string> {
    return this.errorMsg.innerText().catch(() => "");
  }

  /** Waits until the Continue button is enabled (step is complete). */
  async waitForContinueEnabled(timeout = 5_000) {
    await expect(this.continueBtn).toBeEnabled({ timeout });
  }
}
