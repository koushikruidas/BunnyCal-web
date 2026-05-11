import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { emitUnauthorized } from "@/lib/authEvents";
import { getBrowserTimezone } from "@/shared/time/timezone";
import { authDebug } from "@/lib/authDebug";

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
const ACCESS_TOKEN_STORAGE_KEY = "auth-access-token";

function safeWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

function parseBody(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string) {
  inMemoryAccessToken = token;
  const w = safeWindow();
  if (w) {
    w.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  const w = safeWindow();
  if (w) {
    w.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function hydrateAccessTokenFromStorage() {
  const w = safeWindow();
  if (!w) return null;
  const token = w.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    inMemoryAccessToken = token;
    authDebug("restored access token from storage");
    return token;
  }
  authDebug("no persisted access token found");
  return null;
}

async function runSilentRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      authDebug("attempting silent refresh");
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) {
          authDebug("silent refresh rejected", { status: response.status });
          return false;
        }

        const rawText = await response.text();
        const body = parseBody(rawText) as
          | {
              success?: boolean;
              data?: { accessToken?: string };
              accessToken?: string;
            }
          | string
          | null;

        if (body && typeof body === "object") {
          if (body.success === false) return false;
          const token = body.data?.accessToken ?? body.accessToken;
          if (token) setAccessToken(token);
        }

        authDebug("silent refresh succeeded");
        return true;
      } catch {
        authDebug("silent refresh failed due to network/runtime error");
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiClient<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("X-Timezone")) {
    headers.set("X-Timezone", getBrowserTimezone());
  }
  authDebug("api request", {
    path,
    method,
    retry,
    hasAuthorization: headers.has("Authorization"),
    credentials: "include",
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const rawText = await response.text();
  const body = parseBody(rawText);
  authDebug("api response", { path, method, status: response.status, ok: response.ok, retry });

  if (!response.ok) {
    if (response.status === 401) {
      authDebug("api 401 encountered", { path, method, retry });
      const refreshed = retry ? await runSilentRefresh() : false;
      if (refreshed) return apiClient<T>(path, options, false);

      authDebug("api unauthorized after refresh fallback", { path, method });
      clearAccessToken();
      if (safeWindow()) emitUnauthorized();
      throw new ApiError("UNAUTHORIZED", "Your session has expired. Please sign in again.");
    }

    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? "")
        : "";

    throw new ApiError("HTTP_ERROR", message || `API error: ${response.status}`);
  }

  return body as T;
}
