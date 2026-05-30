import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { useOnboardingState } from "@/state/OnboardingContext";
import { useIntegrationState } from "@/state/IntegrationContext";
import { StepShell } from "@/features/onboarding/StepShell";
import "./onboarding/calendars-projection.css";
import { CalendarsProjectionStep } from "./onboarding/CalendarsProjectionStep";
import { hasConsumerMicrosoftConnection, isTeamsDisabledByRuntimeCapability, toCapabilityAwareUnsupportedMessage, unsupportedCapabilityMessage, } from "@/lib/conferencingCapabilities";
const DEFAULT_STEPS = ["Meeting details", "Calendars & projection", "Schedule", "How you'll meet", "Review & Publish"];
const ANON_STEPS = ["Meeting details", "Your schedule", "How you'll meet", "Review & Publish"];
const ANON_STEP_META = [
    {
        label: "Meeting details",
        hint: "Name & description",
        asideTitle: (_jsxs(_Fragment, { children: ["Let's set up your ", _jsx("em", { children: "booking link." })] })),
        blurb: "Add host email, event details, and a short note guests will see.",
    },
    {
        label: "Your schedule",
        hint: "Weekly rhythm",
        asideTitle: (_jsxs(_Fragment, { children: ["The shape of ", _jsx("em", { children: "your week." })] })),
        blurb: "Define weekly availability manually, with timezone and optional date overrides.",
    },
    {
        label: "How you'll meet",
        hint: "Conferencing & duration",
        asideTitle: (_jsxs(_Fragment, { children: ["Video call, phone, ", _jsx("em", { children: "or in person?" })] })),
        blurb: "Conferencing options are shown based on host email provider and selected mode.",
    },
    {
        label: "Review & publish",
        hint: "Share your link",
        asideTitle: (_jsxs(_Fragment, { children: ["Almost there. ", _jsx("em", { children: "Take a calm look." })] })),
        blurb: "Review everything before publishing your anonymous booking link.",
    },
];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LONG = {
    MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const LOCATIONS = [
    { id: "meet", name: "Google Meet", sub: "From your calendar", tint: "sage", conferencing: "google_meet" },
    { id: "teams", name: "Microsoft Teams", sub: "Auto-generated Teams room", tint: "blush", conferencing: "microsoft_teams" },
    { id: "zoom", name: "Zoom", sub: "Auto-generated link", tint: "peach", conferencing: "zoom" },
    { id: "custom", name: "Custom URL", sub: "Paste your own link", tint: "lilac", conferencing: "custom_url" },
    { id: "phone", name: "Phone call", sub: "Use guest's number", tint: "butter", conferencing: "none" },
    { id: "in-person", name: "In person", sub: "Office, café, studio", tint: "blush", conferencing: "none" },
];
const DURATIONS = [15, 30, 45, 60, 90];
function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function hourFromTime(t) {
    const [h, m] = t.split(":").map(Number);
    return h + m / 60;
}
function detectEmailProvider(email) {
    const domain = email.trim().toLowerCase().split("@")[1] ?? "";
    if (!domain)
        return "unknown";
    if (domain === "gmail.com" || domain === "googlemail.com" || domain.includes("google"))
        return "google";
    if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain))
        return "microsoft_personal";
    if (domain.endsWith(".onmicrosoft.com")
        || domain === "microsoft.com"
        || domain === "office365.com"
        || domain.includes("outlook")
        || domain.includes("microsoft"))
        return "microsoft_work";
    return "unknown";
}
// ── Location icon glyphs ───────────────────────────────────────────────────
function LocGlyph({ kind }) {
    const s = { stroke: "#2B1F3D", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
    if (kind === "zoom")
        return _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: [_jsx("rect", { x: "2", y: "4", width: "9", height: "8", rx: "2", ...s }), _jsx("path", { d: "M11 8l4-2v6l-4-2", ...s })] });
    if (kind === "meet")
        return _jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: _jsx("path", { d: "M3 4h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6l-3 2v-2H3z", ...s }) });
    if (kind === "phone")
        return _jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: _jsx("path", { d: "M4 3h2l1.5 3-1.5 1.5a8 8 0 0 0 3 3L10.5 9 13.5 10.5V13h-2A8 8 0 0 1 3 4z", ...s }) });
    if (kind === "custom")
        return _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: [_jsx("path", { d: "M6 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1", ...s }), _jsx("path", { d: "M10 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1", ...s })] });
    return _jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", children: _jsx("path", { d: "M2 13h12M3 13V7l5-4 5 4v6M6 13V9h4v4", ...s }) });
}
// ── Live preview card ──────────────────────────────────────────────────────
function LivePreview({ eventName, duration, location, username }) {
    const slug = slugify(eventName) || "your-event";
    const locName = (LOCATIONS.find((l) => l.id === location) || LOCATIONS[0]).name;
    return (_jsxs("div", { className: "onb-live-preview", children: [_jsxs("div", { children: [_jsx("div", { className: "prev-lbl", children: "Your booking link \u00B7 preview" }), _jsxs("div", { className: "prev-url", children: ["bunnycal.com / ", _jsx("span", { className: "slug", children: username }), " / ", slug] }), _jsx("div", { className: "prev-name", children: eventName || "Your event" }), _jsxs("div", { className: "prev-meta", children: [duration, " min \u00B7 ", locName] })] }), _jsx("div", { className: "prev-icon", children: _jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinecap: "round" }), _jsx("path", { d: "M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinecap: "round" }), _jsx("path", { d: "M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("circle", { cx: "10", cy: "16.4", r: ".7", fill: "#2B1F3D" }), _jsx("circle", { cx: "14", cy: "16.4", r: ".7", fill: "#2B1F3D" })] }) })] }));
}
// ── Main page component ────────────────────────────────────────────────────
export function OnboardingEventPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const { draft, setDraft, goToStep, reset } = useOnboardingState();
    const flowMode = searchParams.get("mode") === "anonymous" ? "anonymous" : "default";
    const isAnonymousFlow = flowMode === "anonymous";
    const steps = isAnonymousFlow ? ANON_STEPS : DEFAULT_STEPS;
    const maxStep = steps.length;
    const availabilityStepIndex = isAnonymousFlow ? 1 : 2;
    const conferencingStepIndex = isAnonymousFlow ? 2 : 3;
    const reviewStepIndex = isAnonymousFlow ? 3 : 4;
    const { calendarConnections, conferencingRuntime, error: integrationsError, } = useIntegrationState();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [overrideMode, setOverrideMode] = useState("UNAVAILABLE");
    const [overrideDate, setOverrideDate] = useState("");
    const [overrideStartTime, setOverrideStartTime] = useState("09:00");
    const [overrideEndTime, setOverrideEndTime] = useState("13:00");
    const requestedStep = Number(searchParams.get("step"));
    const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= maxStep
        ? requestedStep - 1
        : Math.min(draft.currentStep, maxStep - 1);
    useEffect(() => {
        if (step !== draft.currentStep)
            goToStep(step);
    }, [draft.currentStep, goToStep, step]);
    const slug = useMemo(() => slugify(draft.eventName || "event"), [draft.eventName]);
    const previewPath = useMemo(() => toPublicBookingPath(user?.username || "yourname", slug), [slug, user?.username]);
    const setStep = (idx) => {
        goToStep(idx);
        const nextParams = { step: String(idx + 1) };
        if (isAnonymousFlow)
            nextParams.mode = "anonymous";
        setSearchParams(nextParams, { replace: true });
    };
    const next = async () => {
        setError(null);
        if (step === availabilityStepIndex) {
            try {
                const rules = DAYS.filter((day) => draft.weeklyRules[day].enabled).map((day) => ({
                    dayOfWeek: day,
                    startTime: draft.weeklyRules[day].startTime,
                    endTime: draft.weeklyRules[day].endTime,
                }));
                if (!isAnonymousFlow) {
                    await api.upsertAvailabilityRules({ rules });
                    if (draft.overrides.length > 0) {
                        await Promise.all(draft.overrides.map((ovr) => api.createAvailabilityOverride({
                            date: ovr.date,
                            available: ovr.isAvailable ?? false,
                            isAvailable: ovr.isAvailable ?? false,
                            ...(ovr.isAvailable ? { startTime: ovr.startTime, endTime: ovr.endTime } : {}),
                        })));
                    }
                }
            }
            catch (e) {
                console.error(e);
                setError("Unable to save availability and overrides.");
                return;
            }
        }
        if (step < reviewStepIndex)
            setStep(step + 1);
    };
    const back = () => {
        if (step > 0)
            setStep(step - 1);
    };
    const publish = async () => {
        setSaving(true);
        setError(null);
        try {
            const conferencingProvider = draft.conferencingProvider ?? "google_meet";
            const customConferenceUrl = conferencingProvider === "custom_url" ? draft.customConferenceUrl.trim() : "";
            if (isAnonymousFlow) {
                const rules = DAYS.filter((day) => draft.weeklyRules[day].enabled).map((day) => ({
                    dayOfWeek: day,
                    startTime: draft.weeklyRules[day].startTime,
                    endTime: draft.weeklyRules[day].endTime,
                }));
                const created = await api.createDraftHost({
                    email: draft.hostEmail.trim().toLowerCase(),
                    displayName: draft.hostDisplayName.trim() || draft.hostEmail.split("@")[0] || "Host",
                    timezone: draft.timezone,
                    eventName: draft.eventName,
                    description: draft.description,
                    location: conferencingProvider === "custom_url" && customConferenceUrl
                        ? customConferenceUrl
                        : (LOCATIONS.find((item) => item.id === draft.location)?.name ?? draft.location),
                    durationMinutes: draft.duration,
                    slotIntervalMinutes: draft.duration,
                    holdDurationMinutes: 5,
                    rules,
                    overrides: draft.overrides,
                });
                const absoluteLink = toAbsoluteUrl(created.publicUrl || previewPath);
                sessionStorage.setItem("createdEventLink", absoluteLink);
                reset();
                navigate("/onboarding/success");
                return;
            }
            const availabilityCalendars = draft.availabilityCalendars
                .map((selection) => {
                if (!selection.connectionId || !selection.provider || !selection.externalCalendarId)
                    return null;
                return {
                    connectionId: selection.connectionId,
                    provider: selection.provider,
                    externalCalendarId: selection.externalCalendarId,
                };
            })
                .filter((item) => Boolean(item));
            if (availabilityCalendars.length === 0) {
                setError("Pick at least one availability calendar.");
                setSaving(false);
                return;
            }
            const projection = draft.projectionDestination;
            if (!projection || !projection.connectionId || !projection.provider || !projection.externalCalendarId) {
                setError("Please select a booking destination calendar.");
                setSaving(false);
                return;
            }
            const projectionDestination = {
                provider: projection.provider,
                connectionId: projection.connectionId,
                calendarId: projection.externalCalendarId,
            };
            if (!allowedConferencingProviders.has(conferencingProvider)) {
                setError("Selected conferencing option is not supported for the chosen booking destination calendar.");
                setSaving(false);
                return;
            }
            const createPayload = {
                name: draft.eventName,
                description: draft.description,
                location: draft.location,
                durationMinutes: draft.duration,
                bufferBeforeMinutes: 0,
                bufferAfterMinutes: 0,
                slotIntervalMinutes: draft.duration,
                minNoticeMinutes: 60,
                maxAdvanceDays: 60,
                holdDurationMinutes: 5,
                slug,
                availabilityCalendars,
                conference: {
                    enabled: conferencingProvider !== "none",
                    provider: conferencingProvider === "custom_url" ? "custom" : conferencingProvider,
                    ...(customConferenceUrl ? { customUrl: customConferenceUrl } : {}),
                },
                projectionDestination,
            };
            const created = await api.createEventType(createPayload);
            const absoluteLink = created.link ? toAbsoluteUrl(created.link) : toAbsoluteUrl(previewPath);
            sessionStorage.setItem("createdEventLink", absoluteLink);
            reset();
            navigate("/onboarding/success");
        }
        catch (e) {
            console.error(e);
            setError(toCapabilityAwareUnsupportedMessage(e, "Unable to create event type."));
        }
        finally {
            setSaving(false);
        }
    };
    const toLabel = (provider) => provider.split(/[_-]/g).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
    // /integrations/calendar/status returns connections[].calendars[] inventory.
    // Step 4 must select from that inventory and persist calendar.calendarId verbatim.
    const availabilityCalendarRows = calendarConnections
        .filter((c) => c.status.toUpperCase() === "CONNECTED" && c.roles.availabilityEligible)
        .flatMap((c) => {
        const provider = c.provider.toLowerCase();
        const connectionLabel = c.email || c.displayName || c.connectionId;
        return (c.calendars ?? [])
            .filter((calendar) => Boolean(calendar.calendarId && calendar.canRead && calendar.isPrimary))
            .map((calendar) => ({
            key: `${c.connectionId}:${calendar.calendarId}`,
            connectionId: c.connectionId,
            provider,
            externalCalendarId: calendar.calendarId,
            canWrite: calendar.canWrite,
            label: calendar.name || calendar.calendarId,
            connectionLabel,
        }));
    })
        .filter((row) => Boolean(row));
    const selectionKey = (item) => `${item.connectionId}:${item.externalCalendarId}`;
    const selectedCalendarKeys = new Set(draft.availabilityCalendars.map(selectionKey));
    const projectionKey = draft.projectionDestination ? selectionKey(draft.projectionDestination) : "";
    const toggleAvailabilityCalendar = (row) => {
        setDraft((prev) => {
            const key = selectionKey(row);
            const exists = prev.availabilityCalendars.some((item) => selectionKey(item) === key);
            const nextSelection = exists
                ? prev.availabilityCalendars.filter((item) => selectionKey(item) !== key)
                : [...prev.availabilityCalendars, {
                        connectionId: row.connectionId,
                        provider: row.provider,
                        externalCalendarId: row.externalCalendarId,
                        displayName: row.label,
                    }];
            // Projection destination is independent of the availability list — never
            // clobber or clear it here.
            return {
                ...prev,
                availabilityCalendars: nextSelection,
            };
        });
    };
    const setProjectionDestinationByKey = (key) => {
        setDraft((prev) => {
            const row = availabilityCalendarRows.find((r) => r.key === key);
            if (!row)
                return { ...prev, projectionDestination: null };
            return {
                ...prev,
                projectionDestination: {
                    connectionId: row.connectionId,
                    provider: row.provider,
                    externalCalendarId: row.externalCalendarId,
                    displayName: row.label,
                },
            };
        });
    };
    const username = user?.username ?? "you";
    const overrideValidationMessage = useMemo(() => {
        if (!overrideDate)
            return "Choose a date.";
        if (overrideMode === "CUSTOM_HOURS") {
            if (!overrideStartTime || !overrideEndTime)
                return "Choose start and end time.";
            if (overrideEndTime <= overrideStartTime)
                return "End time must be after start time.";
        }
        return "";
    }, [overrideDate, overrideEndTime, overrideMode, overrideStartTime]);
    const teamsDisabledByRuntime = isTeamsDisabledByRuntimeCapability(calendarConnections, conferencingRuntime);
    const hasConsumerMsa = hasConsumerMicrosoftConnection(calendarConnections);
    const emailProvider = detectEmailProvider(draft.hostEmail);
    const projectionProvider = (draft.projectionDestination?.provider ?? "").toLowerCase();
    const teamsEligibleForProjection = projectionProvider === "microsoft" && !teamsDisabledByRuntime;
    const conferencingOptionReasons = {
        google_meet: isAnonymousFlow
            ? (emailProvider === "google" ? "" : "Google Meet appears for Google host email.")
            : (projectionProvider === "google" ? "" : "Google Meet requires Google Calendar projection."),
        microsoft_teams: isAnonymousFlow
            ? (emailProvider === "microsoft_work" ? "" : "Teams appears for Microsoft work or school email.")
            : teamsEligibleForProjection
                ? ""
                : projectionProvider !== "microsoft"
                    ? "Microsoft Teams requires Microsoft Calendar projection."
                    : "Microsoft Teams requires a Microsoft 365 work or school account.",
        zoom: isAnonymousFlow
            ? ""
            : (projectionProvider === "google" || projectionProvider === "microsoft")
                ? ""
                : "Select a booking destination calendar first.",
        custom_url: "",
        none: "",
    };
    const allowedConferencingProviders = (() => {
        if (isAnonymousFlow) {
            if (emailProvider === "google")
                return new Set(["google_meet", "zoom", "custom_url", "none"]);
            if (emailProvider === "microsoft_work")
                return new Set(["microsoft_teams", "zoom", "custom_url", "none"]);
            return new Set(["zoom", "custom_url", "none"]);
        }
        if (projectionProvider === "google")
            return new Set(["google_meet", "zoom", "custom_url", "none"]);
        if (projectionProvider === "microsoft") {
            const allowed = new Set(["zoom", "custom_url", "none"]);
            if (teamsEligibleForProjection)
                allowed.add("microsoft_teams");
            return allowed;
        }
        return new Set(["custom_url", "none"]);
    })();
    const visibleLocations = isAnonymousFlow
        ? LOCATIONS.filter((item) => allowedConferencingProviders.has(item.conferencing))
        : LOCATIONS;
    const conferencingProviderValid = allowedConferencingProviders.has(draft.conferencingProvider);
    const stepComplete = (index) => {
        if (index === 0) {
            if (isAnonymousFlow) {
                const hasHostEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.hostEmail.trim());
                return hasHostEmail && draft.eventName.trim().length > 1 && draft.duration >= 15;
            }
            return draft.eventName.trim().length > 1;
        }
        if (index === 1 && !isAnonymousFlow) {
            if (draft.availabilityCalendars.length === 0)
                return false;
            const target = draft.projectionDestination;
            return Boolean(target && target.connectionId && target.provider && target.externalCalendarId);
        }
        if (index === availabilityStepIndex)
            return DAYS.some((d) => draft.weeklyRules[d].enabled);
        if (index === conferencingStepIndex) {
            if (draft.location.trim().length < 1 || draft.duration < 15)
                return false;
            if (!conferencingProviderValid)
                return false;
            if (draft.conferencingProvider === "custom_url")
                return draft.customConferenceUrl.trim().length > 0;
            return true;
        }
        return false;
    };
    const addOverride = () => {
        if (overrideValidationMessage)
            return;
        const next = overrideMode === "UNAVAILABLE"
            ? { date: overrideDate, isAvailable: false }
            : { date: overrideDate, isAvailable: true, startTime: overrideStartTime, endTime: overrideEndTime };
        setDraft((prev) => ({
            ...prev,
            overrides: [...prev.overrides.filter((o) => o.date !== next.date), next].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        setOverrideDate("");
        setOverrideStartTime("09:00");
        setOverrideEndTime("13:00");
    };
    const removeOverride = (date) => {
        setDraft((prev) => ({ ...prev, overrides: prev.overrides.filter((o) => o.date !== date) }));
    };
    return (_jsxs(StepShell, { steps: steps, currentStep: step, stepComplete: stepComplete, onStepChange: setStep, error: error, onBack: back, onNext: next, onPublish: publish, publishing: saving, stepMeta: isAnonymousFlow ? ANON_STEP_META : undefined, children: [step === 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 01 \u00B7 Basic details" }), _jsxs("h2", { children: ["What should we call ", _jsx("em", { children: "this conversation?" })] }), _jsx("p", { children: "A short name and a calm note. Invitees see this when your link opens." })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }, children: [isAnonymousFlow && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "hostEmail", children: "Host email" }), _jsx("input", { id: "hostEmail", type: "email", className: "onb-input", placeholder: "name@company.com", value: draft.hostEmail, onChange: (e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value })) })] }), _jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "hostDisplayName", children: "Host name" }), _jsx("input", { id: "hostDisplayName", className: "onb-input", placeholder: "Host name", value: draft.hostDisplayName, onChange: (e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value })) })] })] })), _jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "eventName", children: "Event name" }), _jsx("input", { id: "eventName", className: "onb-input onb-input-xl", placeholder: "Intro chat", value: draft.eventName, onChange: (e) => setDraft((prev) => ({ ...prev, eventName: e.target.value })) }), _jsx("span", { className: "hint", children: "e.g. \"Intro chat\", \"Quarterly walk\", \"Office hours\"" })] }), _jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "description", children: "A short note" }), _jsx("textarea", { id: "description", className: "onb-textarea", placeholder: "A gentle line so invitees know what to expect. Optional.", value: draft.description, onChange: (e) => setDraft((prev) => ({ ...prev, description: e.target.value })) })] }), isAnonymousFlow && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Duration" }), _jsx("div", { className: "onb-chips-row", children: DURATIONS.map((d) => (_jsxs("button", { type: "button", className: "onb-chip-btn" + (draft.duration === d ? " selected" : ""), onClick: () => setDraft((prev) => ({ ...prev, duration: d })), children: [d, " min"] }, d))) })] }), _jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "timezone", children: "Timezone" }), _jsx("input", { id: "timezone", className: "onb-input", value: draft.timezone, onChange: (e) => setDraft((prev) => ({ ...prev, timezone: e.target.value })) })] })] }))] }), _jsx(LivePreview, { eventName: draft.eventName, duration: draft.duration, location: draft.location, username: username })] })), !isAnonymousFlow && step === 1 && (_jsx(CalendarsProjectionStep, { rows: availabilityCalendarRows, selectedKeys: selectedCalendarKeys, projectionKey: projectionKey, integrationsError: integrationsError, onToggleAvailability: toggleAvailabilityCalendar, onSelectProjection: setProjectionDestinationByKey, toLabel: toLabel })), step === availabilityStepIndex && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: isAnonymousFlow ? "Step 02 · Availability" : "Step 03 · Availability" }), _jsxs("h2", { children: ["The shape ", _jsx("em", { children: "of your week." })] }), _jsx("p", { children: "Quiet mornings, soft afternoons, no Fridays \u2014 define the rhythm you actually live by. BunnyCal honors it gently." })] }), isAnonymousFlow && (_jsxs("div", { className: "onb-field", style: { marginBottom: 14 }, children: [_jsx("label", { className: "lbl", htmlFor: "timezone-step", children: "Timezone" }), _jsx("input", { id: "timezone-step", className: "onb-input", value: draft.timezone, onChange: (e) => setDraft((prev) => ({ ...prev, timezone: e.target.value })) })] })), _jsx("div", { className: "onb-avail-rows", children: DAYS.map((day) => {
                            const rule = draft.weeklyRules[day];
                            const startH = hourFromTime(rule.startTime);
                            const endH = hourFromTime(rule.endTime);
                            return (_jsxs("div", { className: "onb-avail-row" + (rule.enabled ? "" : " off"), children: [_jsxs("div", { className: "day", children: [DAY_LONG[day], _jsx("span", { className: "sub", children: rule.enabled ? "Available" : "Day off" })] }), _jsx("div", { className: "bar", "aria-hidden": "true", children: Array.from({ length: 24 }).map((_, h) => {
                                            const on = rule.enabled && h >= Math.floor(startH) && h < Math.ceil(endH);
                                            return _jsx("div", { className: "cell" + (on ? " on" : "") }, h);
                                        }) }), _jsx("input", { type: "time", value: rule.startTime, disabled: !rule.enabled, onChange: (e) => setDraft((prev) => ({
                                            ...prev,
                                            weeklyRules: {
                                                ...prev.weeklyRules,
                                                [day]: { ...prev.weeklyRules[day], startTime: e.target.value },
                                            },
                                        })), "aria-label": `${DAY_LONG[day]} start time` }), _jsx("input", { type: "time", value: rule.endTime, disabled: !rule.enabled, onChange: (e) => setDraft((prev) => ({
                                            ...prev,
                                            weeklyRules: {
                                                ...prev.weeklyRules,
                                                [day]: { ...prev.weeklyRules[day], endTime: e.target.value },
                                            },
                                        })), "aria-label": `${DAY_LONG[day]} end time` }), _jsx("button", { type: "button", role: "switch", "aria-checked": rule.enabled, className: "onb-toggle" + (rule.enabled ? " on" : ""), onClick: () => setDraft((prev) => ({
                                            ...prev,
                                            weeklyRules: {
                                                ...prev.weeklyRules,
                                                [day]: { ...prev.weeklyRules[day], enabled: !rule.enabled },
                                            },
                                        })), "aria-label": `Toggle ${DAY_LONG[day]}` })] }, day));
                        }) }), _jsxs("div", { style: {
                            marginTop: 28, padding: 18, background: "var(--ivory-2)",
                            border: "1px solid var(--border)", borderRadius: 14,
                            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                        }, children: [_jsx("span", { style: {
                                    width: 36, height: 36, borderRadius: 12,
                                    background: "var(--sage-soft)", border: "1px solid var(--sage)",
                                    display: "grid", placeItems: "center", flexShrink: 0,
                                }, children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: _jsx("path", { d: "M2 8.5L6 12.5L14 4.5", stroke: "var(--plum-700)", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsxs("div", { style: { flex: 1, minWidth: 240 }, children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Protected by default" }), _jsx("div", { style: { marginTop: 4, color: "var(--plum-700)", fontSize: 14 }, children: "BunnyCal won't offer times outside these hours. You can also set one-off overrides below." })] })] }), _jsxs("div", { style: {
                            marginTop: 16,
                            padding: 18,
                            background: "var(--cream)",
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                        }, children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Date overrides" }), _jsx("p", { style: { marginTop: 8, marginBottom: 14, color: "var(--plum-500)", fontSize: 13.5 }, children: "Add blocked days or custom-hours exceptions for holidays, travel, and special schedules." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("button", { type: "button", className: "onb-chip-btn" + (overrideMode === "UNAVAILABLE" ? " selected" : ""), onClick: () => setOverrideMode("UNAVAILABLE"), children: "Block date" }), _jsx("button", { type: "button", className: "onb-chip-btn" + (overrideMode === "CUSTOM_HOURS" ? " selected" : ""), onClick: () => setOverrideMode("CUSTOM_HOURS"), children: "Custom hours" })] }), _jsxs("div", { style: { marginTop: 12, display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "1fr 1fr 1fr auto" : "1fr auto", gap: 8, alignItems: "end" }, children: [_jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Date" }), _jsx("input", { type: "date", className: "onb-input", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value) })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Start" }), _jsx("input", { type: "time", className: "onb-input", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value) })] }), _jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "End" }), _jsx("input", { type: "time", className: "onb-input", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value) })] })] })), _jsx("button", { type: "button", className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: addOverride, disabled: Boolean(overrideValidationMessage), children: "Add" })] }), overrideValidationMessage && (_jsx("p", { style: { marginTop: 10, fontSize: 12.5, color: "#991B1B" }, role: "alert", children: overrideValidationMessage })), _jsx("div", { style: { marginTop: 12, display: "grid", gap: 8 }, children: draft.overrides.length === 0 ? (_jsx("p", { style: { margin: 0, color: "var(--plum-400)", fontSize: 13 }, children: "No overrides yet." })) : draft.overrides.map((ovr) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, background: "var(--ivory-2)", padding: "10px 12px" }, children: [_jsxs("div", { style: { color: "var(--plum-700)", fontSize: 13.5 }, children: [_jsx("strong", { children: ovr.date }), " ", _jsx("span", { style: { color: "var(--plum-500)" }, children: ovr.isAvailable ? `· ${ovr.startTime} – ${ovr.endTime}` : "· Unavailable" })] }), _jsx("button", { type: "button", className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: () => removeOverride(ovr.date), children: "Remove" })] }, ovr.date))) })] })] })), step === conferencingStepIndex && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: isAnonymousFlow ? "Step 03 · Conferencing" : "Step 04 · Conferencing" }), _jsxs("h2", { children: ["How should guests ", _jsx("em", { children: "join this meeting?" })] }), _jsx("p", { children: isAnonymousFlow ? "Options depend on host email provider, with Zoom always available." : "Options are filtered by the selected projection provider and account capabilities." })] }), !isAnonymousFlow && !draft.projectionDestination && (_jsx("p", { className: "onb-error", children: "Select a booking destination calendar in Step 02 to unlock conferencing options." })), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 28, maxWidth: 820 }, children: [_jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Location & conferencing" }), _jsx("div", { className: "onb-radios", children: visibleLocations.map((l) => {
                                            const isAllowed = allowedConferencingProviders.has(l.conferencing);
                                            const disabledReason = isAllowed ? "" : (conferencingOptionReasons[l.conferencing] ?? "Unavailable for current projection.");
                                            const disabled = !isAllowed && !isAnonymousFlow;
                                            const onPick = () => {
                                                if (disabled)
                                                    return;
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    location: l.id,
                                                    conferencingProvider: l.conferencing,
                                                }));
                                            };
                                            return (_jsxs("button", { type: "button", className: "onb-radio-card" + (draft.location === l.id ? " selected" : ""), onClick: onPick, disabled: disabled, "aria-disabled": disabled, style: disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined, title: !isAnonymousFlow && disabled ? disabledReason : undefined, children: [_jsx("span", { className: "glyph", style: {
                                                            background: `var(--${l.tint}-soft)`,
                                                            borderColor: `var(--${l.tint})`,
                                                        }, children: _jsx(LocGlyph, { kind: l.id }) }), _jsx("span", { className: "name", children: l.name }), _jsxs("span", { className: "sub", children: [l.sub, !isAnonymousFlow && disabled ? ` · ${disabledReason}` : ""] })] }, l.id));
                                        }) }), !isAnonymousFlow && projectionProvider === "microsoft" && hasConsumerMsa && (_jsx("div", { className: "hint", style: { marginTop: 8 }, children: unsupportedCapabilityMessage() })), draft.conferencingProvider === "custom_url" && (_jsx("div", { style: { marginTop: 12 }, children: _jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Custom meeting URL" }), _jsx("input", { type: "url", className: "onb-input", placeholder: "https://meet.example.com/your-room", value: draft.customConferenceUrl, onChange: (e) => setDraft((prev) => ({ ...prev, customConferenceUrl: e.target.value })) }), _jsx("span", { className: "hint", children: "This link is shared with guests on every booking." })] }) }))] }), !isAnonymousFlow && (_jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Duration" }), _jsx("div", { className: "onb-chips-row", children: DURATIONS.map((d) => (_jsxs("button", { type: "button", className: "onb-chip-btn" + (draft.duration === d ? " selected" : ""), onClick: () => setDraft((prev) => ({ ...prev, duration: d })), children: [d, " min"] }, d))) }), _jsx("span", { className: "hint", children: "BunnyCal adds a 5-minute hold and a 15-minute buffer automatically." })] }))] })] })), step === reviewStepIndex && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: isAnonymousFlow ? "Step 04 · Review & publish" : "Step 05 · Review & publish" }), _jsxs("h2", { children: ["One quiet look ", _jsx("em", { children: "before it goes live." })] }), _jsx("p", { children: "You can adjust anything later from the dashboard." })] }), _jsxs("div", { className: "onb-review-card", children: [_jsxs("div", { className: "rev-header", children: [_jsxs("div", { children: [_jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Booking link" }), _jsx("h3", { className: "ev-name", style: { marginTop: 10 }, children: draft.eventName || _jsx("em", { children: "Your event" }) }), _jsxs("div", { className: "ev-url", children: ["bunnycal.com / ", username, " / ", slug] })] }), _jsxs("span", { className: "onb-badge synced", children: [_jsx("span", { className: "dot" }), "Ready to publish"] })] }), _jsxs("div", { className: "onb-review-rows", children: [isAnonymousFlow && (_jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Host email" }), _jsx("span", { className: "val", children: draft.hostEmail || _jsx("em", { children: "Not set" }) })] })), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Duration" }), _jsxs("span", { className: "val", children: [draft.duration, " minutes"] })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Location" }), _jsx("span", { className: "val", children: (LOCATIONS.find((l) => l.id === draft.location) || LOCATIONS[0]).name })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Available days" }), _jsx("span", { className: "val", children: DAYS.filter((d) => draft.weeklyRules[d].enabled).length === 0
                                                    ? _jsx("em", { children: "No days enabled" })
                                                    : DAYS.filter((d) => draft.weeklyRules[d].enabled)
                                                        .map((d) => DAY_LONG[d].slice(0, 3)).join(" · ") })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Default hours" }), _jsx("span", { className: "val", children: (() => {
                                                    const enabledDay = DAYS.find((d) => draft.weeklyRules[d].enabled);
                                                    if (!enabledDay)
                                                        return _jsx("em", { children: "Not set" });
                                                    const r = draft.weeklyRules[enabledDay];
                                                    return `${r.startTime} – ${r.endTime}`;
                                                })() })] }), !isAnonymousFlow && (_jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Synced calendars" }), _jsx("span", { className: "val", children: (() => {
                                                    const connected = [];
                                                    calendarConnections.forEach((connection) => {
                                                        if (connection.status.toUpperCase() === "CONNECTED")
                                                            connected.push(toLabel(connection.provider));
                                                    });
                                                    return connected.length === 0 ? _jsx("em", { children: "None connected" }) : connected.join(" · ");
                                                })() })] })), !isAnonymousFlow && (_jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Availability calendars" }), _jsx("span", { className: "val", children: draft.availabilityCalendars.length === 0
                                                    ? _jsx("em", { children: "None selected" })
                                                    : draft.availabilityCalendars
                                                        .map((selection) => `${toLabel(selection.provider)} · ${selection.displayName || selection.externalCalendarId}`)
                                                        .join(" · ") })] })), !isAnonymousFlow && (_jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Booking destination" }), _jsx("span", { className: "val", children: draft.projectionDestination
                                                    ? `${toLabel(draft.projectionDestination.provider)} · ${draft.projectionDestination.displayName || draft.projectionDestination.externalCalendarId}`
                                                    : _jsx("em", { children: "None selected" }) })] })), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Conferencing" }), _jsxs("span", { className: "val", children: [draft.conferencingProvider === "google_meet" && "Google Meet", draft.conferencingProvider === "microsoft_teams" && "Microsoft Teams", draft.conferencingProvider === "zoom" && "Zoom", draft.conferencingProvider === "custom_url" && (draft.customConferenceUrl ? draft.customConferenceUrl : "Custom URL"), draft.conferencingProvider === "none" && "No video link"] })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Buffer & hold" }), _jsx("span", { className: "val", children: "15 min buffer \u00B7 5 min hold" })] })] })] }), _jsxs("div", { style: { marginTop: 24, display: "flex", alignItems: "center", gap: 14, color: "var(--plum-500)", fontSize: 14 }, children: [_jsxs("span", { className: "onb-badge ok", children: [_jsx("span", { className: "dot" }), "Your draft is safe"] }), _jsx("span", { children: "Publishing will make your link live for invitees. Nothing else changes." })] })] }))] }));
}
