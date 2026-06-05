import { test, expect, assertAuthStateReady, PERSONAS } from "../fixtures";
import { createUniqueEvent } from "../helpers/appHelpers";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

function nextWeekday(from: Date, targetDay: number) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const delta = (targetDay - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function nextWeekdayNotWeekend(from: Date, targetDay: number) {
  const day = targetDay === 0 || targetDay === 6 ? 1 : targetDay;
  return nextWeekday(from, day);
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function humanDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function toMinutes(timeLabel: string) {
  const match = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) throw new Error(`Unable to parse slot label: ${timeLabel}`);
  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minutes;
}

test.describe("Availability rules coverage", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test.beforeEach(async ({ availabilityPage }) => {
    await availabilityPage.goto();
    await availabilityPage.page.waitForURL(/\/dashboard\/availability/, { timeout: 20_000 });
    await availabilityPage.removeAllOverrides();
    await availabilityPage.setDayRule("Monday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Tuesday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Wednesday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Thursday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Friday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Saturday", { enabled: false });
    await availabilityPage.setDayRule("Sunday", { enabled: false });
    await availabilityPage.saveWeeklyRules();
  });

  test.afterEach(async ({ availabilityPage }) => {
    await availabilityPage.goto();
    await availabilityPage.page.waitForURL(/\/dashboard\/availability/, { timeout: 20_000 });
    await availabilityPage.removeAllOverrides();
    await availabilityPage.setDayRule("Monday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Tuesday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Wednesday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Thursday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Friday", { enabled: true, startTime: "09:00", endTime: "17:00" });
    await availabilityPage.setDayRule("Saturday", { enabled: false });
    await availabilityPage.setDayRule("Sunday", { enabled: false });
    await availabilityPage.saveWeeklyRules();
  });

  async function publishEvent({ eventWizardPage }: { eventWizardPage: any }) {
    const eventName = createUniqueEvent("E2E Availability");
    await eventWizardPage.goto();
    await eventWizardPage.fillEventName(eventName);
    await eventWizardPage.advanceToPublish();
    await eventWizardPage.clickPublish();
    await eventWizardPage.waitForSuccessPage();
    const link = await eventWizardPage.getBookingLink();
    return {
      eventName,
      bookingUrl: link.startsWith("http") ? link : `${BASE_URL}${link}`,
    };
  }

  test("blocked date override removes slots while neighboring date remains bookable", async ({
    availabilityPage,
    eventWizardPage,
    context,
  }) => {
    const blockedDate = nextWeekdayNotWeekend(new Date(), 1);
    const neighborDate = nextWeekday(blockedDate, 2);

    await test.step("Host: configure blocked date and publish event", async () => {
      await availabilityPage.goto();
      await availabilityPage.waitForReady();
      await availabilityPage.addUnavailableOverride(isoDate(blockedDate));
      console.log(`[availability:block] Blocked date used: ${humanDate(blockedDate)} (${isoDate(blockedDate)})`);
    });

    const { bookingUrl } = await publishEvent({ eventWizardPage });
    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const bookingPage = new (await import("../pages/BookingPage")).BookingPage(guestPage);

    await test.step("Guest: inspect blocked and neighboring dates", async () => {
      await guestPage.goto(bookingUrl);
      await bookingPage.waitUntilEventBookable({ bookingUrl, timeoutMs: 60_000, perDayMs: 4_000 });

      await bookingPage.selectActiveDay(blockedDate.getDate());
      const blockedSlots = await bookingPage.visibleSlotLabels();
      const blockedBehavior = (await bookingPage.emptyStateText()) || `slot-count=${blockedSlots.length}`;
      console.log(`[availability:block] Booking page behavior on blocked date: ${blockedBehavior}`);
      expect(blockedSlots.length).toBe(0);
      expect(blockedBehavior).toMatch(/No times available|Try another date|slot-count=0/i);

      await bookingPage.selectActiveDay(neighborDate.getDate());
      await bookingPage.waitForSlots();
      const neighborSlots = await bookingPage.visibleSlotLabels();
      expect(neighborSlots.length).toBeGreaterThan(0);
    });

    await guestContext.close();
  });

  test("custom weekly hours constrain visible Monday and Tuesday slots", async ({
    availabilityPage,
    eventWizardPage,
    context,
    page,
  }) => {
    const monday = nextWeekday(new Date(), 1);
    const tuesday = nextWeekday(monday, 2);

    await test.step("Host: configure custom hours and publish event", async () => {
      const hostSaveRequests: Array<{ url: string; method: string; postData?: string | null }> = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/availability/rules/bulk")) {
          hostSaveRequests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData(),
          });
        }
      });

      await availabilityPage.goto();
      await availabilityPage.waitForReady();
      await availabilityPage.removeAllOverrides();
      await availabilityPage.setDayRule("Monday", { enabled: true, startTime: "06:00", endTime: "22:00" });
      await availabilityPage.setDayRule("Tuesday", { enabled: true, startTime: "14:00", endTime: "20:00" });
      await availabilityPage.setDayRule("Wednesday", { enabled: false });
      await availabilityPage.setDayRule("Thursday", { enabled: false });
      await availabilityPage.setDayRule("Friday", { enabled: false });
      await availabilityPage.setDayRule("Saturday", { enabled: false });
      await availabilityPage.setDayRule("Sunday", { enabled: false });
      await availabilityPage.saveWeeklyRules();
      console.log(`[availability:hours] Host save requests: ${JSON.stringify(hostSaveRequests, null, 2)}`);

      const readback = await page.request.get("/api/availability/rules");
      const readbackText = await readback.text();
      console.log(`[availability:hours] Rules readback status: ${readback.status()}`);
      console.log(`[availability:hours] Rules readback body: ${readbackText}`);
    });

    const { bookingUrl } = await publishEvent({ eventWizardPage });
    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const bookingPage = new (await import("../pages/BookingPage")).BookingPage(guestPage);

    await test.step("Guest: validate Monday and Tuesday slot windows", async () => {
      await guestPage.goto(bookingUrl);
      await bookingPage.waitUntilEventBookable({ bookingUrl, timeoutMs: 60_000, perDayMs: 4_000 });

      await bookingPage.selectActiveDay(monday.getDate());
      const mondaySlots = await bookingPage.visibleSlotLabels();
      console.log(`[availability:hours] Monday slots detected: ${JSON.stringify(mondaySlots)}`);
      const mondayResponse = await guestPage.request.get(
        `${bookingUrl.replace(/\/$/, "")}/availability?date=${isoDate(monday)}`,
      );
      console.log(`[availability:hours] Monday availability status: ${mondayResponse.status()}`);
      console.log(`[availability:hours] Monday availability body: ${await mondayResponse.text()}`);
      expect(mondaySlots.length).toBeGreaterThan(0);
      expect(mondaySlots.every((slot) => {
        const minutes = toMinutes(slot);
        return minutes >= 6 * 60 && minutes < 22 * 60;
      })).toBe(true);

      await bookingPage.selectActiveDay(tuesday.getDate());
      const tuesdaySlots = await bookingPage.visibleSlotLabels();
      console.log(`[availability:hours] Tuesday slots detected: ${JSON.stringify(tuesdaySlots)}`);
      const tuesdayResponse = await guestPage.request.get(
        `${bookingUrl.replace(/\/$/, "")}/availability?date=${isoDate(tuesday)}`,
      );
      console.log(`[availability:hours] Tuesday availability status: ${tuesdayResponse.status()}`);
      console.log(`[availability:hours] Tuesday availability body: ${await tuesdayResponse.text()}`);
      expect(tuesdaySlots.length).toBeGreaterThan(0);
      expect(tuesdaySlots.every((slot) => {
        const minutes = toMinutes(slot);
        return minutes >= 14 * 60 && minutes < 20 * 60;
      })).toBe(true);
    });

    await guestContext.close();
  });

  test("no weekly availability produces the public empty state and blocks booking progression", async ({
    availabilityPage,
    eventWizardPage,
    context,
  }) => {
    const monday = nextWeekday(new Date(), 1);

    await test.step("Host: remove all availability and publish event", async () => {
      await availabilityPage.goto();
      await availabilityPage.waitForReady();
      await availabilityPage.removeAllOverrides();
      await availabilityPage.setDayRule("Monday", { enabled: false });
      await availabilityPage.setDayRule("Tuesday", { enabled: false });
      await availabilityPage.setDayRule("Wednesday", { enabled: false });
      await availabilityPage.setDayRule("Thursday", { enabled: false });
      await availabilityPage.setDayRule("Friday", { enabled: false });
      await availabilityPage.setDayRule("Saturday", { enabled: false });
      await availabilityPage.setDayRule("Sunday", { enabled: false });
      await availabilityPage.saveWeeklyRules();
    });

    const { bookingUrl } = await publishEvent({ eventWizardPage });
    const guestContext = await context.browser()!.newContext();
    const guestPage = await guestContext.newPage();
    const bookingPage = new (await import("../pages/BookingPage")).BookingPage(guestPage);

    await test.step("Guest: confirm empty-state booking behavior", async () => {
      await guestPage.goto(bookingUrl);
      await bookingPage.selectActiveDay(monday.getDate());
      await bookingPage.waitForSlotsPanelSettled();

      const slotCount = await bookingPage.slotButtons.count();
      const emptyState = await bookingPage.emptyStateText();
      console.log(`[availability:none] Empty-state message: ${emptyState}`);
      console.log(`[availability:none] Slot count: ${slotCount}`);

      expect(slotCount).toBe(0);
      expect(emptyState).toMatch(/No times available|Try another date/i);
      await expect(bookingPage.slotsContinueBtn).toBeDisabled();
    });

    await guestContext.close();
  });
});
