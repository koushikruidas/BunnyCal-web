import type {
  CreateEventTypeRequest,
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

export function toCanonicalConferenceProviderValue(provider: ConferencingProviderId): string {
  return toConferencingProviderEnum(provider);
}

function deriveConferencePayload(payload: CreateEventTypeRequest): EventTypeConferenceConfigRequest | undefined {
  if (!payload.conference) return undefined;
  const normalized = normalizeConferencingProvider(payload.conference.provider ?? null);
  if (!normalized) return payload.conference;
  return {
    ...payload.conference,
    provider: toCanonicalConferenceProviderValue(normalized),
  };
}

export function serializeCreateEventTypeRequest(payload: CreateEventTypeRequest): CreateEventTypeRequest {
  return {
    ...payload,
    conference: deriveConferencePayload(payload),
    availabilityCalendars:
      payload.availabilityCalendars && payload.availabilityCalendars.length > 0
        ? payload.availabilityCalendars
        : undefined,
  };
}

export interface NormalizedEventTypeSummary extends EventTypeSummaryResponse {
  normalizedConferencingProvider: ConferencingProviderId | null;
  normalizedConferenceCustomUrl: string | null;
}

export function normalizeEventTypeSummary(raw: EventTypeSummaryResponse): NormalizedEventTypeSummary {
  const conferenceProvider = normalizeConferencingProvider(raw.conference?.provider ?? null);
  return {
    ...raw,
    normalizedConferencingProvider: conferenceProvider,
    normalizedConferenceCustomUrl: raw.conference?.customUrl ?? null,
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
