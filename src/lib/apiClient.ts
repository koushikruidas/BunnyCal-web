import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { emitUnauthorized } from "@/lib/authEvents";

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

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

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const rawText = await response.text();
  const body = parseBody(rawText);

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = retry ? await runSilentRefresh() : false;
      if (refreshed) return apiClient<T>(path, options, false);

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
