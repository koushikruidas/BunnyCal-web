import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getBrowserTimezone } from "@/shared/time/timezone";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const defaultState = () => ({
    hostEmail: "",
    hostDisplayName: "",
    eventName: "30-min Intro",
    description: "",
    location: "Google Meet",
    duration: 30,
    currentStep: 0,
    touchedSteps: [0],
    weeklyRules: DAYS.reduce((acc, day) => {
        acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
        return acc;
    }, {}),
});
const DraftOnboardingContext = createContext(null);
const STORAGE_KEY = "draft-onboarding-state";
export function DraftOnboardingProvider({ children }) {
    const timezone = useMemo(() => getBrowserTimezone(), []);
    const [draft, setDraft] = useState(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
        }
        catch {
            return defaultState();
        }
    });
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        }
        catch {
            // no-op
        }
    }, [draft]);
    const value = useMemo(() => ({
        draft,
        timezone,
        setDraft,
        goToStep: (index) => setDraft((prev) => ({
            ...prev,
            currentStep: index,
            touchedSteps: prev.touchedSteps.includes(index) ? prev.touchedSteps : [...prev.touchedSteps, index],
        })),
        reset: () => setDraft(defaultState()),
    }), [draft, timezone]);
    return _jsx(DraftOnboardingContext.Provider, { value: value, children: children });
}
export function useDraftOnboardingState() {
    const ctx = useContext(DraftOnboardingContext);
    if (!ctx)
        throw new Error("useDraftOnboardingState must be used within DraftOnboardingProvider");
    return ctx;
}
