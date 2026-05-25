import { API_BASE_URL } from "@/config/api";
import { ApiError } from "@/services/types";
import { getBrowserTimezone } from "@/shared/time/timezone";
function parseBody(rawText) {
    if (!rawText)
        return null;
    try {
        return JSON.parse(rawText);
    }
    catch {
        return rawText;
    }
}
export async function publicApiClient(path, options = {}) {
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
        const errorBody = body && typeof body === "object" && "error" in body
            ? body.error
            : undefined;
        const code = typeof errorBody?.code === "string" && errorBody.code.trim() ? errorBody.code.trim() : "HTTP_ERROR";
        const message = typeof errorBody?.message === "string" && errorBody.message.trim()
            ? errorBody.message.trim()
            : `API error: ${response.status}`;
        throw new ApiError(code, message);
    }
    return body;
}
