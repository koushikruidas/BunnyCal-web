import { toCanonicalProviderId, toConferencingProviderEnum, } from "@/lib/providerIds";
export function normalizeCalendarProvider(raw) {
    const token = toCanonicalProviderId(raw ?? "");
    if (token === "google")
        return "google";
    if (token === "microsoft")
        return "microsoft";
    return null;
}
export function normalizeConferencingProvider(raw) {
    const token = toCanonicalProviderId(raw ?? "");
    if (token === "google_meet")
        return "google_meet";
    if (token === "microsoft_teams")
        return "microsoft_teams";
    if (token === "zoom")
        return "zoom";
    if (token === "custom" || token === "custom_url")
        return "custom_url";
    if (token === "none")
        return "none";
    return null;
}
export function toCanonicalConferenceProviderValue(provider) {
    return toConferencingProviderEnum(provider);
}
function deriveConferencePayload(payload) {
    if (!payload.conference)
        return undefined;
    const normalized = normalizeConferencingProvider(payload.conference.provider ?? null);
    if (!normalized)
        return payload.conference;
    return {
        ...payload.conference,
        provider: toCanonicalConferenceProviderValue(normalized),
    };
}
function normalizeProjectionProvider(raw) {
    const token = toCanonicalProviderId(raw);
    if (token === "google")
        return "google";
    if (token === "microsoft")
        return "microsoft";
    return raw;
}
export function serializeCreateEventTypeRequest(payload) {
    return {
        ...payload,
        conference: deriveConferencePayload(payload),
        availabilityCalendars: payload.availabilityCalendars && payload.availabilityCalendars.length > 0
            ? payload.availabilityCalendars
            : undefined,
        projectionDestination: {
            provider: normalizeProjectionProvider(payload.projectionDestination.provider),
            connectionId: payload.projectionDestination.connectionId,
            calendarId: payload.projectionDestination.calendarId,
        },
    };
}
export function normalizeEventTypeSummary(raw) {
    const conferenceProvider = normalizeConferencingProvider(raw.conference?.provider ?? null);
    return {
        ...raw,
        normalizedConferencingProvider: conferenceProvider,
        normalizedConferenceCustomUrl: raw.conference?.customUrl ?? null,
    };
}
