import type {
  CreateEventTypeRequest,
  EventTypeConferenceConfigRequest,
  EventTypeSummaryResponse,
} from "@/services/types";
import {
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

function normalizeProjectionProvider(raw: string): string {
  const token = toCanonicalProviderId(raw);
  if (token === "google") return "google";
  if (token === "microsoft") return "microsoft";
  return raw;
}

function normalizeEventKind(raw?: string | null): string | undefined {
  const token = String(raw ?? "").trim().toUpperCase();
  if (token === "ONE_ON_ONE" || token === "GROUP" || token === "ROUND_ROBIN" || token === "COLLECTIVE") {
    return token;
  }
  return undefined;
}

export function serializeCreateEventTypeRequest(payload: CreateEventTypeRequest): CreateEventTypeRequest {
  return {
    ...payload,
    kind: normalizeEventKind(payload.kind) ?? "ONE_ON_ONE",
    capacity: typeof payload.capacity === "number" ? payload.capacity : 1,
    conference: deriveConferencePayload(payload),
    availabilityCalendars:
      payload.availabilityCalendars && payload.availabilityCalendars.length > 0
        ? payload.availabilityCalendars
        : undefined,
    projectionDestination: payload.projectionDestination
      ? {
          provider: normalizeProjectionProvider(payload.projectionDestination.provider),
          connectionId: payload.projectionDestination.connectionId,
          calendarId: payload.projectionDestination.calendarId,
        }
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
