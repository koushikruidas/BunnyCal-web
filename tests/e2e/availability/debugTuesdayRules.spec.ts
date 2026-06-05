import { test, expect, assertAuthStateReady, PERSONAS } from "../fixtures";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API_BASE = "http://localhost:8080";

function getAccessToken() {
  const authPath = path.join(process.cwd(), "tests/e2e/fixtures/auth-states/google-host.json");
  const raw = fs.readFileSync(authPath, "utf8");
  const json = JSON.parse(raw) as { cookies?: Array<{ name: string; domain: string; value: string }> };
  return json.cookies?.find((cookie) => cookie.name === "accessToken" && cookie.domain === "localhost")?.value ?? "";
}

test.describe("Availability rules debug probe", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("captures save, persisted state, and guest availability", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});
    const token = (await page.evaluate(() => localStorage.getItem("auth-access-token") || "")).trim() || getAccessToken();
    const payload = {
      rules: [
        { dayOfWeek: "MONDAY", startTime: "06:00", endTime: "22:00" },
        { dayOfWeek: "TUESDAY", startTime: "14:00", endTime: "20:00" },
        { dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "THURSDAY", startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "FRIDAY", startTime: "09:00", endTime: "17:00" },
      ],
    };

    const authHeaders = { Authorization: `Bearer ${token}` };

    const saveRes = await page.request.put(`${API_BASE}/api/availability/rules/bulk`, {
      headers: authHeaders,
      data: payload,
    });
    const saveBody = await saveRes.text();
    console.log(`[debug] save status=${saveRes.status()}`);
    console.log(`[debug] save body=${saveBody}`);
    expect(saveRes.ok()).toBe(true);

    const readbackCandidates = [
      "/api/availability/rules",
      "/api/availability/rules/bulk",
      "/api/availability/rules/current",
    ];
    for (const path of readbackCandidates) {
      const res = await page.request.get(`${API_BASE}${path}`, {
        headers: authHeaders,
      });
      const body = await res.text();
      console.log(`[debug] readback ${path} status=${res.status()}`);
      console.log(`[debug] readback ${path} body=${body}`);
    }

    const eventTypes = await (await page.request.get(`${API_BASE}/api/event-types`, {
      headers: authHeaders,
    })).json();
    const events = (eventTypes as any)?.data ?? [];
    const stable = events.find((et: any) => et.link);
    expect(stable).toBeTruthy();

    const bookingUrl = stable.link.startsWith("http") ? stable.link : `${BASE_URL}${stable.link}`;
    const monday = "2026-06-08";
    const tuesday = "2026-06-09";

    for (const date of [monday, tuesday]) {
      const res = await page.request.get(`${bookingUrl}/availability?date=${date}`);
      const body = await res.text();
      console.log(`[debug] guest availability ${date} status=${res.status()}`);
      console.log(`[debug] guest availability ${date} body=${body}`);
    }
  });
});
