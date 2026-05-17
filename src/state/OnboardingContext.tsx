import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DayOfWeek } from "@/services/types";
import type { DraftOverride } from "@/services/types";
import { useAuth } from "@/state/AuthContext";

export interface OnboardingDraft {
  eventName: string;
  description: string;
  location: string;
  duration: number;
  weeklyRules: Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>;
  overrides: DraftOverride[];
  currentStep: number;
  touchedSteps: number[];
}

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const defaultDraft: OnboardingDraft = {
  eventName: "30-min Intro",
  description: "",
  location: "Google Meet",
  duration: 30,
  currentStep: 0,
  touchedSteps: [0],
  overrides: [],
  weeklyRules: DAYS.reduce((acc, day) => {
    acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
    return acc;
  }, {} as Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>),
};

interface OnboardingStateValue {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  goToStep: (index: number) => void;
  setCurrentStep: (index: number) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingStateValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const key = `onboarding-draft:${user?.id ?? "anon"}`;
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? { ...defaultDraft, ...(JSON.parse(raw) as Partial<OnboardingDraft>) } : defaultDraft;
    } catch {
      return defaultDraft;
    }
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      setDraft(raw ? { ...defaultDraft, ...(JSON.parse(raw) as Partial<OnboardingDraft>) } : defaultDraft);
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
