import { API_BASE_URL } from "@/config/api";
import { apiClient, clearAccessToken, setAccessToken } from "@/lib/apiClient";
import { ApiError } from "./types";
function toQuery(params) {
    if (!params)
        return "";
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined)
            search.set(key, value);
    });
    const q = search.toString();
    return q ? `?${q}` : "";
}
function unwrap(body) {
    if (typeof body === "object" && body !== null && "success" in body) {
        const wrapped = body;
        if (!wrapped.success) {
            throw new ApiError(wrapped.error?.code ?? "API_ERROR", wrapped.error?.message ?? "Request failed");
        }
        return wrapped.data;
    }
    return body;
}
export const api = {
    baseUrl: API_BASE_URL,
    // Browser redirect, not a fetch call.
    getGoogleOAuthUrl() {
        return `${API_BASE_URL}/oauth2/authorization/google`;
    },
    getEventInfo(username, slug) {
        return apiClient(`/public/${username}/${slug}`).then(unwrap);
    },
    getAvailability(username, slug, date) {
        return apiClient(`/public/${username}/${slug}/availability${toQuery({ date })}`).then(unwrap);
    },
    async holdSlot(username, slug, startTime, idempotencyKey) {
        const raw = await apiClient(`/public/${username}/${slug}/book`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
            body: JSON.stringify({ startTime }),
        });
        return {
            bookingId: raw.bookingId,
            expiresAt: raw.expiresAt,
            status: raw.status,
        };
    },
    confirmBooking(username, slug, bookingId) {
        return apiClient(`/public/${username}/${slug}/book/${bookingId}/confirm`, {
            method: "POST",
        }).then(unwrap);
    },
    cancelBooking(username, slug, bookingId, idempotencyKey) {
        return apiClient(`/public/${username}/${slug}/book/${bookingId}/cancel`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
        });
    },
    getMe() {
        return apiClient("/api/me").then(unwrap);
    },
    refresh(payload) {
        return apiClient("/auth/refresh", {
            method: "POST",
            body: JSON.stringify(payload),
        }).then((body) => {
            const data = unwrap(body);
            setAccessToken(data.accessToken);
            return data;
        });
    },
    logout() {
        return apiClient("/auth/logout", {
            method: "POST",
        }).finally(() => {
            clearAccessToken();
        });
    },
    getCalendarStatus() {
        return apiClient("/integrations/calendar/status").then(unwrap);
    },
    listEventTypes() {
        return apiClient("/api/event-types").then(unwrap);
    },
    createEventType(payload) {
        return apiClient("/api/event-types", {
            method: "POST",
            body: JSON.stringify(payload),
        }).then(unwrap);
    },
    upsertAvailabilityRules(payload) {
        return apiClient("/api/availability/rules/bulk", {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },
    getAvailabilityOverrides(from, to) {
        return apiClient(`/api/availability/overrides${toQuery({ from, to })}`).then(unwrap);
    },
    createAvailabilityOverride(payload) {
        return apiClient("/api/availability/overrides", {
            method: "POST",
            body: JSON.stringify(payload),
        }).then(unwrap);
    },
};
