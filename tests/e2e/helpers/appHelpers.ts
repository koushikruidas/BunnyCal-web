import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// ── Application readiness ────────────────────────────────────────────────────

/**
 * Waits until the app has finished its initial auth hydration and is rendering
 * real content (not the "Checking session…" splash).
 */
export async function waitForApplicationReady(page: Page, timeout = 20_000) {
  // The ProtectedRoute renders this while hydrating auth
  await expect(page.locator("text=Checking session…")).not.toBeVisible({ timeout });
  // Wait for any global API loader to settle
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {
    // networkidle can be flaky with polling — tolerate a timeout here
  });
}

// ── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Waits for the page URL to change to a path matching `pattern`.
 * Uses polling so it tolerates client-side navigation without a full reload.
 */
export async function waitForRedirect(
  page: Page,
  pattern: string | RegExp,
  timeout = 15_000,
) {
  await expect(page).toHaveURL(pattern, { timeout });
}

/**
 * Waits for an OAuth popup/redirect to complete and land back on the app.
 * Call this immediately after clicking a provider's "Connect" button.
 * In Assisted Mode the user will complete the OAuth flow in the browser;
 * in Automated Mode the backend stub auto-approves it.
 */
export async function waitForOAuthCompletion(page: Page, timeout = 120_000) {
  // The app strips `?accessToken=` and navigates to the post-login path
  await page.waitForFunction(
    () => !window.location.search.includes("accessToken"),
    { timeout },
  );
  await waitForApplicationReady(page, 15_000);
}

// ── Event helpers ────────────────────────────────────────────────────────────

let eventCounter = 0;

/** Returns a unique event name suitable for a test run. */
export function createUniqueEvent(base = "Test Meeting"): string {
  eventCounter += 1;
  return `${base} ${Date.now()}-${eventCounter}`;
}

// ── Attendee helpers ─────────────────────────────────────────────────────────

let attendeeCounter = 0;

export interface UniqueAttendee {
  name: string;
  email: string;
}

/** Returns a unique attendee that will not collide across parallel workers. */
export function createUniqueAttendee(baseName = "Test User"): UniqueAttendee {
  attendeeCounter += 1;
  const tag = `${Date.now()}-${attendeeCounter}`;
  return {
    name: `${baseName} ${tag}`,
    email: `testuser+${tag}@example.com`,
  };
}

// ── Booking link capture ─────────────────────────────────────────────────────

/**
 * Waits for and returns the public booking URL displayed on the page after
 * event creation. Checks both `<a href>` and `<input value>` patterns.
 */
export async function captureBookingLink(page: Page, timeout = 10_000): Promise<string> {
  const linkLocator = page.locator(
    "a[href*='/book/'], a[href*='/public/'], input[value*='bunnycal'], a[href*='/:username/']",
  ).first();

  await linkLocator.waitFor({ state: "visible", timeout });

  const href = await linkLocator.getAttribute("href").catch(() => null);
  if (href) {
    // Make absolute if needed
    return href.startsWith("http") ? href : new URL(href, page.url()).toString();
  }

  const value = await linkLocator.inputValue().catch(() => null);
  if (value) return value;

  throw new Error("captureBookingLink: no booking link found on the page");
}
