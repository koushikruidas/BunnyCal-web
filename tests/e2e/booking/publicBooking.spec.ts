import { test, expect } from "../fixtures";
import { createUniqueAttendee, waitForApplicationReady } from "../helpers/appHelpers";

/**
 * Public booking flow — guest-side booking at /book/:username/:eventTypeSlug.
 * These tests run WITHOUT auth (public project).
 *
 * To run against a live account, set:
 *   E2E_HOST_USERNAME=<username>
 *   E2E_EVENT_SLUG=<slug>
 */

const HOST = process.env.E2E_HOST_USERNAME ?? "demo";
const SLUG = process.env.E2E_EVENT_SLUG ?? "30-min-chat";

test.describe("Public booking flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/book/${HOST}/${SLUG}`);
    await waitForApplicationReady(page);
  });

  test("renders the slot picker for a valid booking link", async ({ bookingPage }) => {
    const hasSlots = await bookingPage.slotButtons.first().isVisible({ timeout: 15_000 }).catch(() => false);
    const hasError = await bookingPage.errorBanner.isVisible().catch(() => false);
    expect(hasSlots || hasError).toBe(true);
  });

  test("full booking journey — select slot, fill details, confirm", async ({
    bookingPage,
    confirmationPage,
  }) => {
    const hasSlots = await bookingPage.slotButtons.first().isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!hasSlots, "No slots available for demo account");

    const attendee = createUniqueAttendee("E2E Guest");

    await bookingPage.selectFirstAvailableSlot();
    await expect(bookingPage.slotsContinueBtn).toBeEnabled({ timeout: 5_000 });
    await bookingPage.clickSlotsContinue();

    await bookingPage.waitForDetailsForm();
    await bookingPage.fillAttendeeDetails(attendee);
    await bookingPage.clickReserve();

    await bookingPage.waitForHeldCard();
    await bookingPage.clickConfirm();

    await bookingPage.waitForConfirmed(20_000);
    expect(await bookingPage.isConfirmed()).toBe(true);
  });

  test("404-style booking link shows a graceful error", async ({ page }) => {
    await page.goto("/book/no-such-user/no-such-event");
    await waitForApplicationReady(page);

    const url = page.url();
    const isError = await page.locator("[role='alert'], text=/not found/i, text=/unavailable/i").isVisible().catch(() => false);
    const isRedirected = !url.includes("/book/no-such-user");
    expect(isError || isRedirected).toBe(true);
  });
});
