import type {
  CreateEventTypeRequest,
  EventTypeCalendarBindingRequest,
  EventTypeConferenceConfigRequest,
  EventTypeSummaryResponse,
} from "@/services/types";
import {
  toCalendarProviderEnum,
  toCanonicalProviderId,
  toConferencingProviderEnum,
  type CalendarProviderId,
  type ConferencingProviderId,
} from "@/lib/providerIds";

export function normalizeCalendarProvider(raw?: string | null): CalendarProviderId | null {
  const token = toCanonicalProviderId(raw ?? "");
  if (token === "google") return "google";
  if (token === "microsoft") return "microsoft";
  return null;
}

export function normalizeConferencingProvider(raw?: string | null): ConferencingProviderId | null {
  const token = toCanonicalProviderId(raw ?? "");
  if (token === "google_meet") return "google_meet";
  if (token === "microsoft_teams") return "microsoft_teams";
  if (token === "zoom") return "zoom";
  if (token === "custom" || token === "custom_url") return "custom_url";
  if (token === "none") return "none";
  return null;
}

function deriveConferencePayload(payload: CreateEventTypeRequest): EventTypeConferenceConfigRequest | undefined {
  if (payload.conference) return payload.conference;
  const provider = normalizeConferencingProvider(payload.conferencingProvider) ?? "google_meet";
  const customUrl = payload.customConferenceUrl?.trim();
  if (provider === "none") {
    return { enabled: false, provider: "none" };
  }
  if (provider === "custom_url") {
    return {
      enabled: true,
      provider: "custom",
      ...(customUrl ? { customUrl } : {}),
    };
  }
  return { enabled: true, provider };
}

function toAvailabilityCalendars(payload: CreateEventTypeRequest): EventTypeCalendarBindingRequest[] | undefined {
  if (payload.availabilityCalendars && payload.availabilityCalendars.length > 0) {
    return payload.availabilityCalendars;
  }
  return undefined;
}

export function serializeCreateEventTypeRequest(payload: CreateEventTypeRequest): CreateEventTypeRequest {
  const conference = deriveConferencePayload(payload);
  const availabilityCalendars = toAvailabilityCalendars(payload);
  return {
    ...payload,
    conference,
    availabilityCalendars,
    // Keep legacy fields for transition compatibility.
    ...(payload.calendarProvider ? { calendarProvider: payload.calendarProvider } : {}),
    ...(payload.conferencingProvider ? { conferencingProvider: payload.conferencingProvider } : {}),
    ...(payload.customConferenceUrl !== undefined ? { customConferenceUrl: payload.customConferenceUrl } : {}),
  };
}

export interface NormalizedEventTypeSummary extends EventTypeSummaryResponse {
  normalizedCalendarProvider: CalendarProviderId | null;
  normalizedConferencingProvider: ConferencingProviderId | null;
  normalizedConferenceCustomUrl: string | null;
}

export function normalizeEventTypeSummary(raw: EventTypeSummaryResponse): NormalizedEventTypeSummary {
  const conferenceProvider = normalizeConferencingProvider(raw.conference?.provider ?? raw.conferencingProvider ?? null);
  const calendarProvider = normalizeCalendarProvider(raw.calendarProvider ?? null);
  const customUrl = raw.conference?.customUrl ?? raw.customConferenceUrl ?? null;
  return {
    ...raw,
    normalizedCalendarProvider: calendarProvider,
    normalizedConferencingProvider: conferenceProvider,
    normalizedConferenceCustomUrl: customUrl,
  };
}

export function withLegacyProviderEnums(
  calendarProvider: CalendarProviderId | "",
  conferencingProvider: ConferencingProviderId,
): Pick<CreateEventTypeRequest, "calendarProvider" | "conferencingProvider"> {
  return {
    ...(calendarProvider ? { calendarProvider: toCalendarProviderEnum(calendarProvider) } : {}),
    conferencingProvider: toConferencingProviderEnum(conferencingProvider),
  };
}
