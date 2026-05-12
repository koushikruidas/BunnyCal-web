import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/state/AuthContext";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const defaultDraft = {
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
};
const OnboardingContext = createContext(null);
export function OnboardingProvider({ children }) {
    const { user } = useAuth();
    const key = `onboarding-draft:${user?.id ?? "anon"}`;
    const [draft, setDraft] = useState(() => {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? { ...defaultDraft, ...JSON.parse(raw) } : defaultDraft;
        }
        catch {
            return defaultDraft;
        }
    });
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(key);
            setDraft(raw ? { ...defaultDraft, ...JSON.parse(raw) } : defaultDraft);
        }
        catch {
            setDraft(defaultDraft);
        }
    }, [key]);
    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(draft));
        }
        catch {
            // no-op
        }
    }, [draft, key]);
    const value = useMemo(() => ({
        draft,
        setDraft,
        goToStep: (index) => setDraft((prev) => ({ ...prev, currentStep: index, touchedSteps: prev.touchedSteps.includes(index) ? prev.touchedSteps : [...prev.touchedSteps, index] })),
        setCurrentStep: (index) => setDraft((prev) => ({ ...prev, currentStep: index })),
        reset: () => setDraft(defaultDraft),
    }), [draft]);
    return _jsx(OnboardingContext.Provider, { value: value, children: children });
}
export function useOnboardingState() {
    const ctx = useContext(OnboardingContext);
    if (!ctx)
        throw new Error("useOnboardingState must be used within OnboardingProvider");
    return ctx;
}
