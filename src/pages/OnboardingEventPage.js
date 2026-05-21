import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { useOnboardingState } from "@/state/OnboardingContext";
import { useIntegrationState } from "@/state/IntegrationContext";
import { StepShell } from "@/features/onboarding/StepShell";
const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LONG = {
    MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const LOCATIONS = [
    { id: "meet", name: "Google Meet", sub: "From your calendar", tint: "sage", conferencing: "GOOGLE_MEET" },
    { id: "zoom", name: "Zoom", sub: "Auto-generated link", tint: "peach", conferencing: "ZOOM" },
    { id: "custom", name: "Custom URL", sub: "Paste your own link", tint: "lilac", conferencing: "CUSTOM_URL" },
    { id: "phone", name: "Phone call", sub: "Use guest's number", tint: "butter", conferencing: "NONE" },
    { id: "in-person", name: "In person", sub: "Office, café, studio", tint: "blush", conferencing: "NONE" },
];
const DURATIONS = [15, 30, 45, 60, 90];
function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function hourFromTime(t) {
    const [h, m] = t.split(":").map(Number);
    return h + m / 60;
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
// ── Provider icon glyphs ───────────────────────────────────────────────────
function ProviderGlyph({ id }) {
    const s = { stroke: "#2B1F3D", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
    if (id === "google")
        return _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", children: [_jsx("rect", { x: "2.5", y: "3.5", width: "13", height: "11", rx: "2", ...s }), _jsx("path", { d: "M2.5 7h13M6 1.5v3M12 1.5v3", ...s })] });
    if (id === "microsoft")
        return _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", children: [_jsx("rect", { x: "3", y: "3", width: "12", height: "12", rx: "2", ...s }), _jsx("path", { d: "M3 9h12M9 3v12", ...s })] });
    return _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", children: [_jsx("rect", { x: "2.5", y: "5", width: "9", height: "8", rx: "2", ...s }), _jsx("path", { d: "M11.5 8l4-2v6l-4-2", ...s })] });
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
    const { calendarStatus, conferencingStatus, getCalendarProviderStatus, getConferencingProviderStatus, hasConferencingCapability, startConnect, disconnectProvider, pendingAction, banner, clearBanner, error: integrationsError, } = useIntegrationState();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [overrideMode, setOverrideMode] = useState("UNAVAILABLE");
    const [overrideDate, setOverrideDate] = useState("");
    const [overrideStartTime, setOverrideStartTime] = useState("09:00");
    const [overrideEndTime, setOverrideEndTime] = useState("13:00");
    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const requestedStep = Number(searchParams.get("step"));
    const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5
        ? requestedStep - 1
        : draft.currentStep;
    useEffect(() => {
        if (step !== draft.currentStep)
            goToStep(step);
    }, [draft.currentStep, goToStep, step]);
    const slug = useMemo(() => slugify(draft.eventName || "event"), [draft.eventName]);
    const previewPath = useMemo(() => toPublicBookingPath(user?.username || "yourname", slug), [slug, user?.username]);
    const setStep = (idx) => {
        goToStep(idx);
        setSearchParams({ step: String(idx + 1) }, { replace: true });
    };
    const next = async () => {
        setError(null);
        if (step === 2) {
            try {
                const rules = DAYS.filter((day) => draft.weeklyRules[day].enabled).map((day) => ({
                    dayOfWeek: day,
                    startTime: draft.weeklyRules[day].startTime,
                    endTime: draft.weeklyRules[day].endTime,
                }));
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
            catch (e) {
                console.error(e);
                setError("Unable to save availability and overrides.");
                return;
            }
        }
        if (step < 4)
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
            const conferencingProvider = draft.conferencingProvider ?? "GOOGLE_MEET";
            const customConferenceUrl = conferencingProvider === "CUSTOM_URL" ? draft.customConferenceUrl.trim() : "";
            const created = await api.createEventType({
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
                conferencingProvider,
                ...(customConferenceUrl ? { customConferenceUrl } : {}),
            });
            const absoluteLink = created.link ? toAbsoluteUrl(created.link) : toAbsoluteUrl(previewPath);
            sessionStorage.setItem("createdEventLink", absoluteLink);
            reset();
            navigate("/onboarding/success");
        }
        catch (e) {
            console.error(e);
            setError("Unable to create event type.");
        }
        finally {
            setSaving(false);
        }
    };
    const stepComplete = (index) => {
        if (index === 0)
            return draft.eventName.trim().length > 1;
        if (index === 1) {
            if (draft.location.trim().length < 1 || draft.duration < 15)
                return false;
            if (draft.conferencingProvider === "CUSTOM_URL")
                return draft.customConferenceUrl.trim().length > 0;
            return true;
        }
        if (index === 2)
            return DAYS.some((d) => draft.weeklyRules[d].enabled);
        if (index === 3)
            return (Object.keys(calendarStatus).some((provider) => getCalendarProviderStatus(provider) === "connected") ||
                Object.keys(conferencingStatus).some((provider) => getConferencingProviderStatus(provider) === "connected"));
        return false;
    };
    const toLabel = (provider) => provider.split(/[_-]/g).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
    const integrationProviders = [
        ...Object.keys(calendarStatus).map((provider) => ({
            kind: "calendar",
            id: provider,
            title: `${toLabel(provider)} Calendar`,
            name: `${toLabel(provider)} Calendar`,
            sub: "Sync busy times. Never write without your nod.",
            tint: "lilac",
        })),
        ...Object.keys(conferencingStatus).map((provider) => ({
            kind: "conferencing",
            id: provider,
            title: toLabel(provider),
            name: toLabel(provider),
            sub: "Auto-generate meeting links on confirm.",
            tint: "peach",
        })),
    ];
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
    return (_jsxs(StepShell, { steps: steps, currentStep: step, stepComplete: stepComplete, onStepChange: setStep, error: error, onBack: back, onNext: next, onPublish: publish, publishing: saving, children: [step === 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 01 \u00B7 Basic details" }), _jsxs("h2", { children: ["What should we call ", _jsx("em", { children: "this conversation?" })] }), _jsx("p", { children: "A short name and a calm note. Invitees see this when your link opens." })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 22, maxWidth: 720 }, children: [_jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "eventName", children: "Event name" }), _jsx("input", { id: "eventName", className: "onb-input onb-input-xl", placeholder: "Intro chat", value: draft.eventName, onChange: (e) => setDraft((prev) => ({ ...prev, eventName: e.target.value })) }), _jsx("span", { className: "hint", children: "e.g. \"Intro chat\", \"Quarterly walk\", \"Office hours\"" })] }), _jsxs("div", { className: "onb-field", children: [_jsx("label", { className: "lbl", htmlFor: "description", children: "A short note" }), _jsx("textarea", { id: "description", className: "onb-textarea", placeholder: "A gentle line so invitees know what to expect. Optional.", value: draft.description, onChange: (e) => setDraft((prev) => ({ ...prev, description: e.target.value })) })] })] }), _jsx(LivePreview, { eventName: draft.eventName, duration: draft.duration, location: draft.location, username: username })] })), step === 1 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 02 \u00B7 Event setup" }), _jsxs("h2", { children: ["How long, and ", _jsx("em", { children: "where shall we meet?" })] }), _jsx("p", { children: "Pick a location and the gentle length that suits the conversation. Both can change later." })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 28, maxWidth: 820 }, children: [_jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Location & conferencing" }), _jsx("div", { className: "onb-radios", children: LOCATIONS.map((l) => {
                                            // If the backend exposes a capability map for conferencing, render only the
                                            // options it advertises. Otherwise (legacy/empty response) show the full list.
                                            const capabilityMapPopulated = hasConferencingCapability("GOOGLE_MEET")
                                                || hasConferencingCapability("ZOOM")
                                                || hasConferencingCapability("CUSTOM_URL")
                                                || hasConferencingCapability("NONE");
                                            if (capabilityMapPopulated && !hasConferencingCapability(l.conferencing))
                                                return null;
                                            const zoomConnected = Object.keys(conferencingStatus).some((provider) => getConferencingProviderStatus(provider) === "connected");
                                            const calendarConnected = Object.keys(calendarStatus).some((provider) => getCalendarProviderStatus(provider) === "connected");
                                            let disabled = false;
                                            let disabledReason = "";
                                            if (l.conferencing === "ZOOM" && !zoomConnected) {
                                                disabled = true;
                                                disabledReason = "Connect Zoom from Integrations to enable this option.";
                                            }
                                            else if (l.conferencing === "GOOGLE_MEET" && !calendarConnected) {
                                                disabled = true;
                                                disabledReason = "Connect a calendar to enable Google Meet.";
                                            }
                                            const onPick = () => {
                                                if (disabled)
                                                    return;
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    location: l.id,
                                                    conferencingProvider: l.conferencing,
                                                }));
                                            };
                                            const subHint = l.conferencing === "ZOOM" && disabled
                                                ? " · Connect Zoom"
                                                : l.conferencing === "GOOGLE_MEET" && disabled
                                                    ? " · Connect a calendar"
                                                    : "";
                                            return (_jsxs("button", { type: "button", className: "onb-radio-card" + (draft.location === l.id ? " selected" : ""), onClick: onPick, disabled: disabled, "aria-disabled": disabled, style: disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined, title: disabled ? disabledReason : undefined, children: [_jsx("span", { className: "glyph", style: {
                                                            background: `var(--${l.tint}-soft)`,
                                                            borderColor: `var(--${l.tint})`,
                                                        }, children: _jsx(LocGlyph, { kind: l.id }) }), _jsx("span", { className: "name", children: l.name }), _jsxs("span", { className: "sub", children: [l.sub, subHint] })] }, l.id));
                                        }) }), draft.conferencingProvider === "CUSTOM_URL" && (_jsx("div", { style: { marginTop: 12 }, children: _jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Custom meeting URL" }), _jsx("input", { type: "url", className: "onb-input", placeholder: "https://meet.example.com/your-room", value: draft.customConferenceUrl, onChange: (e) => setDraft((prev) => ({ ...prev, customConferenceUrl: e.target.value })) }), _jsx("span", { className: "hint", children: "This link is shared with guests on every booking." })] }) }))] }), _jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Duration" }), _jsx("div", { className: "onb-chips-row", children: DURATIONS.map((d) => (_jsxs("button", { type: "button", className: "onb-chip-btn" + (draft.duration === d ? " selected" : ""), onClick: () => setDraft((prev) => ({ ...prev, duration: d })), children: [d, " min"] }, d))) }), _jsx("span", { className: "hint", children: "BunnyCal adds a 5-minute hold and a 15-minute buffer automatically." })] }), _jsxs("div", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Notice & advance" }), _jsxs("div", { style: {
                                            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                                            padding: 16, background: "var(--ivory-2)", border: "1px solid var(--border)", borderRadius: 14,
                                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Earliest booking" }), _jsx("div", { style: { marginTop: 6, fontFamily: "var(--serif)", fontSize: 19 }, children: "1 hour from now" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Looking ahead" }), _jsx("div", { style: { marginTop: 6, fontFamily: "var(--serif)", fontSize: 19 }, children: "60 days" })] })] })] })] }), _jsx(LivePreview, { eventName: draft.eventName, duration: draft.duration, location: draft.location, username: username })] })), step === 2 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 03 \u00B7 Availability" }), _jsxs("h2", { children: ["The shape ", _jsx("em", { children: "of your week." })] }), _jsx("p", { children: "Quiet mornings, soft afternoons, no Fridays \u2014 define the rhythm you actually live by. BunnyCal honors it gently." })] }), _jsx("div", { className: "onb-avail-rows", children: DAYS.map((day) => {
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
                        }, children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Date overrides" }), _jsx("p", { style: { marginTop: 8, marginBottom: 14, color: "var(--plum-500)", fontSize: 13.5 }, children: "Add blocked days or custom-hours exceptions for holidays, travel, and special schedules." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("button", { type: "button", className: "onb-chip-btn" + (overrideMode === "UNAVAILABLE" ? " selected" : ""), onClick: () => setOverrideMode("UNAVAILABLE"), children: "Block date" }), _jsx("button", { type: "button", className: "onb-chip-btn" + (overrideMode === "CUSTOM_HOURS" ? " selected" : ""), onClick: () => setOverrideMode("CUSTOM_HOURS"), children: "Custom hours" })] }), _jsxs("div", { style: { marginTop: 12, display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "1fr 1fr 1fr auto" : "1fr auto", gap: 8, alignItems: "end" }, children: [_jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Date" }), _jsx("input", { type: "date", className: "onb-input", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value) })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "Start" }), _jsx("input", { type: "time", className: "onb-input", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value) })] }), _jsxs("label", { className: "onb-field", children: [_jsx("span", { className: "lbl", children: "End" }), _jsx("input", { type: "time", className: "onb-input", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value) })] })] })), _jsx("button", { type: "button", className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: addOverride, disabled: Boolean(overrideValidationMessage), children: "Add" })] }), overrideValidationMessage && (_jsx("p", { style: { marginTop: 10, fontSize: 12.5, color: "#991B1B" }, role: "alert", children: overrideValidationMessage })), _jsx("div", { style: { marginTop: 12, display: "grid", gap: 8 }, children: draft.overrides.length === 0 ? (_jsx("p", { style: { margin: 0, color: "var(--plum-400)", fontSize: 13 }, children: "No overrides yet." })) : draft.overrides.map((ovr) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, background: "var(--ivory-2)", padding: "10px 12px" }, children: [_jsxs("div", { style: { color: "var(--plum-700)", fontSize: 13.5 }, children: [_jsx("strong", { children: ovr.date }), " ", _jsx("span", { style: { color: "var(--plum-500)" }, children: ovr.isAvailable ? `· ${ovr.startTime} – ${ovr.endTime}` : "· Unavailable" })] }), _jsx("button", { type: "button", className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: () => removeOverride(ovr.date), children: "Remove" })] }, ovr.date))) })] })] })), step === 3 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 04 \u00B7 Integrations" }), _jsxs("h2", { children: ["Quietly synced ", _jsx("em", { children: "across your calendars." })] }), _jsx("p", { children: "Connect what holds your real life. BunnyCal reads availability, never writes without your nod." })] }), banner && (_jsxs("div", { style: {
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                            padding: "12px 16px", marginBottom: 16,
                            background: "var(--sage-soft)", border: "1px solid var(--sage)",
                            borderRadius: 12, fontSize: 14, color: "var(--plum-700)",
                        }, children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, style: { background: "none", border: "none", cursor: "pointer", color: "var(--plum-500)", fontSize: 13 }, children: "Dismiss" })] })), integrationsError && (_jsx("p", { className: "onb-error", children: integrationsError })), _jsxs("div", { style: {
                            padding: "18px 20px",
                            background: "radial-gradient(60% 100% at 0% 0%, var(--lilac-soft) 0%, transparent 70%), var(--cream)",
                            border: "1px solid var(--border)", borderRadius: 18,
                            display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap",
                        }, children: [_jsx("span", { style: {
                                    width: 36, height: 36, borderRadius: 10,
                                    background: "var(--lilac-soft)", border: "1px solid var(--lilac)",
                                    display: "grid", placeItems: "center", flexShrink: 0,
                                }, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "var(--plum-700)", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "4", cy: "8", r: "2.5" }), _jsx("circle", { cx: "12", cy: "4", r: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2" }), _jsx("path", { d: "M6.5 8h3M9.5 4l-3 3M9.5 12l-3-3" })] }) }), _jsxs("div", { style: { flex: 1, minWidth: 220 }, children: [_jsx("div", { style: { fontWeight: 540, color: "var(--plum-900)" }, children: "Calendar fabric \u00B7 real-time sync" }), _jsx("div", { style: { fontSize: 13, color: "var(--plum-500)" }, children: "Two-way reads, never overwriting your events. Buffer-aware. Time-zone aware." })] }), _jsxs("span", { className: "onb-badge ok", children: [_jsx("span", { className: "dot" }), "Encrypted in transit"] })] }), _jsx("div", { className: "onb-int-grid", children: integrationProviders.map((p) => {
                            const status = p.kind === "calendar"
                                ? getCalendarProviderStatus(p.id)
                                : getConferencingProviderStatus(p.id);
                            const connected = status === "connected";
                            const busy = pendingAction?.provider === p.id && pendingAction?.kind === p.kind;
                            return (_jsxs("div", { className: "onb-int-card" + (connected ? " connected" : ""), children: [_jsxs("div", { className: "int-top", children: [_jsx("div", { className: "int-logo", style: { background: `var(--${p.tint}-soft)`, borderColor: `var(--${p.tint})` }, children: _jsx(ProviderGlyph, { id: p.id }) }), connected
                                                ? _jsxs("span", { className: "onb-badge ok", children: [_jsx("span", { className: "dot" }), "Connected"] })
                                                : _jsxs("span", { className: "onb-badge", children: [_jsx("span", { className: "dot", style: { background: "var(--plum-200)" } }), "Not connected"] })] }), _jsxs("div", { children: [_jsx("div", { className: "int-name", children: p.name }), _jsx("div", { className: "int-sub", children: p.sub })] }), _jsx("div", { className: "int-actions", children: connected ? (_jsx(_Fragment, { children: _jsx("button", { className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: () => disconnectProvider(p.kind, p.id), disabled: busy, children: busy ? "…" : "Disconnect" }) })) : (_jsx("button", { className: "onb-btn onb-btn-primary onb-btn-sm", onClick: () => startConnect(p.kind, p.id, returnPath), disabled: busy, children: busy ? "Connecting…" : `Connect ${p.title.split(" ")[0]}` })) })] }, `${p.kind}:${p.id}`));
                        }) }), _jsx("div", { style: {
                            marginTop: 22, padding: "14px 18px",
                            background: "var(--ivory-2)", border: "1px solid var(--border)", borderRadius: 14,
                            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
                        }, children: _jsx("div", { style: { fontSize: 13.5, color: "var(--plum-500)" }, children: "You can also continue without connecting \u2014 BunnyCal will still publish your link, just without sync." }) })] })), step === 4 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "onb-step-head", children: [_jsx("span", { className: "eyebrow", children: "Step 05 \u00B7 Review & publish" }), _jsxs("h2", { children: ["One quiet look ", _jsx("em", { children: "before it goes live." })] }), _jsx("p", { children: "You can adjust anything later from the dashboard." })] }), _jsxs("div", { className: "onb-review-card", children: [_jsxs("div", { className: "rev-header", children: [_jsxs("div", { children: [_jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Booking link" }), _jsx("h3", { className: "ev-name", style: { marginTop: 10 }, children: draft.eventName || _jsx("em", { children: "Your event" }) }), _jsxs("div", { className: "ev-url", children: ["bunnycal.com / ", username, " / ", slug] })] }), _jsxs("span", { className: "onb-badge synced", children: [_jsx("span", { className: "dot" }), "Ready to publish"] })] }), _jsxs("div", { className: "onb-review-rows", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Duration" }), _jsxs("span", { className: "val", children: [draft.duration, " minutes"] })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Location" }), _jsx("span", { className: "val", children: (LOCATIONS.find((l) => l.id === draft.location) || LOCATIONS[0]).name })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Available days" }), _jsx("span", { className: "val", children: DAYS.filter((d) => draft.weeklyRules[d].enabled).length === 0
                                                    ? _jsx("em", { children: "No days enabled" })
                                                    : DAYS.filter((d) => draft.weeklyRules[d].enabled)
                                                        .map((d) => DAY_LONG[d].slice(0, 3)).join(" · ") })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Default hours" }), _jsx("span", { className: "val", children: (() => {
                                                    const enabledDay = DAYS.find((d) => draft.weeklyRules[d].enabled);
                                                    if (!enabledDay)
                                                        return _jsx("em", { children: "Not set" });
                                                    const r = draft.weeklyRules[enabledDay];
                                                    return `${r.startTime} – ${r.endTime}`;
                                                })() })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Synced calendars" }), _jsx("span", { className: "val", children: (() => {
                                                    const connected = [];
                                                    Object.keys(calendarStatus).forEach((provider) => {
                                                        if (getCalendarProviderStatus(provider) === "connected")
                                                            connected.push(toLabel(provider));
                                                    });
                                                    Object.keys(conferencingStatus).forEach((provider) => {
                                                        if (getConferencingProviderStatus(provider) === "connected")
                                                            connected.push(toLabel(provider));
                                                    });
                                                    return connected.length === 0 ? _jsx("em", { children: "None connected" }) : connected.join(" · ");
                                                })() })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Conferencing" }), _jsxs("span", { className: "val", children: [draft.conferencingProvider === "GOOGLE_MEET" && "Google Meet", draft.conferencingProvider === "ZOOM" && "Zoom", draft.conferencingProvider === "CUSTOM_URL" && (draft.customConferenceUrl ? draft.customConferenceUrl : "Custom URL"), draft.conferencingProvider === "NONE" && "No video link"] })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "lbl", children: "Buffer & hold" }), _jsx("span", { className: "val", children: "15 min buffer \u00B7 5 min hold" })] })] })] }), _jsxs("div", { style: { marginTop: 24, display: "flex", alignItems: "center", gap: 14, color: "var(--plum-500)", fontSize: 14 }, children: [_jsxs("span", { className: "onb-badge ok", children: [_jsx("span", { className: "dot" }), "Your draft is safe"] }), _jsx("span", { children: "Publishing will make your link live for invitees. Nothing else changes." })] })] }))] }));
}
