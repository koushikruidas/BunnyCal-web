import { test, expect, assertAuthStateReady, PERSONAS } from "../fixtures";
import { createUniqueAttendee, createUniqueEvent } from "../helpers/appHelpers";
import { BookingPage } from "../pages/BookingPage";
import { GuestManageBookingPage } from "../pages/GuestManageBookingPage";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

test.describe("Booking lifecycle: cancel", () => {
  test.setTimeout(90_000);

  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("guest can cancel a newly booked event and reaches the cancelled terminal state", async ({
    page,
    context,
    eventWizardPage,
  }) => {
    const eventName = createUniqueEvent("E2E Cancel");
    const attendee = createUniqueAttendee("E2E Cancel Guest");

    await test.step("Host: create and publish a new event", async () => {
      await eventWizardPage.goto();
      await eventWizardPage.fillEventName(eventName);
      await eventWizardPage.advanceToPublish();
      await eventWizardPage.clickPublish();
      await expect(page).toHaveURL(/\/onboarding\/success/, { timeout: 20_000 });
      await eventWizardPage.waitForSuccessPage();
    });

    const bookingLink = await test.step("Host: capture public booking link", async () => {
      const link = await eventWizardPage.getBookingLink();
      expect(link).toBeTruthy();
      return link.startsWith("http") ? link : `${BASE_URL}${link}`;
    });

    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const guestBookingPage = new BookingPage(guestPage);
    const managePage = new GuestManageBookingPage(guestPage);

    let bookingId = "";
    let originalSlot = "";
    let manageUrl = "";
    let finalStatus = "";
    let cancelResponsePayload = "";

    await test.step("Guest: book the event and capture the manage URL", async () => {
      await guestPage.goto(bookingLink);

      const ready = await guestBookingPage.waitUntilEventBookable({
        bookingUrl: bookingLink,
        timeoutMs: 60_000,
        perDayMs: 4_000,
      });
      expect(ready, "Expected at least one bookable slot for the newly published event").not.toBeNull();

      await guestBookingPage.selectFirstAvailableSlot();
      await expect(guestBookingPage.slotsContinueBtn).toBeEnabled({ timeout: 5_000 });
      await guestBookingPage.clickSlotsContinue();
      await guestBookingPage.fillAttendeeDetails(attendee);
      await guestBookingPage.clickReserve();
      await guestBookingPage.waitForHeldCard();
      await guestBookingPage.confirmWithRetry(attendee);
      await guestBookingPage.waitForConfirmed();

      originalSlot = await guestBookingPage.getSummaryText();
      const manageHref = await guestPage.locator("a", { hasText: /Manage booking/i }).getAttribute("href");
      manageUrl = manageHref ?? "";
      expect(manageUrl).toContain("/manage/");

      const absoluteManageUrl = manageUrl.startsWith("http") ? manageUrl : `${BASE_URL}${manageUrl}`;
      const parsed = new URL(absoluteManageUrl);
      bookingId = parsed.pathname.split("/").filter(Boolean).pop() ?? "";

      console.log(`[cancel] Original booking ID: ${bookingId}`);
      console.log(`[cancel] Original slot: ${originalSlot}`);
    });

    await test.step("Guest: open manage page and confirm cancellation", async () => {
      const finalManageUrl = manageUrl.startsWith("http") ? manageUrl : `${BASE_URL}${manageUrl}`;

      const cancelResponsePromise = guestPage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/book/${bookingId}/cancel`),
      );

      await guestPage.goto(finalManageUrl);
      await managePage.waitForSummary();
      await managePage.cancelButton.click();
      await managePage.waitForCancelDialog();
      await managePage.confirmCancel();

      const cancelResponse = await cancelResponsePromise;
      cancelResponsePayload = await cancelResponse.text().catch(() => "");
      console.log(`[cancel] Cancel response payload: ${cancelResponsePayload}`);

      expect(cancelResponse.ok()).toBe(true);
      await managePage.waitForCancelled();
    });

    await test.step("Assert: cancelled terminal state is shown and actions are no longer available", async () => {
      await expect(managePage.terminalSubtitle).toContainText(/notified your host|book another time/i);

      finalStatus = await managePage.statusValue.innerText();
      console.log(`[cancel] Final booking status: ${finalStatus}`);

      expect(finalStatus).toMatch(/^CANCELLED$/i);
      if (cancelResponsePayload) {
        expect(cancelResponsePayload).toMatch(/CANCELLED|CANCELED/i);
      }

      await expect(managePage.rescheduleButton).toHaveCount(0);
      await expect(managePage.cancelButton).toHaveCount(0);
      await expect(guestPage.locator(".bk-confirmed-actions").getByRole("link", { name: /Book another time/i })).toBeVisible();
    });

    await guestContext.close();
  });
});
