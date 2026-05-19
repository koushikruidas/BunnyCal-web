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
    overrides: [],
    weeklyRules: DAYS.reduce((acc, day) => {
        acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
        return acc;
    }, {}),
    conferencingProvider: "GOOGLE_MEET",
    customConferenceUrl: "",
};
const OnboardingContext = createContext(null);
// Sessions persisted before the enum casing change may still carry "google_meet" / "zoom" / "custom" / "none".
function migrateConferencingProvider(raw) {
    const token = String(raw ?? "").trim().toLowerCase();
    if (token === "zoom")
        return "ZOOM";
    if (token === "custom" || token === "custom_url")
        return "CUSTOM_URL";
    if (token === "none" || token === "phone" || token === "in-person")
        return "NONE";
    return "GOOGLE_MEET";
}
function mergeDraft(raw) {
    const partial = (raw && typeof raw === "object" ? raw : {});
    return {
        ...defaultDraft,
        ...partial,
        conferencingProvider: migrateConferencingProvider(partial.conferencingProvider),
    };
}
export function OnboardingProvider({ children }) {
    const { user } = useAuth();
    const key = `onboarding-draft:${user?.id ?? "anon"}`;
    const [draft, setDraft] = useState(() => {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? mergeDraft(JSON.parse(raw)) : defaultDraft;
        }
        catch {
            return defaultDraft;
        }
    });
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(key);
            setDraft(raw ? mergeDraft(JSON.parse(raw)) : defaultDraft);
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
