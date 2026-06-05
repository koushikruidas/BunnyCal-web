import { defineConfig, devices } from "@playwright/test";
import { PERSONAS } from "./tests/e2e/fixtures/personas";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

// ── Shared browser config ─────────────────────────────────────────────────────
// All test runs use fast headless Playwright Chromium.
// Authentication state is loaded from pre-captured persona files.
// Playwright never drives any OAuth flow.
const testBrowser = devices["Desktop Chrome"];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ── Authenticated projects ─────────────────────────────────────────────
    // storageState is loaded from pre-captured persona files.
    // No `dependencies:` — auth bootstrap is handled outside Playwright
    // via: npm run capture:<persona>
    {
      name: "google-host",
      use: { ...testBrowser, storageState: PERSONAS.googleHost },
      testMatch: [
        "**/onboarding/**/*.spec.ts",
        "**/event-creation/**/*.spec.ts",
        "**/integrations/**/*.spec.ts",
        "**/conferencing/**/*.spec.ts",
        "**/golden-path.spec.ts",
        "**/new-event-bookability.spec.ts",
        "**/booking-lifecycle/**/*.spec.ts",
        "**/availability/**/*.spec.ts",
      ],
      testIgnore: [
        "**/booking/**",
        "**/conferencing/ms-personal/**",
        "**/conferencing/ms-work/**",
        "**/integrations/multi-calendar/**",
      ],
    },
    {
      name: "google-multi-calendar",
      use: { ...testBrowser, storageState: PERSONAS.googleMultiCalendar },
      testMatch: ["**/integrations/multi-calendar/**/*.spec.ts"],
    },
    {
      name: "ms-personal",
      use: { ...testBrowser, storageState: PERSONAS.msPersonal },
      testMatch: ["**/conferencing/ms-personal/**/*.spec.ts"],
    },
    {
      name: "ms-work",
      use: { ...testBrowser, storageState: PERSONAS.msWork },
      testMatch: ["**/conferencing/ms-work/**/*.spec.ts"],
    },

    // ── Public / unauthenticated ───────────────────────────────────────────
    // No storageState — runs the guest-facing booking flow as an anonymous user.
    {
      name: "public",
      use: { ...testBrowser },
      testMatch: ["**/booking/**/*.spec.ts"],
    },
  ],
  outputDir: "test-results",
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
