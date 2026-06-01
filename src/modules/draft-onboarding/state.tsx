import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { DayOfWeek } from "@/services/types";
import type { DraftOverride } from "@/services/types";
import { getBrowserTimezone } from "@/shared/time/timezone";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export interface DraftOnboardingState {
  hostEmail: string;
  hostDisplayName: string;
  draftSlug: string;
  draftToken: string;
  eventName: string;
  description: string;
  location: string;
  conferencingProvider: "google_meet" | "microsoft_teams" | "zoom" | "custom_url" | "none";
  customConferenceUrl: string;
  duration: number;
  currentStep: number;
  touchedSteps: number[];
  weeklyRules: Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>;
  overrides: DraftOverride[];
}

const defaultState = (): DraftOnboardingState => ({
  hostEmail: "",
  hostDisplayName: "",
  draftSlug: "",
  draftToken: "",
  eventName: "30-min Intro",
  description: "",
  location: "",
  conferencingProvider: "none",
  customConferenceUrl: "",
  duration: 30,
  currentStep: 0,
  touchedSteps: [0],
  overrides: [],
  weeklyRules: DAYS.reduce((acc, day) => {
    acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
    return acc;
  }, {} as Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>),
});

interface DraftOnboardingContextValue {
  draft: DraftOnboardingState;
  timezone: string;
  setDraft: Dispatch<SetStateAction<DraftOnboardingState>>;
  goToStep: (index: number) => void;
  reset: () => void;
}

const DraftOnboardingContext = createContext<DraftOnboardingContextValue | null>(null);

const STORAGE_KEY = "draft-onboarding-state";

export function DraftOnboardingProvider({ children }: { children: React.ReactNode }) {
  const timezone = useMemo(() => getBrowserTimezone(), []);
  const [draft, setDraft] = useState<DraftOnboardingState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) as Partial<DraftOnboardingState>;
      const provider = String(parsed.conferencingProvider ?? "").toLowerCase();
      const normalizedProvider =
        provider === "google_meet" || provider === "microsoft_teams" || provider === "zoom" || provider === "custom_url" || provider === "none"
          ? provider as DraftOnboardingState["conferencingProvider"]
          : "none";
      return {
        ...defaultState(),
        ...parsed,
        draftSlug: String(parsed.draftSlug ?? ""),
        draftToken: String(parsed.draftToken ?? ""),
        conferencingProvider: normalizedProvider,
        customConferenceUrl: String(parsed.customConferenceUrl ?? ""),
      };
    } catch {
      return defaultState();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // no-op
    }
  }, [draft]);

  const value = useMemo<DraftOnboardingContextValue>(() => ({
    draft,
    timezone,
    setDraft,
    goToStep: (index: number) => setDraft((prev) => ({
      ...prev,
      currentStep: index,
      touchedSteps: prev.touchedSteps.includes(index) ? prev.touchedSteps : [...prev.touchedSteps, index],
    })),
    reset: () => setDraft(defaultState()),
  }), [draft, timezone]);

  return <DraftOnboardingContext.Provider value={value}>{children}</DraftOnboardingContext.Provider>;
}

export function useDraftOnboardingState() {
  const ctx = useContext(DraftOnboardingContext);
  if (!ctx) throw new Error("useDraftOnboardingState must be used within DraftOnboardingProvider");
  return ctx;
}
