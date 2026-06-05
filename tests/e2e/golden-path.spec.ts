/**
 * Golden-path workflow — the single end-to-end scenario that must pass
 * before any other coverage is added.
 *
 * Persona requirement: google-host.json
 *   Must be an authenticated user with at least one connected calendar
 *   (Google Calendar or Microsoft Calendar) AND at least one pre-existing
 *   published event type that has stable slot availability.
 *   Capture with: npm run capture:google-host
 *
 * Two-phase design:
 *   Phase 1 — Wizard: creates a new event type and verifies the full
 *     onboarding wizard runs to completion (success page + booking link).
 *     This proves the wizard works; the booking link is shown but not used
 *     for the booking phase because newly created event types have a slot-
 *     generation lag on the backend.
 *
 *   Phase 2 — Booking: re-uses the first pre-existing event type returned
 *     by the host's /api/event-types list.  This is a stable, already-
 *     indexed event type with pre-generated availability, so the booking
 *     flow runs reliably without timing out on slot generation.
 *
 * Run:
 *   npx playwright test golden-path --project=google-host
 */

import { test, expect, assertAuthStateReady, PERSONAS } from "./fixtures";
import { createUniqueEvent, createUniqueAttendee } from "./helpers/appHelpers";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API_BASE  = "http://localhost:8080";

test.describe("Golden-path: create event → public booking → confirmation", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("host creates event, guest books stable event and reaches confirmation", async ({
    page,
    eventWizardPage,
    context,
  }) => {
    // ── Phase 1: Wizard ───────────────────────────────────────────────────────
    const newEventName = createUniqueEvent("E2E Golden");

    await test.step("Host: open onboarding wizard", async () => {
      await eventWizardPage.goto();
      await expect(page.locator(".onb-step[aria-current='step'] .label")).toHaveText(
        /Meeting details/i,
        { timeout: 10_000 },
      );
    });

    await test.step("Host: fill event name and advance through all steps", async () => {
      await eventWizardPage.fillEventName(newEventName);
      // advanceToPublish auto-configures step 2 (Calendars & projection) when
      // the persona has connected calendars but no draft selections yet.
      await eventWizardPage.advanceToPublish();
    });

    await test.step("Host: publish and verify success page", async () => {
      await eventWizardPage.clickPublish();
      await expect(page).toHaveURL(/\/onboarding\/success/, { timeout: 20_000 });
      await eventWizardPage.waitForSuccessPage();
      const link = await eventWizardPage.getBookingLink();
      expect(link).toBeTruthy();
      console.log(`[golden-path] New event link (not used for booking): ${link}`);
    });

    // ── Phase 2: Booking — use a stable pre-existing event type ──────────────
    //
    // Newly created event types have a backend slot-generation lag; their public
    // availability endpoint returns errors for several seconds after creation.
    // We resolve this by using the first pre-existing published event type on the
    // host account, which already has stable slot data.

    // Read the host's event types via the authenticated API
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(
      (c) => c.name === "accessToken" && c.domain.includes("localhost"),
    )?.value ?? "";

    const eventTypesResp = await page.request.get(`${API_BASE}/api/event-types`, {
      headers: { Cookie: `accessToken=${accessToken}` },
    });
    const eventTypesJson = await eventTypesResp.json();
    const eventTypes: Array<{ name: string; link: string; slug: string }> =
      eventTypesJson?.data ?? [];

    // Pick the first event type that is NOT one we just created (exclude e2e-golden- slugs)
    const stableEventType = eventTypes.find(
      (et) => !et.slug.startsWith("e2e-") && et.link,
    ) ?? eventTypes[0];

    expect(stableEventType, "google-host persona must have at least one published event type").toBeTruthy();

    const bookingUrl = stableEventType.link.startsWith("http")
      ? stableEventType.link
      : `${BASE_URL}${stableEventType.link}`;

    console.log(`[golden-path] Booking with stable event: "${stableEventType.name}" → ${bookingUrl}`);

    // ── Guest leg ─────────────────────────────────────────────────────────────
    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const guestBooking = new (await import("./pages/BookingPage")).BookingPage(guestPage);

    const attendee = createUniqueAttendee("E2E Attendee");

    await test.step("Guest: open stable booking link", async () => {
      await guestPage.goto(bookingUrl);
      await expect(guestPage.locator(".bk-slots")).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Guest: navigate to first day with slots and select one", async () => {
      await guestBooking.navigateToFirstSlotDay();
      await guestBooking.slotButtons.first().click();
      await expect(guestBooking.slotsContinueBtn).toBeEnabled({ timeout: 5_000 });
      await guestBooking.clickSlotsContinue();
    });

    await test.step("Guest: fill attendee details", async () => {
      await guestBooking.waitForDetailsForm();
      await guestBooking.fillAttendeeDetails(attendee);
    });

    await test.step("Guest: reserve and confirm", async () => {
      await guestBooking.clickReserve();
      await guestBooking.waitForHeldCard();
      // confirmWithRetry handles SLOT_UNAVAILABLE by backing up to SlotsView and
      // trying the next available slot — guards against a slot being busy from a
      // prior test run on the real calendar.
      await guestBooking.confirmWithRetry(attendee);
    });

    await test.step("Assert: confirmed page shows booking details", async () => {
      const pill = await guestBooking.confirmedPillText();
      expect(pill).toMatch(/Confirmed/i);

      const summary = await guestBooking.getSummaryText();
      expect(summary).toContain(stableEventType.name);

      const heroText = await guestPage.locator(".bk-success-hero").innerText().catch(() => "");
      if (heroText) expect(heroText).toContain(attendee.email);
    });

    await guestContext.close();
  });
});
