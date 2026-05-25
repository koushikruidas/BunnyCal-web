import { API_BASE_URL } from "@/config/api";
import { authenticatedApiClient, clearAccessToken, setAccessToken } from "@/lib/authenticatedApiClient";
import { draftApiClient } from "@/lib/draftApiClient";
import { publicApiClient } from "@/lib/publicApiClient";
import { toRouteProviderToken } from "@/lib/providerIds";
import { normalizeEventTypeSummary, serializeCreateEventTypeRequest } from "@/domain/adapters/eventTypeAdapter";
import { ApiError } from "./types";
function toQuery(params) {
    if (!params)
        return "";
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined)
            search.set(key, String(value));
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
function normalizeDraftHostResponse(raw) {
    const asRecord = (value) => (value && typeof value === "object" ? value : null);
    const root = asRecord(raw);
    const data = root && "data" in root ? asRecord(root.data) : null;
    const candidate = data ?? root;
    if (!candidate) {
        throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft response payload is empty.");
    }
    const slug = typeof candidate.slug === "string" ? candidate.slug.trim() : "";
    const managementToken = typeof candidate.managementToken === "string" ? candidate.managementToken.trim() : "";
    return {
        slug,
        publicUrl: typeof candidate.publicUrl === "string" ? candidate.publicUrl : "",
        displayName: typeof candidate.displayName === "string" ? candidate.displayName : "",
        timezone: typeof candidate.timezone === "string" ? candidate.timezone : "",
        eventName: typeof candidate.eventName === "string" ? candidate.eventName : "",
        description: typeof candidate.description === "string" ? candidate.description : "",
        location: typeof candidate.location === "string" ? candidate.location : "",
        durationMinutes: typeof candidate.durationMinutes === "number" ? candidate.durationMinutes : 0,
        slotIntervalMinutes: typeof candidate.slotIntervalMinutes === "number" ? candidate.slotIntervalMinutes : 0,
        holdDurationMinutes: typeof candidate.holdDurationMinutes === "number" ? candidate.holdDurationMinutes : 0,
        rules: Array.isArray(candidate.rules) ? candidate.rules : [],
        overrides: Array.isArray(candidate.overrides) ? candidate.overrides : [],
        managementToken,
    };
}
function extractString(map, keys) {
    if (!map)
        return "";
    for (const key of keys) {
        const value = map[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function slugFromPublicUrl(publicUrl) {
    if (!publicUrl)
        return "";
    try {
        const u = publicUrl.startsWith("http") ? new URL(publicUrl) : new URL(publicUrl, "http://local");
        const parts = u.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }
    catch {
        const parts = publicUrl.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }
}
function deepFindString(value, keys) {
    if (!value || typeof value !== "object")
        return "";
    const obj = value;
    for (const key of keys) {
        const hit = obj[key];
        if (typeof hit === "string" && hit.trim())
            return hit.trim();
    }
    for (const child of Object.values(obj)) {
        const nested = deepFindString(child, keys);
        if (nested)
            return nested;
    }
    return "";
}
export const api = {
    baseUrl: API_BASE_URL,
    getGoogleOAuthUrl() {
        return `${API_BASE_URL}/oauth2/authorization/google`;
    },
    getCalendarConnectUrl(params) {
        return this.getIntegrationConnectUrl("calendar", "google", params);
    },
    async getCalendarConnectRedirectUrl(params) {
        return this.getIntegrationConnectRedirectUrl("calendar", "google", params);
    },
    getIntegrationConnectUrl(kind, provider, params) {
        const token = toRouteProviderToken(provider);
        const url = new URL(`${API_BASE_URL}/integrations/${kind}/${token}/connect`);
        if (params?.source) {
            url.searchParams.set("source", params.source);
        }
        if (params?.returnTo) {
            url.searchParams.set("returnTo", params.returnTo);
        }
        if (params?.bookingSessionId) {
            url.searchParams.set("bookingSessionId", params.bookingSessionId);
        }
        return url.toString();
    },
    async getIntegrationConnectRedirectUrl(kind, provider, params) {
        const response = await fetch(this.getIntegrationConnectUrl(kind, provider, params), {
            method: "GET",
            credentials: "include",
        });
        const body = (await response.json());
        if (!response.ok || !body.success || !body.data?.redirectUrl) {
            throw new ApiError("INTEGRATION_CONNECT_ERROR", `Failed to start ${provider} ${kind} connect.`);
        }
        return body.data.redirectUrl;
    },
    getEventInfo(username, slug) {
        return publicApiClient(`/public/${username}/${slug}`).then(unwrap);
    },
    getAvailability(username, slug, date) {
        return publicApiClient(`/public/${username}/${slug}/availability${toQuery({ date })}`).then(unwrap);
    },
    async holdSlot(username, slug, payload, idempotencyKey) {
        const raw = await publicApiClient(`/public/${username}/${slug}/book`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
            body: JSON.stringify(payload),
        });
        return {
            bookingId: raw.bookingId,
            expiresAt: raw.expiresAt,
            status: raw.status,
        };
    },
    confirmBooking(username, slug, bookingId) {
        return publicApiClient(`/public/${username}/${slug}/book/${bookingId}/confirm`, {
            method: "POST",
        }).then(unwrap);
    },
    getPublicBooking(username, slug, bookingId, token) {
        return publicApiClient(`/public/${username}/${slug}/book/${bookingId}${toQuery({ token })}`).then(unwrap);
    },
    cancelBooking(username, slug, bookingId, idempotencyKey, token) {
        return publicApiClient(`/public/${username}/${slug}/book/${bookingId}/cancel${toQuery({ token })}`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
        });
    },
    rescheduleBooking(username, slug, bookingId, payload, idempotencyKey, token) {
        return publicApiClient(`/public/${username}/${slug}/book/${bookingId}/reschedule${toQuery({ token })}`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
            body: JSON.stringify(payload),
        });
    },
    createDraftHost(payload) {
        return fetch(`${API_BASE_URL}/public/drafts`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }).then(async (response) => {
            const rawText = await response.text();
            let parsed = {};
            if (rawText) {
                try {
                    parsed = JSON.parse(rawText);
                }
                catch {
                    parsed = {};
                }
            }
            if (!response.ok) {
                throw new ApiError("HTTP_ERROR", `API error: ${response.status}`);
            }
            const base = normalizeDraftHostResponse(parsed);
            if (base.slug && base.managementToken)
                return base;
            const root = parsed && typeof parsed === "object" ? parsed : null;
            const data = root && root.data && typeof root.data === "object" ? root.data : root;
            const publicUrl = base.publicUrl ||
                extractString(data, ["publicUrl", "public_url", "bookingUrl", "url"]) ||
                deepFindString(parsed, ["publicUrl", "public_url", "bookingUrl", "url"]);
            const slug = base.slug ||
                extractString(data, ["slug", "draftSlug", "draft_slug"]) ||
                deepFindString(parsed, ["slug", "draftSlug", "draft_slug"]) ||
                slugFromPublicUrl(publicUrl);
            const token = base.managementToken ||
                extractString(data, ["managementToken", "management_token", "draftToken", "draft_token", "token"]) ||
                deepFindString(parsed, ["managementToken", "management_token", "draftToken", "draft_token", "token"]) ||
                response.headers.get("X-Draft-Token")?.trim() ||
                response.headers.get("x-draft-token")?.trim() ||
                "";
            if (import.meta.env.DEV) {
                console.debug("[draft-create] response-normalize", {
                    parsed,
                    extracted: { slug, hasToken: Boolean(token), publicUrl },
                    headerTokenPresent: Boolean(response.headers.get("X-Draft-Token") || response.headers.get("x-draft-token")),
                });
            }
            if (!slug) {
                throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft slug missing from response.");
            }
            if (!token) {
                throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft management token missing from response.");
            }
            return {
                ...base,
                slug,
                publicUrl,
                managementToken: token,
            };
        });
    },
    getDraftHost(slug, draftToken) {
        return draftApiClient(`/public/drafts/${slug}`, draftToken).then(unwrap);
    },
    updateDraftHost(slug, draftToken, payload) {
        return draftApiClient(`/public/drafts/${slug}`, draftToken, {
            method: "PUT",
            body: JSON.stringify(payload),
        }).then(unwrap);
    },
    getMe() {
        return authenticatedApiClient("/api/me").then(unwrap);
    },
    getAuthSession() {
        return authenticatedApiClient("/auth/session").then(unwrap);
    },
    getAuthProviders() {
        return authenticatedApiClient("/auth/providers").then(unwrap);
    },
    linkProvider(provider) {
        return authenticatedApiClient(`/auth/link/${provider}`, {
            method: "POST",
        }).then(unwrap);
    },
    updateMyTimezone(timezone) {
        return authenticatedApiClient("/api/me/timezone", {
            method: "PUT",
            body: JSON.stringify({ timezone }),
        }).then(unwrap);
    },
    refresh(payload) {
        return authenticatedApiClient("/auth/refresh", {
            method: "POST",
            body: JSON.stringify(payload),
        }).then((body) => {
            const data = unwrap(body);
            setAccessToken(data.accessToken);
            return data;
        });
    },
    logout() {
        return authenticatedApiClient("/auth/logout", {
            method: "POST",
        }).finally(() => {
            clearAccessToken();
        });
    },
    getCalendarStatus() {
        return authenticatedApiClient("/integrations/calendar/status").then(unwrap);
    },
    getCalendarProviderStatus() {
        return authenticatedApiClient("/integrations/calendar/status/providers").then(unwrap);
    },
    getConferencingStatus() {
        return authenticatedApiClient("/integrations/conferencing/status").then(unwrap);
    },
    disconnectCalendar(provider) {
        return authenticatedApiClient(`/integrations/calendar/${toRouteProviderToken(provider)}`, {
            method: "DELETE",
        });
    },
    disconnectConferencing(provider) {
        return authenticatedApiClient(`/integrations/conferencing/${toRouteProviderToken(provider)}`, {
            method: "DELETE",
        });
    },
    listEventTypes() {
        return authenticatedApiClient("/api/event-types")
            .then(unwrap)
            .then((items) => items.map(normalizeEventTypeSummary));
    },
    listHostMeetings(hostId, params) {
        return authenticatedApiClient(`/api/bookings/hosts/${hostId}/meetings${toQuery({
            upcomingOnly: params?.upcomingOnly,
            limit: params?.limit,
        })}`).then(unwrap);
    },
    cancelHostBooking(bookingId, idempotencyKey) {
        return authenticatedApiClient(`/api/bookings/${bookingId}/cancel`, {
            method: "POST",
            headers: {
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
        });
    },
    createEventType(payload) {
        const body = serializeCreateEventTypeRequest(payload);
        return authenticatedApiClient("/api/event-types", {
            method: "POST",
            body: JSON.stringify(body),
        })
            .then(unwrap)
            .then(normalizeEventTypeSummary);
    },
    upsertAvailabilityRules(payload) {
        return authenticatedApiClient("/api/availability/rules/bulk", {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },
    getAvailabilityOverrides(from, to) {
        return authenticatedApiClient(`/api/availability/overrides${toQuery({ from, to })}`).then(unwrap);
    },
    createAvailabilityOverride(payload) {
        return authenticatedApiClient("/api/availability/overrides", {
            method: "POST",
            body: JSON.stringify(payload),
        }).then(unwrap);
    },
    deleteAvailabilityOverride(id) {
        return authenticatedApiClient(`/api/availability/overrides/${id}`, {
            method: "DELETE",
        });
    },
};
