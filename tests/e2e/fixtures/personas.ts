/**
 * Persona registry — maps a logical test persona to its auth state file path.
 *
 * Auth state files are populated by the capture utility, never by Playwright:
 *
 *   npm run capture:google-host
 *   npm run capture:google-multi-calendar
 *   npm run capture:ms-personal
 *   npm run capture:ms-work
 *   npm run capture:fresh-user
 *
 * File layout
 * ───────────
 *   tests/e2e/fixtures/auth-state-stubs/   ← committed, always-empty placeholders
 *   tests/e2e/fixtures/auth-states/        ← gitignored, populated by capture runs
 *
 * In CI: inject the populated auth-states/ files as secrets / build artifacts.
 */

export const PERSONAS = {
  /** Primary host account (Google). Used for onboarding, event creation, golden-path. */
  googleHost:          "tests/e2e/fixtures/auth-states/google-host.json",

  /** Google account with multiple connected calendars. Used for availability-source tests. */
  googleMultiCalendar: "tests/e2e/fixtures/auth-states/google-multi-calendar.json",

  /** Microsoft personal account (Outlook/Hotmail). Used for MS conferencing tests. */
  msPersonal:          "tests/e2e/fixtures/auth-states/ms-personal.json",

  /** Microsoft work/Entra account. Used for Teams conferencing tests. */
  msWork:              "tests/e2e/fixtures/auth-states/ms-work.json",

  /** Newly registered account with no integrations. Used for first-run onboarding tests. */
  freshUser:           "tests/e2e/fixtures/auth-states/fresh-user.json",
} as const;

export type PersonaName = keyof typeof PERSONAS;
