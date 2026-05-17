import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { useOnboardingState } from "@/state/OnboardingContext";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { AppShell } from "@/ui/layout";
import { Field, Input, Textarea } from "@/ui/controls";
import { StepShell } from "@/features/onboarding/StepShell";
const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function OnboardingEventPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const { draft, setDraft, goToStep, reset } = useOnboardingState();
    const { statusMap, getProviderStatus, startGoogleConnect, disconnect, pendingAction, banner, clearBanner, error: integrationsError } = useIntegrationState();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const requestedStep = Number(searchParams.get("step"));
    const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5 ? requestedStep - 1 : draft.currentStep;
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
            }
            catch (e) {
                console.error(e);
                setError("Unable to save weekly availability.");
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
        if (index === 1)
            return draft.location.trim().length > 1 && draft.duration >= 15;
        if (index === 2)
            return DAYS.some((d) => draft.weeklyRules[d].enabled);
        if (index === 3)
            return getProviderStatus("google") === "connected" || getProviderStatus("microsoft") === "connected" || getProviderStatus("zoom") === "connected";
        return false;
    };
    return (_jsx(AppShell, { mainWidth: "wide", children: _jsxs(StepShell, { steps: steps, currentStep: step, stepComplete: stepComplete, onStepChange: setStep, error: error, onBack: back, onNext: next, onPublish: publish, publishing: saving, children: [step === 0 && (_jsxs("div", { className: "mt-6 space-y-2", children: [_jsx(Field, { label: "Event Name", htmlFor: "eventName", children: _jsx(Input, { id: "eventName", value: draft.eventName, onChange: (e) => setDraft((prev) => ({ ...prev, eventName: e.target.value })) }) }), _jsx(Field, { label: "Description", htmlFor: "description", children: _jsx(Textarea, { id: "description", value: draft.description, onChange: (e) => setDraft((prev) => ({ ...prev, description: e.target.value })) }) })] })), step === 1 && (_jsxs("div", { className: "mt-6 space-y-2", children: [_jsx(Field, { label: "Location", htmlFor: "location", children: _jsx(Input, { id: "location", value: draft.location, onChange: (e) => setDraft((prev) => ({ ...prev, location: e.target.value })) }) }), _jsx(Field, { label: `Duration (${draft.duration} min)`, htmlFor: "duration", children: _jsx("input", { id: "duration", type: "range", min: 15, max: 90, step: 15, value: draft.duration, onChange: (e) => setDraft((prev) => ({ ...prev, duration: Number(e.target.value) })), className: "w-full" }) })] })), step === 2 && (_jsx("div", { className: "mt-6 space-y-3", children: DAYS.map((day) => (_jsxs("div", { className: "rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center", children: [_jsx("div", { className: "font-medium text-[#0f172a]", children: day.slice(0, 1) + day.slice(1).toLowerCase() }), _jsx("input", { type: "time", value: draft.weeklyRules[day].startTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], startTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsx("input", { type: "time", value: draft.weeklyRules[day].endTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], endTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], enabled: e.target.checked } } })) }), "Active"] })] }, day))) })), step === 3 && (_jsxs("div", { className: "mt-6 space-y-4", children: [banner && _jsxs("div", { className: "rounded-xl border border-success-border bg-success-surface px-3 py-2 text-sm text-success-fg", children: [banner, " ", _jsx("button", { onClick: clearBanner, className: "underline", children: "Dismiss" })] }), integrationsError && _jsx("p", { className: "text-sm text-danger-fg", children: integrationsError }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx(IntegrationCard, { provider: "google", title: "Google Calendar", description: "Sync and prevent double-booking.", status: getProviderStatus("google"), rawStatus: statusMap.google, busy: pendingAction?.provider === "google", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("google") }), _jsx(IntegrationCard, { provider: "microsoft", title: "Microsoft Calendar", description: "Manage Outlook integration.", status: getProviderStatus("microsoft"), rawStatus: statusMap.microsoft, busy: pendingAction?.provider === "microsoft", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("microsoft") }), _jsx(IntegrationCard, { provider: "zoom", title: "Zoom", description: "Manage meeting conference integration.", status: getProviderStatus("zoom"), rawStatus: statusMap.zoom, busy: pendingAction?.provider === "zoom", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("zoom") })] })] })), step === 4 && (_jsxs("div", { className: "mt-6 rounded-2xl border border-border-subtle bg-surface-sunken p-5", children: [_jsx("h3", { className: "text-xl font-semibold text-text-primary", children: draft.eventName }), _jsxs("p", { className: "mt-1 text-sm text-text-secondary", children: [draft.duration, " min \u00B7 ", draft.location] }), _jsxs("p", { className: "mt-3 text-sm text-text-tertiary", children: ["/", slug] }), _jsx("p", { className: "mt-1 break-all text-sm text-[#1d4ed8]", children: previewPath })] }))] }) }));
}
