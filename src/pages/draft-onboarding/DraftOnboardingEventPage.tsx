import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { api } from "@/services";
import type { DayOfWeek } from "@/services/types";
import { toAbsoluteUrl } from "@/lib/urls";
import { saveDraftPublicUrl, saveDraftToken } from "@/modules/draft-host/tokenStore";
import { useDraftOnboardingState } from "@/modules/draft-onboarding/state";
import { PageShell } from "@/ui/layout";
import { Field, Input, Textarea } from "@/ui/controls";
import { StepShell } from "@/features/onboarding/StepShell";

const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function DraftOnboardingEventPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, setDraft, goToStep, reset, timezone } = useDraftOnboardingState();
  const { statusMap, getProviderStatus, startGoogleConnect, disconnect, pendingAction, banner, clearBanner, error: integrationsError } = useIntegrationState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<"UNAVAILABLE" | "CUSTOM_HOURS">("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");

  const requestedStep = Number(searchParams.get("step"));
  const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5 ? requestedStep - 1 : draft.currentStep;
  useEffect(() => {
    if (step !== draft.currentStep) goToStep(step);
  }, [draft.currentStep, goToStep, step]);

  const setStep = (idx: number) => {
    goToStep(idx);
    setSearchParams({ step: String(idx + 1) }, { replace: true });
  };

  const next = async () => {
    setError(null);
    if (step < 4) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
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
    } catch (e) {
      console.error(e);
      setError("Unable to create draft scheduling link.");
    } finally {
      setSaving(false);
    }
  };

  const stepComplete = (index: number) => {
    if (index === 0) {
      const hasName = draft.eventName.trim().length > 1;
      const hasHostEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.hostEmail.trim());
      const hasDisplayName = draft.hostDisplayName.trim().length > 1;
      return hasName && hasHostEmail && hasDisplayName;
    }
    if (index === 1) return draft.location.trim().length > 1 && draft.duration >= 15;
    if (index === 2) return DAYS.some((d) => draft.weeklyRules[d].enabled);
    if (index === 3) return true;
    return false;
  };

  const overrideValidationMessage = (() => {
    if (!overrideDate) return "Choose a date.";
    if (overrideMode === "CUSTOM_HOURS") {
      if (!overrideStartTime || !overrideEndTime) return "Choose start and end time.";
      if (overrideEndTime <= overrideStartTime) return "End time must be after start time.";
    }
    return "";
  })();

  const addOverride = () => {
    if (overrideValidationMessage) return;
    const next = overrideMode === "UNAVAILABLE"
      ? { date: overrideDate, isAvailable: false }
      : { date: overrideDate, isAvailable: true, startTime: overrideStartTime, endTime: overrideEndTime };
    setDraft((prev) => ({
      ...prev,
      overrides: [...prev.overrides.filter((o) => o.date !== next.date), next].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setOverrideDate("");
  };

  return (
    <PageShell width="wide">
      <StepShell
        steps={steps}
        currentStep={step}
        stepComplete={stepComplete}
        onStepChange={setStep}
        error={error}
        onBack={back}
        onNext={next}
        onPublish={publish}
        publishing={saving}
      >
        {step === 0 && (
          <div className="mt-6 space-y-2">
            <Field label="Host email" htmlFor="hostEmail" required>
              <Input
                id="hostEmail"
                type="email"
                required
                value={draft.hostEmail}
                onChange={(e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value }))}
              />
            </Field>
            <Field label="Display name" htmlFor="hostDisplayName">
              <Input
                id="hostDisplayName"
                value={draft.hostDisplayName}
                onChange={(e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value }))}
              />
            </Field>
            <Field label="Event Name" htmlFor="eventName">
              <Input
                id="eventName"
                value={draft.eventName}
                onChange={(e) => setDraft((prev) => ({ ...prev, eventName: e.target.value }))}
              />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-2">
            <Field label="Location" htmlFor="location">
              <Input
                id="location"
                value={draft.location}
                onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
              />
            </Field>
            <Field label={`Duration (${draft.duration} min)`} htmlFor="duration">
              <input
                id="duration"
                type="range"
                min={15}
                max={90}
                step={15}
                value={draft.duration}
                onChange={(e) => setDraft((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                className="w-full"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center">
                <div className="font-medium text-[#0f172a]">{day.slice(0, 1) + day.slice(1).toLowerCase()}</div>
                <input type="time" value={draft.weeklyRules[day].startTime} disabled={!draft.weeklyRules[day].enabled} onChange={(e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], startTime: e.target.value } } }))} className="rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" />
                <input type="time" value={draft.weeklyRules[day].endTime} disabled={!draft.weeklyRules[day].enabled} onChange={(e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], endTime: e.target.value } } }))} className="rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" />
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.weeklyRules[day].enabled} onChange={(e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], enabled: e.target.checked } } }))} />Active</label>
              </div>
            ))}
            <div className="rounded-xl border border-[#e5e7eb] p-3">
              <p className="text-sm text-[#64748b] mb-2">Date overrides</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <button type="button" className="rounded-lg border border-[#d1d5db] px-2.5 py-1 text-xs" onClick={() => setOverrideMode("UNAVAILABLE")}>Block date</button>
                <button type="button" className="rounded-lg border border-[#d1d5db] px-2.5 py-1 text-xs" onClick={() => setOverrideMode("CUSTOM_HOURS")}>Custom hours</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="rounded-lg border border-[#d1d5db] px-3 py-2" />
                {overrideMode === "CUSTOM_HOURS" && (
                  <>
                    <input type="time" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} className="rounded-lg border border-[#d1d5db] px-3 py-2" />
                    <input type="time" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} className="rounded-lg border border-[#d1d5db] px-3 py-2" />
                  </>
                )}
                <button type="button" className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm" onClick={addOverride} disabled={Boolean(overrideValidationMessage)}>Add</button>
              </div>
              {overrideValidationMessage && <p className="mt-2 text-xs text-danger-fg">{overrideValidationMessage}</p>}
              <div className="mt-2 space-y-1">
                {draft.overrides.map((ovr) => (
                  <div key={ovr.date} className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm">
                    <span>{ovr.date} {ovr.isAvailable ? `· ${ovr.startTime}-${ovr.endTime}` : "· Unavailable"}</span>
                    <button type="button" className="underline" onClick={() => setDraft((prev) => ({ ...prev, overrides: prev.overrides.filter((x) => x.date !== ovr.date) }))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            {banner && <div className="rounded-xl border border-success-border bg-success-surface px-3 py-2 text-sm text-success-fg">{banner} <button onClick={clearBanner} className="underline">Dismiss</button></div>}
            {integrationsError && <p className="text-sm text-danger-fg">{integrationsError}</p>}
            <p className="text-sm text-text-secondary">Calendar connection is optional. You can publish without integrating a provider.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <IntegrationCard provider="google" title="Google Calendar" description="Sync and prevent double-booking." status={getProviderStatus("google")} rawStatus={statusMap.google} busy={pendingAction?.provider === "google"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("google")} />
              <IntegrationCard provider="microsoft" title="Microsoft Calendar" description="Manage Outlook integration." status={getProviderStatus("microsoft")} rawStatus={statusMap.microsoft} busy={pendingAction?.provider === "microsoft"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("microsoft")} />
              <IntegrationCard provider="zoom" title="Zoom" description="Manage meeting conference integration." status={getProviderStatus("zoom")} rawStatus={statusMap.zoom} busy={pendingAction?.provider === "zoom"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("zoom")} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-sunken p-5">
            <h3 className="text-xl font-semibold text-text-primary">{draft.eventName}</h3>
            <p className="mt-1 text-sm text-text-secondary">{draft.duration} min · {draft.location}</p>
            <p className="mt-3 text-sm text-text-tertiary">Public URL</p>
            <p className="mt-1 break-all text-sm text-[#1d4ed8]">Assigned by backend on publish</p>
          </div>
        )}
      </StepShell>
    </PageShell>
  );
}
