/**
 * Preflight helpers for persona-based auth state.
 *
 * Auth state is captured outside Playwright using:
 *   npm run capture:<persona>
 *
 * These helpers only validate that captured state exists and is ready to use.
 * They do not drive any browser, navigate to any URL, or touch any OAuth provider.
 */

import * as fs from "fs";

/**
 * Asserts that the persona auth state file exists and contains real session data.
 * Call this inside `test.beforeAll()` so tests fail immediately with a clear
 * message rather than mysteriously redirecting to /sign-in.
 *
 * @param authStatePath  Path to the persona JSON file (from PERSONAS registry).
 * @param personaLabel   Human-readable name used in the error message.
 */
export function assertAuthStateReady(authStatePath: string, personaLabel: string): void {
  let content: string;
  try {
    content = fs.readFileSync(authStatePath, "utf-8");
  } catch {
    throw new Error(
      `\n[preflight] Auth state not found for persona "${personaLabel}"\n` +
      `\n` +
      `  Expected file : ${authStatePath}\n` +
      `\n` +
      `  To create it  : npm run capture:${personaLabel}\n` +
      `\n` +
      `  Steps:\n` +
      `    1. Ensure the BunnyCal dev server is running  (npm run dev)\n` +
      `    2. Run: npm run capture:${personaLabel}\n` +
      `    3. A browser window opens — sign in as the ${personaLabel} account\n` +
      `    4. When the dashboard loads, the capture completes automatically\n` +
      `    5. Re-run your tests\n`,
    );
  }

  let parsed: { cookies?: unknown[]; origins?: unknown[] };
  try {
    parsed = JSON.parse(content) as { cookies?: unknown[]; origins?: unknown[] };
  } catch {
    throw new Error(
      `\n[preflight] Auth state file for "${personaLabel}" contains invalid JSON\n` +
      `\n` +
      `  File  : ${authStatePath}\n` +
      `  Fix   : Delete the file and run: npm run capture:${personaLabel}\n`,
    );
  }

  const cookieCount = parsed.cookies?.length ?? 0;
  const originCount = parsed.origins?.length ?? 0;

  if (cookieCount === 0 && originCount === 0) {
    throw new Error(
      `\n[preflight] Auth state for "${personaLabel}" is a blank stub — no session data\n` +
      `\n` +
      `  File  : ${authStatePath}\n` +
      `  Fix   : Run: npm run capture:${personaLabel}\n` +
      `\n` +
      `  Steps:\n` +
      `    1. Ensure the BunnyCal dev server is running  (npm run dev)\n` +
      `    2. Run: npm run capture:${personaLabel}\n` +
      `    3. A browser window opens — sign in as the ${personaLabel} account\n` +
      `    4. When the dashboard loads, the capture completes automatically\n` +
      `    5. Re-run your tests\n`,
    );
  }
}
