import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/state/AuthContext";
import { toCanonicalProviderId } from "@/lib/providerIds";
import { getBrowserTimezone } from "@/shared/time/timezone";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const defaultDraft = {
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
    weeklyRules: DAYS.reduce((acc, day) => {
        acc[day] = { enabled: day !== "SATURDAY" && day !== "SUNDAY", startTime: "09:00", endTime: "17:00" };
        return acc;
    }, {}),
    conferencingProvider: "google_meet",
    customConferenceUrl: "",
};
const OnboardingContext = createContext(null);
// Sessions persisted before the enum casing change may still carry "google_meet" / "zoom" / "custom" / "none".
function migrateConferencingProvider(raw) {
    const token = toCanonicalProviderId(String(raw ?? ""));
    if (token === "zoom")
        return "zoom";
    if (token === "microsoft_teams" || token === "teams")
        return "microsoft_teams";
    if (token === "custom" || token === "custom_url")
        return "custom_url";
    if (token === "none" || token === "phone" || token === "in_person" || token === "in-person")
        return "none";
    return "google_meet";
}
function migrateOrchestrationProvider(raw) {
    const token = toCanonicalProviderId(String(raw ?? ""));
    if (token === "google")
        return "google";
    if (token === "microsoft")
        return "microsoft";
    if (token === "GOOGLE")
        return "google";
    if (token === "MICROSOFT")
        return "microsoft";
    return "";
}
function mergeDraft(raw) {
    const partial = (raw && typeof raw === "object" ? raw : {});
    return {
        ...defaultDraft,
        ...partial,
        hostEmail: String(partial.hostEmail ?? defaultDraft.hostEmail),
        hostDisplayName: String(partial.hostDisplayName ?? defaultDraft.hostDisplayName),
        timezone: String(partial.timezone ?? defaultDraft.timezone) || defaultDraft.timezone,
        conferencingProvider: migrateConferencingProvider(partial.conferencingProvider),
        orchestrationProvider: migrateOrchestrationProvider(partial.orchestrationProvider),
        availabilityCalendarBindings: Array.isArray(partial.availabilityCalendarBindings)
            ? partial.availabilityCalendarBindings
                .filter((item) => item && typeof item === "object")
                .map((item) => {
                const raw = item;
                return {
                    provider: String(raw.provider ?? "").toLowerCase(),
                    calendarId: String(raw.calendarId ?? ""),
                };
            })
                .filter((item) => item.provider && item.calendarId)
            : [],
        availabilityCalendars: Array.isArray(partial.availabilityCalendars)
            ? partial.availabilityCalendars
                .map((value) => {
                if (!value || typeof value !== "object")
                    return null;
                const raw = value;
                const connectionId = String(raw.connectionId ?? "").trim();
                const provider = String(raw.provider ?? "").trim().toLowerCase();
                const externalCalendarId = String(raw.externalCalendarId ?? "").trim();
                if (!connectionId || !provider || !externalCalendarId)
                    return null;
                const displayName = String(raw.displayName ?? "").trim() || externalCalendarId;
                return { connectionId, provider, externalCalendarId, displayName };
            })
                .filter((value) => Boolean(value))
            : [],
        projectionDestination: (() => {
            const raw = partial.projectionDestination;
            if (!raw || typeof raw !== "object")
                return null;
            const obj = raw;
            const connectionId = String(obj.connectionId ?? "").trim();
            const provider = String(obj.provider ?? "").trim().toLowerCase();
            const externalCalendarId = String(obj.externalCalendarId ?? "").trim();
            if (!connectionId || !provider || !externalCalendarId)
                return null;
            const displayName = String(obj.displayName ?? "").trim() || externalCalendarId;
            return { connectionId, provider, externalCalendarId, displayName };
        })(),
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
