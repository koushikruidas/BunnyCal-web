import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { api } from "@/services";
import { toAbsoluteUrl } from "@/lib/urls";
import { saveDraftPublicUrl, saveDraftToken } from "@/modules/draft-host/tokenStore";
import { useDraftOnboardingState } from "@/modules/draft-onboarding/state";
import { PageShell } from "@/ui/layout";
import { Field, Input, Textarea } from "@/ui/controls";
import { StepShell } from "@/features/onboarding/StepShell";
const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
export function DraftOnboardingEventPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { draft, setDraft, goToStep, reset, timezone } = useDraftOnboardingState();
    const { statusMap, getCalendarProviderStatus, getConferencingProviderStatus, startConnect, disconnectProvider, pendingAction, banner, clearBanner, error: integrationsError } = useIntegrationState();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [overrideMode, setOverrideMode] = useState("UNAVAILABLE");
    const [overrideDate, setOverrideDate] = useState("");
    const [overrideStartTime, setOverrideStartTime] = useState("09:00");
    const [overrideEndTime, setOverrideEndTime] = useState("13:00");
    const requestedStep = Number(searchParams.get("step"));
    const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5 ? requestedStep - 1 : draft.currentStep;
    useEffect(() => {
        if (step !== draft.currentStep)
            goToStep(step);
    }, [draft.currentStep, goToStep, step]);
    const setStep = (idx) => {
        goToStep(idx);
        setSearchParams({ step: String(idx + 1) }, { replace: true });
    };
    const next = async () => {
        setError(null);
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
            const rules = DAYS.filter((day) => draft.weeklyRules[day].enabled).map((day) => ({
                dayOfWeek: day,
                startTime: draft.weeklyRules[day].startTime,
                endTime: draft.weeklyRules[day].endTime,
            }));
            const created = await api.createDraftHost({
                email: draft.hostEmail.trim().toLowerCase(),
                displayName: draft.hostDisplayName.trim(),
                timezone,
                eventName: draft.eventName,
                description: draft.description,
                location: draft.location,
                durationMinutes: draft.duration,
                slotIntervalMinutes: draft.duration,
                holdDurationMinutes: 5,
                rules,
                overrides: draft.overrides,
            });
            const normalizedSlug = created.slug?.trim();
            const token = created.managementToken?.trim();
            const canonicalPublicUrl = created.publicUrl?.trim();
            if (!normalizedSlug || !token || !canonicalPublicUrl) {
                throw new Error("Draft create response missing slug/token/publicUrl");
            }
            saveDraftToken(normalizedSlug, token);
            saveDraftPublicUrl(normalizedSlug, canonicalPublicUrl);
            const link = toAbsoluteUrl(canonicalPublicUrl);
            sessionStorage.setItem("createdEventLink", link);
            sessionStorage.setItem("createdDraftSlug", normalizedSlug);
            reset();
            navigate("/d/onboarding/success", { replace: true });
        }
        catch (e) {
            console.error(e);
            setError("Unable to create draft scheduling link.");
        }
        finally {
            setSaving(false);
        }
    };
    const stepComplete = (index) => {
        if (index === 0) {
            const hasName = draft.eventName.trim().length > 1;
            const hasHostEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.hostEmail.trim());
            const hasDisplayName = draft.hostDisplayName.trim().length > 1;
            return hasName && hasHostEmail && hasDisplayName;
        }
        if (index === 1)
            return draft.location.trim().length > 1 && draft.duration >= 15;
        if (index === 2)
            return DAYS.some((d) => draft.weeklyRules[d].enabled);
        if (index === 3)
            return true;
        return false;
    };
    const overrideValidationMessage = (() => {
        if (!overrideDate)
            return "Choose a date.";
        if (overrideMode === "CUSTOM_HOURS") {
            if (!overrideStartTime || !overrideEndTime)
                return "Choose start and end time.";
            if (overrideEndTime <= overrideStartTime)
                return "End time must be after start time.";
        }
        return "";
    })();
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
    };
    return (_jsx(PageShell, { width: "wide", children: _jsxs(StepShell, { steps: steps, currentStep: step, stepComplete: stepComplete, onStepChange: setStep, error: error, onBack: back, onNext: next, onPublish: publish, publishing: saving, children: [step === 0 && (_jsxs("div", { className: "mt-6 space-y-2", children: [_jsx(Field, { label: "Host email", htmlFor: "hostEmail", required: true, children: _jsx(Input, { id: "hostEmail", type: "email", required: true, value: draft.hostEmail, onChange: (e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value })) }) }), _jsx(Field, { label: "Display name", htmlFor: "hostDisplayName", children: _jsx(Input, { id: "hostDisplayName", value: draft.hostDisplayName, onChange: (e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value })) }) }), _jsx(Field, { label: "Event Name", htmlFor: "eventName", children: _jsx(Input, { id: "eventName", value: draft.eventName, onChange: (e) => setDraft((prev) => ({ ...prev, eventName: e.target.value })) }) }), _jsx(Field, { label: "Description", htmlFor: "description", children: _jsx(Textarea, { id: "description", value: draft.description, onChange: (e) => setDraft((prev) => ({ ...prev, description: e.target.value })) }) })] })), step === 1 && (_jsxs("div", { className: "mt-6 space-y-2", children: [_jsx(Field, { label: "Location", htmlFor: "location", children: _jsx(Input, { id: "location", value: draft.location, onChange: (e) => setDraft((prev) => ({ ...prev, location: e.target.value })) }) }), _jsx(Field, { label: `Duration (${draft.duration} min)`, htmlFor: "duration", children: _jsx("input", { id: "duration", type: "range", min: 15, max: 90, step: 15, value: draft.duration, onChange: (e) => setDraft((prev) => ({ ...prev, duration: Number(e.target.value) })), className: "w-full" }) })] })), step === 2 && (_jsxs("div", { className: "mt-6 space-y-3", children: [DAYS.map((day) => (_jsxs("div", { className: "rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center", children: [_jsx("div", { className: "font-medium text-[#0f172a]", children: day.slice(0, 1) + day.slice(1).toLowerCase() }), _jsx("input", { type: "time", value: draft.weeklyRules[day].startTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], startTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsx("input", { type: "time", value: draft.weeklyRules[day].endTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], endTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], enabled: e.target.checked } } })) }), "Active"] })] }, day))), _jsxs("div", { className: "rounded-xl border border-[#e5e7eb] p-3", children: [_jsx("p", { className: "text-sm text-[#64748b] mb-2", children: "Date overrides" }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-2", children: [_jsx("button", { type: "button", className: "rounded-lg border border-[#d1d5db] px-2.5 py-1 text-xs", onClick: () => setOverrideMode("UNAVAILABLE"), children: "Block date" }), _jsx("button", { type: "button", className: "rounded-lg border border-[#d1d5db] px-2.5 py-1 text-xs", onClick: () => setOverrideMode("CUSTOM_HOURS"), children: "Custom hours" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-2 items-end", children: [_jsx("input", { type: "date", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value), className: "rounded-lg border border-[#d1d5db] px-3 py-2" }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsx("input", { type: "time", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value), className: "rounded-lg border border-[#d1d5db] px-3 py-2" }), _jsx("input", { type: "time", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value), className: "rounded-lg border border-[#d1d5db] px-3 py-2" })] })), _jsx("button", { type: "button", className: "rounded-lg border border-[#d1d5db] px-3 py-2 text-sm", onClick: addOverride, disabled: Boolean(overrideValidationMessage), children: "Add" })] }), overrideValidationMessage && _jsx("p", { className: "mt-2 text-xs text-danger-fg", children: overrideValidationMessage }), _jsx("div", { className: "mt-2 space-y-1", children: draft.overrides.map((ovr) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm", children: [_jsxs("span", { children: [ovr.date, " ", ovr.isAvailable ? `· ${ovr.startTime}-${ovr.endTime}` : "· Unavailable"] }), _jsx("button", { type: "button", className: "underline", onClick: () => setDraft((prev) => ({ ...prev, overrides: prev.overrides.filter((x) => x.date !== ovr.date) })), children: "Remove" })] }, ovr.date))) })] })] })), step === 3 && (_jsxs("div", { className: "mt-6 space-y-4", children: [banner && _jsxs("div", { className: "rounded-xl border border-success-border bg-success-surface px-3 py-2 text-sm text-success-fg", children: [banner, " ", _jsx("button", { onClick: clearBanner, className: "underline", children: "Dismiss" })] }), integrationsError && _jsx("p", { className: "text-sm text-danger-fg", children: integrationsError }), _jsx("p", { className: "text-sm text-text-secondary", children: "Calendar connection is optional. You can publish without integrating a provider." }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx(IntegrationCard, { provider: "google", kind: "calendar", title: "Google Calendar", description: "Sync and prevent double-booking.", status: getCalendarProviderStatus("google"), rawStatus: statusMap.google, busy: pendingAction?.provider === "google" && pendingAction?.kind === "calendar", onConnect: () => startConnect("calendar", "google", `${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnectProvider("calendar", "google") }), _jsx(IntegrationCard, { provider: "zoom", kind: "conferencing", title: "Zoom", description: "Auto-generate meeting links on confirm.", status: getConferencingProviderStatus("zoom"), rawStatus: statusMap.zoom, busy: pendingAction?.provider === "zoom" && pendingAction?.kind === "conferencing", onConnect: () => startConnect("conferencing", "zoom", `${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnectProvider("conferencing", "zoom") })] })] })), step === 4 && (_jsxs("div", { className: "mt-6 rounded-2xl border border-border-subtle bg-surface-sunken p-5", children: [_jsx("h3", { className: "text-xl font-semibold text-text-primary", children: draft.eventName }), _jsxs("p", { className: "mt-1 text-sm text-text-secondary", children: [draft.duration, " min \u00B7 ", draft.location] }), _jsx("p", { className: "mt-3 text-sm text-text-tertiary", children: "Public URL" }), _jsx("p", { className: "mt-1 break-all text-sm text-[#1d4ed8]", children: "Assigned by backend on publish" })] }))] }) }));
}
