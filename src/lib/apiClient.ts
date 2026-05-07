import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { emitUnauthorized } from "@/lib/authEvents";

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

function safeWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string) {
  inMemoryAccessToken = token;
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
}

async function runSilentRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) return false;
        const rawText = await response.text();
        if (rawText) {
          try {
            const body = JSON.parse(rawText) as {
              success?: boolean;
              data?: { accessToken?: string };
              accessToken?: string;
            };
            if (body?.success === false) return false;
            // Optional: if backend returns a token body, keep Bearer mode working.
            // Cookie-only mode works even without this token.
            const token = body?.data?.accessToken ?? body?.accessToken;
            if (token) setAccessToken(token);
          } catch {
            // Ignore non-JSON refresh body when HTTP status is successful.
          }
        }
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiClient<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : null;
  console.log("[apiClient]", options.method ?? "GET", path, body);

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = retry ? await runSilentRefresh() : false;
      if (refreshed) {
        return apiClient<T>(path, options, false);
      }
      console.warn("Unauthorized — redirecting to login");
      clearAccessToken();
      if (safeWindow()) {
        emitUnauthorized();
      }
    }
    if (response.status === 403) {
      console.warn("Forbidden — insufficient permissions");
    }
    throw new ApiError("HTTP_ERROR", `API error: ${response.status}`);
  }

  return body as T;
}
