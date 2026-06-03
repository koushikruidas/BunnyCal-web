import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { getBrowserTimezone } from "@/shared/time/timezone";
import { trackedFetch } from "@/lib/networkActivity";

function loaderModeForPath(path: string) {
  if (path.startsWith("/integrations/") || path.startsWith("/auth/")) return "immediate" as const;
  return "default" as const;
}

function parseBody(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

export async function publicApiClient<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("X-Timezone")) {
    headers.set("X-Timezone", getBrowserTimezone());
  }

  const response = await trackedFetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
    loaderMode: loaderModeForPath(path),
  });

  const rawText = await response.text();
  const body = parseBody(rawText);

  if (!response.ok) {
    const errorBody =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { code?: string; message?: string } }).error
        : undefined;
    const code = typeof errorBody?.code === "string" && errorBody.code.trim() ? errorBody.code.trim() : "HTTP_ERROR";
    const message = typeof errorBody?.message === "string" && errorBody.message.trim()
      ? errorBody.message.trim()
      : `API error: ${response.status}`;
    throw new ApiError(code, message);
  }

  return body as T;
}
