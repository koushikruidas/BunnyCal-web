import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { api } from "@/services";
import { toAbsoluteUrl } from "@/lib/urls";
import { saveDraftPublicUrl, saveDraftToken } from "@/modules/draft-host/tokenStore";
import { useDraftOnboardingState } from "@/modules/draft-onboarding/state";
const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
export function DraftOnboardingEventPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { draft, setDraft, goToStep, reset, timezone } = useDraftOnboardingState();
    const { statusMap, getProviderStatus, startGoogleConnect, disconnect, pendingAction, banner, clearBanner, error: integrationsError } = useIntegrationState();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
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
                overrides: [],
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
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8", children: _jsxs("div", { className: "mx-auto grid max-w-6xl gap-5 lg:grid-cols-[260px_1fr]", children: [_jsxs("aside", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Onboarding" }), _jsx("ol", { className: "mt-4 space-y-2 text-sm", children: steps.map((s, i) => (_jsx("li", { children: _jsxs("button", { onClick: () => setStep(i), className: `w-full rounded-xl border px-3 py-2 text-left ${step === i ? "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]" : stepComplete(i) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#e5e7eb] text-[#6b7280]"}`, children: [i + 1, ". ", s] }) }, s))) })] }), _jsxs("main", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: ["Step ", step + 1, " of ", steps.length] }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]", children: steps[step] }), error && _jsx("p", { className: "mt-3 text-sm text-[#dc2626]", children: error }), step === 0 && (_jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Host email" }), _jsx("input", { required: true, type: "email", value: draft.hostEmail, onChange: (e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value })), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Display name" }), _jsx("input", { value: draft.hostDisplayName, onChange: (e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value })), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Event Name" }), _jsx("input", { value: draft.eventName, onChange: (e) => setDraft((prev) => ({ ...prev, eventName: e.target.value })), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Description" }), _jsx("textarea", { value: draft.description, onChange: (e) => setDraft((prev) => ({ ...prev, description: e.target.value })), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] })] })), step === 1 && (_jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Location" }), _jsx("input", { value: draft.location, onChange: (e) => setDraft((prev) => ({ ...prev, location: e.target.value })), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsxs("span", { className: "text-sm text-[#475569]", children: ["Duration (", draft.duration, " min)"] }), _jsx("input", { type: "range", min: 15, max: 90, step: 15, value: draft.duration, onChange: (e) => setDraft((prev) => ({ ...prev, duration: Number(e.target.value) })), className: "mt-2 w-full" })] })] })), step === 2 && (_jsx("div", { className: "mt-6 space-y-3", children: DAYS.map((day) => (_jsxs("div", { className: "rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center", children: [_jsx("div", { className: "font-medium text-[#0f172a]", children: day.slice(0, 1) + day.slice(1).toLowerCase() }), _jsx("input", { type: "time", value: draft.weeklyRules[day].startTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], startTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsx("input", { type: "time", value: draft.weeklyRules[day].endTime, disabled: !draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], endTime: e.target.value } } })), className: "rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: draft.weeklyRules[day].enabled, onChange: (e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], enabled: e.target.checked } } })) }), "Active"] })] }, day))) })), step === 3 && (_jsxs("div", { className: "mt-6 space-y-4", children: [banner && _jsxs("div", { className: "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: [banner, " ", _jsx("button", { onClick: clearBanner, className: "underline", children: "Dismiss" })] }), integrationsError && _jsx("p", { className: "text-sm text-[#dc2626]", children: integrationsError }), _jsx("p", { className: "text-sm text-[#64748b]", children: "Calendar connection is optional. You can publish without integrating a provider." }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx(IntegrationCard, { provider: "google", title: "Google Calendar", description: "Sync and prevent double-booking.", status: getProviderStatus("google"), rawStatus: statusMap.google, busy: pendingAction?.provider === "google", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("google") }), _jsx(IntegrationCard, { provider: "microsoft", title: "Microsoft Calendar", description: "Manage Outlook integration.", status: getProviderStatus("microsoft"), rawStatus: statusMap.microsoft, busy: pendingAction?.provider === "microsoft", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("microsoft") }), _jsx(IntegrationCard, { provider: "zoom", title: "Zoom", description: "Manage meeting conference integration.", status: getProviderStatus("zoom"), rawStatus: statusMap.zoom, busy: pendingAction?.provider === "zoom", onConnect: () => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`), onDisconnect: () => disconnect("zoom") })] })] })), step === 4 && (_jsxs("div", { className: "mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5", children: [_jsx("h3", { className: "text-xl font-semibold text-[#0f172a]", children: draft.eventName }), _jsxs("p", { className: "mt-1 text-sm text-[#475569]", children: [draft.duration, " min \u00B7 ", draft.location] }), _jsx("p", { className: "mt-3 text-sm text-[#64748b]", children: "Public URL" }), _jsx("p", { className: "mt-1 break-all text-sm text-[#1d4ed8]", children: "Assigned by backend on publish" })] })), _jsxs("div", { className: "mt-8 flex items-center justify-between", children: [_jsx("button", { onClick: back, disabled: step === 0 || saving, className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm disabled:opacity-50", children: "Back" }), step < 4 ? (_jsx("button", { onClick: next, className: "rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-medium text-white", children: "Next" })) : (_jsx("button", { onClick: publish, disabled: saving, className: "rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-medium text-white disabled:opacity-60", children: saving ? "Publishing..." : "Publish event" }))] })] })] }) }));
}
