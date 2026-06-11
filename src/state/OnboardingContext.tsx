import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DayOfWeek } from "@/services/types";
import type { DraftOverride } from "@/services/types";
import { useAuth } from "@/state/AuthContext";
import type { CalendarProviderId, ConferencingProviderId } from "@/lib/providerIds";
import { toCanonicalProviderId } from "@/lib/providerIds";
import { getBrowserTimezone } from "@/shared/time/timezone";
import type { SupportedEventTypeKind } from "@/features/event-types/eventTypeCatalog";

export type ConferencingProvider = ConferencingProviderId;
export type OrchestrationProvider = CalendarProviderId;

export interface AvailabilityCalendarBindingDraft {
  provider: string;
  calendarId: string;
}

export interface SelectedCalendar {
  connectionId: string;
  provider: string;
  externalCalendarId: string;
  displayName: string;
}

export interface OnboardingDraft {
  eventKind: SupportedEventTypeKind;
  capacity: number;
  hostEmail: string;
  hostDisplayName: string;
  timezone: string;
  eventName: string;
  description: string;
  location: string;
  duration: number;
  weeklyRules: Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>;
  overrides: DraftOverride[];
  persistedOverrides: DraftOverride[];
  currentStep: number;
  touchedSteps: number[];
  orchestrationProvider: OrchestrationProvider | "";
  availabilityCalendarBindings: AvailabilityCalendarBindingDraft[];
  availabilityCalendars: SelectedCalendar[];
  projectionDestination: SelectedCalendar | null;
  conferencingProvider: ConferencingProvider;
  customConferenceUrl: string;
  selectedParticipantIds: string[];
}

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const defaultDraft: OnboardingDraft = {
  eventKind: "ONE_ON_ONE",
  capacity: 1,
  hostEmail: "",
  hostDisplayName: "",
  timezone: getBrowserTimezone(),
  eventName: "30-min Intro",
  description: "",
  location: "Google Meet",
  duration: 30,
  currentStep: 0,
  touchedSteps: [0],
  orchestrationProvider: "",
  availabilityCalendarBindings: [],
  availabilityCalendars: [],
  projectionDestination: null,
  overrides: [],
  persistedOverrides: [],
  weeklyRules: DAYS.reduce((acc, day) => {
    acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
    return acc;
  }, {} as Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>),
  conferencingProvider: "google_meet",
  customConferenceUrl: "",
  selectedParticipantIds: [],
};

