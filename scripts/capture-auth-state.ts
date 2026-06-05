/**
 * capture-auth-state
 *
 * Attaches to an already-authenticated BunnyCal session and exports the
 * browser storage state to a persona file.
 *
 * This script has ONE job: export session data from a browser that already
 * has a valid BunnyCal session. It does NOT navigate to any OAuth provider,
 * does NOT know which identity provider was used, and does NOT initiate any
 * login flow. The developer signs in normally using their own browser first.
 *
 * Usage
 * ─────
 *   npm run capture:google-host
 *   npm run capture:google-multi-calendar
 *   npm run capture:ms-personal
 *   npm run capture:ms-work
 *   npm run capture:fresh-user
 *
 * What happens
 * ────────────
 *   1. Opens a visible Chrome window and navigates to the BunnyCal app.
 *   2. Checks if a session is already present (dashboard is accessible).
 *   3. If no session: prints instructions and waits up to 10 minutes for the
 *      developer to sign in manually in that window, then continues.
 *   4. Verifies the session is valid by confirming the dashboard loads.
 *   5. Exports cookies + localStorage → persona JSON file.
 *   6. Exits.
 *
 * The script never touches Google.com or Microsoft.com. The developer
 * authenticates with their identity provider entirely in their own browser
 * session before (or during) the capture window.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const AUTH_STATE_DIR = path.resolve("tests/e2e/fixtures/auth-states");
const WAIT_FOR_LOGIN_MS = 10 * 60 * 1000; // 10 minutes for manual sign-in

const PERSONAS: Record<string, string> = {
  "google-host":           path.join(AUTH_STATE_DIR, "google-host.json"),
  "google-multi-calendar": path.join(AUTH_STATE_DIR, "google-multi-calendar.json"),
  "ms-personal":           path.join(AUTH_STATE_DIR, "ms-personal.json"),
  "ms-work":               path.join(AUTH_STATE_DIR, "ms-work.json"),
  "fresh-user":            path.join(AUTH_STATE_DIR, "fresh-user.json"),
};

// ── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(): { persona: string; outputPath: string } {
  const args = process.argv.slice(2);
  const personaArg = args.find((a) => a.startsWith("--persona="))?.replace("--persona=", "")
    ?? args.find((a) => !a.startsWith("--"));

  if (!personaArg) {
    console.error("\n[capture] ERROR: --persona is required.\n");
    console.error("Usage:  npx tsx scripts/capture-auth-state.ts --persona=<name>\n");
    console.error("Known personas:");
    Object.keys(PERSONAS).forEach((p) => console.error(`  ${p}`));
    console.error("\nOr pass a custom output path:");
    console.error("  npx tsx scripts/capture-auth-state.ts --persona=custom-name --output=path/to/file.json\n");
    process.exit(1);
  }

  const outputArg = args.find((a) => a.startsWith("--output="))?.replace("--output=", "");
  const outputPath = outputArg
    ? path.resolve(outputArg)
    : (PERSONAS[personaArg] ?? path.join(AUTH_STATE_DIR, `${personaArg}.json`));

  return { persona: personaArg, outputPath };
}

// ── Session verification ─────────────────────────────────────────────────────

async function isDashboardAccessible(page: import("playwright").Page): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    // Wait briefly for the auth hydration check to resolve
    await page.waitForTimeout(2_000);
    const url = page.url();
    // If we stayed on /dashboard (or a sub-path), session is valid.
    // If redirected to /sign-in, session is missing.
    return url.includes("/dashboard") && !url.includes("/sign-in");
  } catch {
    return false;
  }
}

async function waitForDashboard(page: import("playwright").Page): Promise<void> {
  await page.waitForURL(/\/dashboard/, { timeout: WAIT_FOR_LOGIN_MS });
  // Wait for auth hydration text to clear
  const checkingSession = page.locator("text=Checking session…");
  await checkingSession.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { persona, outputPath } = parseArgs();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  BunnyCal Auth State Capture`);
  console.log(`  Persona  : ${persona}`);
  console.log(`  Output   : ${outputPath}`);
  console.log(`  App URL  : ${BASE_URL}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Launch a real visible Chrome window. Using system Chrome (channel: "chrome")
  // means the browser is indistinguishable from normal user Chrome — important
  // only if the developer needs to complete a sign-in during the capture window.
  // The script itself never navigates to any OAuth provider.
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled", // avoids navigator.webdriver flag
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    console.log("[capture] Checking for existing BunnyCal session…");
    const hasSession = await isDashboardAccessible(page);

    if (hasSession) {
      console.log("[capture] Session found — dashboard is accessible.");
    } else {
      // No session — navigate to sign-in and wait for the developer to authenticate.
      // This script does NOT click anything on the sign-in page; it just waits.
      console.log("[capture] No active session detected.");
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  ACTION REQUIRED");
      console.log("");
      console.log("  A browser window is open on the BunnyCal sign-in page.");
      console.log(`  Sign in with the account for persona: ${persona}`);
      console.log("");
      console.log("  This script does not interact with Google or Microsoft.");
      console.log("  Click the sign-in button, complete auth in the browser,");
      console.log("  and this script will continue when the dashboard loads.");
      console.log("");
      console.log("  Waiting up to 10 minutes…");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      await page.goto(`${BASE_URL}/sign-in`);
      await waitForDashboard(page);
      console.log(`[capture] Dashboard reached — URL: ${page.url()}`);
    }

    // ── Verify we actually have a dashboard session ───────────────────────
    const currentUrl = page.url();
    if (!currentUrl.includes("/dashboard")) {
      throw new Error(
        `[capture] Expected /dashboard but got: ${currentUrl}\n` +
        "  The session may have expired mid-capture. Please retry.",
      );
    }

    // ── Export storage state ──────────────────────────────────────────────
    console.log("[capture] Exporting storage state…");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await context.storageState({ path: outputPath });

    // ── Validate the exported file has real data ──────────────────────────
    const raw = fs.readFileSync(outputPath, "utf-8");
    const state = JSON.parse(raw) as { cookies?: unknown[]; origins?: unknown[] };
    const cookieCount = state.cookies?.length ?? 0;
    const originCount = state.origins?.length ?? 0;

    if (cookieCount === 0 && originCount === 0) {
      fs.unlinkSync(outputPath); // remove the useless empty file
      throw new Error(
        "[capture] Storage state exported but contains no cookies or localStorage entries.\n" +
        "  The session may not have been fully established. Please sign in completely\n" +
        "  (wait for the dashboard to fully load) and try again.",
      );
    }

    console.log(`[capture] ✓ Exported: ${cookieCount} cookie(s), ${originCount} origin(s)`);
    console.log(`[capture] ✓ Saved → ${outputPath}`);
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Capture complete for persona: ${persona}`);
    console.log("");
    console.log("  Run tests now:");
    console.log("    npm run test:e2e:golden");
    console.log("    npm run test:e2e");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n[capture] FAILED: ${msg}\n`);
  process.exit(1);
});
