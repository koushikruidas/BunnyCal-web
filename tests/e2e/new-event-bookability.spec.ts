/**
 * New-event bookability investigation
 *
 * Goal: determine whether a newly published event type becomes bookable within
 * 60 seconds, and record the exact timing of each readiness milestone.
 *
 * This test is intentionally separate from golden-path.spec.ts.  The smoke
 * test (golden-path) is not modified and remains the canonical passing test.
 *
 * Persona requirement: google-host.json (same as golden-path)
 *   Authenticated user with at least one connected calendar.
 *
 * Run:
 *   npx playwright test new-event-bookability --project=google-host
 */

import * as fs from "fs";
import * as path from "path";
import { test, expect, assertAuthStateReady, PERSONAS } from "./fixtures";
import { createUniqueEvent, createUniqueAttendee } from "./helpers/appHelpers";
import { BookingPage } from "./pages/BookingPage";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

// ── Timing helpers ────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString();
}

function elapsed(from: number) {
  return `${((Date.now() - from) / 1000).toFixed(1)}s`;
}

// ── Network failure capture ───────────────────────────────────────────────────

interface NetworkFailure {
  url: string;
  status: number;
  body: string;
  timestamp: string;
}

test.describe("New-event bookability: does a freshly published event become bookable within 60 s?", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("create event → poll until bookable (≤60 s) → complete full booking flow", async ({
    page,
    eventWizardPage,
    context,
  }) => {
    // ── Milestones object (printed at end) ───────────────────────────────────
    const milestones: Record<string, string> = {};
    const networkFailures: NetworkFailure[] = [];

    // ── Phase 1: Create and publish new event ─────────────────────────────────

    const eventName = createUniqueEvent("E2E Bookability");

    await test.step("Host: create and publish new event", async () => {
      await eventWizardPage.goto();
      await expect(page.locator(".onb-step[aria-current='step'] .label")).toHaveText(
        /Meeting details/i,
        { timeout: 10_000 },
      );

      await eventWizardPage.fillEventName(eventName);
      await eventWizardPage.advanceToPublish();

      milestones["publish_click"] = ts();
      await eventWizardPage.clickPublish();
      await expect(page).toHaveURL(/\/onboarding\/success/, { timeout: 20_000 });
      await eventWizardPage.waitForSuccessPage();
      milestones["publish_confirmed"] = ts();

      const rawLink = await eventWizardPage.getBookingLink();
      expect(rawLink, "booking link must be present on success page").toBeTruthy();

      const bookingUrl = rawLink.startsWith("http")
        ? rawLink
        : `${BASE_URL}${rawLink}`;

      console.log(`\n[bookability] Event name   : ${eventName}`);
      console.log(`[bookability] Booking URL  : ${bookingUrl}`);
      console.log(`[bookability] Published at : ${milestones["publish_confirmed"]}\n`);

      // Store on test info for access in later steps (closure)
      (test as any)._bookingUrl = bookingUrl;
    });

    const bookingUrl: string = (test as any)._bookingUrl;

    // ── Phase 2: Guest context — poll for bookability ─────────────────────────

    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const guestBooking = new BookingPage(guestPage);

    // Capture availability-related network failures for evidence
    guestPage.on("response", async (response) => {
      const url = response.url();
      if (!url.includes("availability") && !url.includes("slots") && !url.includes("public")) return;
      const status = response.status();
      if (status >= 400) {
        const body = await response.text().catch(() => "(unreadable)");
        networkFailures.push({ url, status, body, timestamp: ts() });
      }
    });

    let readinessResult: { dayIndex: number; slotCount: number; elapsedMs: number } | null = null;

    await test.step("Guest: open booking page and record first load time", async () => {
      milestones["guest_page_open"] = ts();
      await guestPage.goto(bookingUrl, { waitUntil: "domcontentloaded" });
      await guestBooking.slotsSection.waitFor({ state: "visible", timeout: 15_000 });
      milestones["guest_page_loaded"] = ts();
      console.log(`[bookability] Booking page first load: ${milestones["guest_page_loaded"]}`);
    });

    await test.step("Guest: poll until at least one bookable slot appears (max 60 s)", async () => {
      readinessResult = await guestBooking.waitUntilEventBookable({
        bookingUrl,
        timeoutMs: 60_000,
        perDayMs: 4_000,
        retryIntervalMs: 5_000,
        maxDaysPerScan: 14,
        onProgress: (msg) => console.log(msg),
      });

      if (readinessResult) {
        milestones["first_slot_detected"] = ts();
        milestones["elapsed_until_bookable"] = `${(readinessResult.elapsedMs / 1000).toFixed(1)}s`;
        console.log(
          `\n[bookability] First slot detected!\n` +
          `  Day index    : ${readinessResult.dayIndex}\n` +
          `  Slot count   : ${readinessResult.slotCount}\n` +
          `  Elapsed      : ${readinessResult.elapsedMs / 1000}s after publish\n`,
        );
      } else {
        milestones["first_slot_detected"] = "NEVER (60 s timeout)";
      }
    });

    // ── Phase 3: Evidence dump if not bookable ────────────────────────────────

    if (!readinessResult) {
      await test.step("Evidence: capture screenshot and network failures", async () => {
        const screenshotPath = path.join(
          process.cwd(),
          "test-results",
          `bookability-timeout-${Date.now()}.png`,
        );
        await guestPage.screenshot({ path: screenshotPath, fullPage: true });

        const evidencePath = path.join(
          process.cwd(),
          "test-results",
          `bookability-evidence-${Date.now()}.json`,
        );
        const evidence = {
          bookingUrl,
          eventName,
          milestones,
          networkFailures,
          screenshotPath,
          calendarHtml: await guestPage.locator(".bk-cal-grid").innerHTML().catch(() => "(not found)"),
          slotPanelHtml: await guestPage.locator(".bk-slot-panel").innerHTML().catch(() => "(not found)"),
        };
        fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
        fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("  BOOKABILITY TIMEOUT — event did not become bookable in 60s");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`  Booking URL    : ${bookingUrl}`);
        console.log(`  Screenshot     : ${screenshotPath}`);
        console.log(`  Evidence JSON  : ${evidencePath}`);
        console.log(`\n  Network failures (${networkFailures.length}):`);
        for (const f of networkFailures) {
          console.log(`    [${f.status}] ${f.url}`);
          console.log(`      body: ${f.body.slice(0, 300)}`);
        }
        console.log("\n  Milestones:");
        for (const [k, v] of Object.entries(milestones)) {
          console.log(`    ${k.padEnd(28)} ${v}`);
        }
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      });

      await guestContext.close();
      throw new Error(
        `New event "${eventName}" at ${bookingUrl} did not become bookable within 60 s.\n` +
        `See test-results/ for screenshot and network evidence.`,
      );
    }

    // ── Phase 4: Complete the full booking flow on the newly created event ────

    const attendee = createUniqueAttendee("E2E Bookability");

    // waitUntilEventBookable left the page on the day that had slots —
    // the first active slot button is already the right one to click.

    await test.step("Guest: select slot on the first bookable day", async () => {
      await guestBooking.slotButtons.first().click();
      await expect(guestBooking.slotsContinueBtn).toBeEnabled({ timeout: 5_000 });
      await guestBooking.clickSlotsContinue();
    });

    await test.step("Guest: fill attendee details", async () => {
      await guestBooking.waitForDetailsForm();
      await guestBooking.fillAttendeeDetails(attendee);
    });

    await test.step("Guest: reserve slot and reach held state", async () => {
      await guestBooking.clickReserve();
      await guestBooking.waitForHeldCard();
      milestones["slot_held"] = ts();
    });

    await test.step("Guest: confirm booking", async () => {
      await guestBooking.confirmWithRetry(attendee);
      milestones["booking_confirmed"] = ts();
    });

    await test.step("Assert: confirmation page shows correct event and attendee", async () => {
      const pill = await guestBooking.confirmedPillText();
      expect(pill).toMatch(/Confirmed/i);

      const summary = await guestBooking.getSummaryText();
      expect(summary).toContain(eventName);

      const heroText = await guestPage.locator(".bk-success-hero").innerText().catch(() => "");
      if (heroText) expect(heroText).toContain(attendee.email);
    });

    // ── Final milestone summary ───────────────────────────────────────────────

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  BOOKABILITY MILESTONES");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    for (const [k, v] of Object.entries(milestones)) {
      console.log(`  ${k.padEnd(28)} ${v}`);
    }
    console.log(`\n  Network failures during polling: ${networkFailures.length}`);
    for (const f of networkFailures) {
      console.log(`    [${f.status}] ${f.url} — ${f.body.slice(0, 200)}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await guestContext.close();
  });
});
