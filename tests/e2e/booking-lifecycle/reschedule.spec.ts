import { test, expect, assertAuthStateReady, PERSONAS } from "../fixtures";
import { createUniqueAttendee, createUniqueEvent } from "../helpers/appHelpers";
import { BookingPage } from "../pages/BookingPage";
import { GuestManageBookingPage } from "../pages/GuestManageBookingPage";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

test.describe("Booking lifecycle: reschedule", () => {
  test.setTimeout(90_000);

  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("guest can reschedule a newly booked event to a different slot", async ({
    page,
    context,
    eventWizardPage,
  }) => {
    const eventName = createUniqueEvent("E2E Reschedule");
    const attendee = createUniqueAttendee("E2E Reschedule Guest");

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

    let originalSummary = "";
    let capturedManageUrl = "";
    let finalManageUrl = "";
    let reviewCurrent = "";
    let reviewNew = "";
    const attemptedRescheduleSlots = new Set<string>();
    const rescheduleTraffic: Array<{
      method: string;
      url: string;
      status?: number;
      responseBody?: string;
      failureText?: string;
    }> = [];

    guestPage.on("requestfailed", (request) => {
      if (!request.url().includes("/reschedule")) return;
      rescheduleTraffic.push({
        method: request.method(),
        url: request.url(),
        failureText: request.failure()?.errorText,
      });
    });

    guestPage.on("response", async (response) => {
      if (!response.url().includes("/reschedule")) return;
      let responseBody = "";
      try {
        responseBody = await response.text();
      } catch {
        responseBody = "<unreadable>";
      }
      rescheduleTraffic.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
        responseBody,
      });
    });

    await test.step("Guest: book the event and capture the manage URL", async () => {
      console.log(`[reschedule] Original booking URL: ${bookingLink}`);
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

      originalSummary = await guestBookingPage.getSummaryText();
      capturedManageUrl = await guestPage.locator("a", { hasText: /Manage booking/i }).getAttribute("href") ?? "";
      expect(capturedManageUrl).toContain("/manage/");
      console.log(`[reschedule] Captured manage URL: ${capturedManageUrl}`);
    });

    await test.step("Guest: open manage page and select a different slot", async () => {
      finalManageUrl = capturedManageUrl.startsWith("http") ? capturedManageUrl : `${BASE_URL}${capturedManageUrl}`;
      console.log(`[reschedule] Final manage URL used: ${finalManageUrl}`);

      await guestPage.goto(finalManageUrl);
      await managePage.waitForSummary();
      await managePage.openReschedule();
      await managePage.waitForRescheduleView();
      const selectedSlot = await managePage.selectNextAvailableSlot(attemptedRescheduleSlots);
      attemptedRescheduleSlots.add(selectedSlot);
      console.log(`[reschedule] Selected reschedule slot: ${selectedSlot}`);
      await expect(managePage.reviewNewTimeButton).toBeEnabled({ timeout: 5_000 });
      await managePage.continueToReview();
    });

    await test.step("Guest: confirm reschedule", async () => {
      reviewCurrent = await managePage.reviewedCurrentTimeText();
      reviewNew = await managePage.reviewedNewTimeText();

      expect(reviewCurrent).not.toEqual(reviewNew);
      expect(originalSummary).toContain(eventName);

      let rescheduled = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        const responsePromise = guestPage.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes("/reschedule"),
        );

        await managePage.confirmReschedule();
        const response = await responsePromise;
        const responseText = await response.text().catch(() => "");

        if (response.ok()) {
          rescheduled = true;
          break;
        }

        if (response.status() !== 409 || !responseText.includes("SLOT_UNAVAILABLE")) {
          console.log(`[reschedule] Non-retriable reschedule failure: ${response.status()} ${responseText}`);
          break;
        }

        console.log(`[reschedule] SLOT_UNAVAILABLE on attempt ${attempt + 1}, trying another slot`);
        await guestPage.getByRole("button", { name: /^Back$/ }).click();
        const selectedSlot = await managePage.selectNextAvailableSlot(attemptedRescheduleSlots);
        attemptedRescheduleSlots.add(selectedSlot);
        console.log(`[reschedule] Retrying with slot: ${selectedSlot}`);
        await expect(managePage.reviewNewTimeButton).toBeEnabled({ timeout: 5_000 });
        await managePage.continueToReview();
      }

      console.log(`[reschedule] URL after submit: ${guestPage.url()}`);
      console.log(`[reschedule] Reschedule traffic: ${JSON.stringify(rescheduleTraffic, null, 2)}`);
      expect(rescheduled, "Expected reschedule to succeed after retrying alternate slots").toBe(true);
      await managePage.waitForRescheduled();
    });

    await test.step("Assert: terminal state shows the booking moved", async () => {
      await expect(guestPage.locator(".bk-confirmed-sub")).toContainText(/updated|new time/i);
    });

    await guestContext.close();
  });
});
