import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { getBrowserTimezone } from "@/shared/time/timezone";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const rawText = await response.text();
  const body = parseBody(rawText);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? "")
        : "";
    throw new ApiError("HTTP_ERROR", message || `API error: ${response.status}`);
  }

  return body as T;
}