interface OnboardingStateValue {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  goToStep: (index: number) => void;
  setCurrentStep: (index: number) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingStateValue | null>(null);

// Sessions persisted before the enum casing change may still carry "google_meet" / "zoom" / "custom" / "none".
function migrateConferencingProvider(raw: unknown): ConferencingProvider {
  const token = toCanonicalProviderId(String(raw ?? ""));
  if (token === "zoom") return "zoom";
  if (token === "microsoft_teams" || token === "teams") return "microsoft_teams";
  if (token === "custom" || token === "custom_url") return "custom_url";
  if (token === "none" || token === "phone" || token === "in_person" || token === "in-person") return "none";
  return "google_meet";
}

function migrateOrchestrationProvider(raw: unknown): OrchestrationProvider | "" {
  const token = toCanonicalProviderId(String(raw ?? ""));
  if (token === "google") return "google";
  if (token === "microsoft") return "microsoft";
  if (token === "GOOGLE") return "google";
  if (token === "MICROSOFT") return "microsoft";
  return "";
}

function mergeDraft(raw: unknown): OnboardingDraft {
  const partial = (raw && typeof raw === "object" ? raw : {}) as Partial<OnboardingDraft>;
  const normalizeOverride = (value: unknown): DraftOverride | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const date = String(raw.date ?? "").trim();
    if (!date) return null;
    const override: DraftOverride = { date };
    const id = String(raw.id ?? "").trim();
    if (id) override.id = id;
    if (typeof raw.startTime === "string") override.startTime = raw.startTime;
    if (typeof raw.endTime === "string") override.endTime = raw.endTime;
    if (typeof raw.isAvailable === "boolean") override.isAvailable = raw.isAvailable;
    return override;
  };
  return {
    ...defaultDraft,
    ...partial,
    eventKind: partial.eventKind === "GROUP" ? "GROUP" : partial.eventKind === "ROUND_ROBIN" ? "ROUND_ROBIN" : partial.eventKind === "COLLECTIVE" ? "COLLECTIVE" : "ONE_ON_ONE",
    capacity: typeof partial.capacity === "number" && Number.isFinite(partial.capacity) ? partial.capacity : defaultDraft.capacity,
    hostEmail: String((partial as { hostEmail?: unknown }).hostEmail ?? defaultDraft.hostEmail),
    hostDisplayName: String((partial as { hostDisplayName?: unknown }).hostDisplayName ?? defaultDraft.hostDisplayName),
    timezone: String((partial as { timezone?: unknown }).timezone ?? defaultDraft.timezone) || defaultDraft.timezone,
    conferencingProvider: migrateConferencingProvider(partial.conferencingProvider),
    orchestrationProvider: migrateOrchestrationProvider(partial.orchestrationProvider),
    availabilityCalendarBindings: Array.isArray(partial.availabilityCalendarBindings)
      ? partial.availabilityCalendarBindings
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const raw = item as unknown as Record<string, unknown>;
            return {
              provider: String(raw.provider ?? "").toLowerCase(),
              calendarId: String(raw.calendarId ?? ""),
            };
          })
          .filter((item) => item.provider && item.calendarId)
      : [],
    availabilityCalendars: Array.isArray((partial as { availabilityCalendars?: unknown[] }).availabilityCalendars)
      ? ((partial as { availabilityCalendars?: unknown[] }).availabilityCalendars as unknown[])
          .map((value) => {
            if (!value || typeof value !== "object") return null;
            const raw = value as Record<string, unknown>;
            const connectionId = String(raw.connectionId ?? "").trim();
            const provider = String(raw.provider ?? "").trim().toLowerCase();
            const externalCalendarId = String(raw.externalCalendarId ?? "").trim();
            if (!connectionId || !provider || !externalCalendarId) return null;
            const displayName = String(raw.displayName ?? "").trim() || externalCalendarId;
            return { connectionId, provider, externalCalendarId, displayName };
          })
          .filter((value): value is SelectedCalendar => Boolean(value))
      : [],
    projectionDestination: (() => {
      const raw = (partial as { projectionDestination?: unknown }).projectionDestination;
      if (!raw || typeof raw !== "object") return null;
      const obj = raw as Record<string, unknown>;
      const connectionId = String(obj.connectionId ?? "").trim();
      const provider = String(obj.provider ?? "").trim().toLowerCase();
      const externalCalendarId = String(obj.externalCalendarId ?? "").trim();
      if (!connectionId || !provider || !externalCalendarId) return null;
      const displayName = String(obj.displayName ?? "").trim() || externalCalendarId;
      return { connectionId, provider, externalCalendarId, displayName };
    })(),
    selectedParticipantIds: Array.isArray((partial as { selectedParticipantIds?: unknown[] }).selectedParticipantIds)
      ? ((partial as { selectedParticipantIds?: unknown[] }).selectedParticipantIds as unknown[])
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [],
    overrides: Array.isArray(partial.overrides)
      ? partial.overrides.map(normalizeOverride).filter((value): value is DraftOverride => Boolean(value))
      : [],
    persistedOverrides: Array.isArray((partial as { persistedOverrides?: unknown[] }).persistedOverrides)
      ? ((partial as { persistedOverrides?: unknown[] }).persistedOverrides as unknown[])
          .map(normalizeOverride)
          .filter((value): value is DraftOverride => Boolean(value))
      : [],
  };
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const key = `onboarding-draft:${user?.id ?? "anon"}`;
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? mergeDraft(JSON.parse(raw)) : defaultDraft;
    } catch {
      return defaultDraft;
    }
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      setDraft(raw ? mergeDraft(JSON.parse(raw)) : defaultDraft);
    } catch {
      setDraft(defaultDraft);
    }
  }, [key]);

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // no-op
    }
  }, [draft, key]);

  const value = useMemo<OnboardingStateValue>(() => ({
    draft,
    setDraft,
    goToStep: (index: number) => setDraft((prev) => ({ ...prev, currentStep: index, touchedSteps: prev.touchedSteps.includes(index) ? prev.touchedSteps : [...prev.touchedSteps, index] })),
    setCurrentStep: (index: number) => setDraft((prev) => ({ ...prev, currentStep: index })),
    reset: () => setDraft(defaultDraft),
  }), [draft]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingState() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboardingState must be used within OnboardingProvider");
  return ctx;
}
