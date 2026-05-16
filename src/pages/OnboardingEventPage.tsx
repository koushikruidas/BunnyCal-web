import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { useOnboardingState } from "@/state/OnboardingContext";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import type { DayOfWeek } from "@/services/types";
import { AppShell } from "@/ui/layout";
import { StepShell } from "@/features/onboarding/StepShell";

const steps = ["Basic Details", "Event Setup", "Availability", "Integrations", "Review & Publish"];
const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function OnboardingEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, setDraft, goToStep, reset } = useOnboardingState();
  const { statusMap, getProviderStatus, startGoogleConnect, disconnect, pendingAction, banner, clearBanner, error: integrationsError } = useIntegrationState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedStep = Number(searchParams.get("step"));
  const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5 ? requestedStep - 1 : draft.currentStep;
  useEffect(() => {
    if (step !== draft.currentStep) goToStep(step);
  }, [draft.currentStep, goToStep, step]);

  const slug = useMemo(() => slugify(draft.eventName || "event"), [draft.eventName]);
  const previewPath = useMemo(() => toPublicBookingPath(user?.username || "yourname", slug), [slug, user?.username]);

  const setStep = (idx: number) => {
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
      } catch (e) {
        console.error(e);
        setError("Unable to save weekly availability.");
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
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
    } catch (e) {
      console.error(e);
      setError("Unable to create event type.");
    } finally {
      setSaving(false);
    }
  };

  const stepComplete = (index: number) => {
    if (index === 0) return draft.eventName.trim().length > 1;
    if (index === 1) return draft.location.trim().length > 1 && draft.duration >= 15;
    if (index === 2) return DAYS.some((d) => draft.weeklyRules[d].enabled);
    if (index === 3) return getProviderStatus("google") === "connected" || getProviderStatus("microsoft") === "connected" || getProviderStatus("zoom") === "connected";
    return false;
  };

  return (
    <AppShell mainWidth="wide">
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
          <div className="mt-6 space-y-4">
            <label className="block"><span className="text-sm text-[#475569]">Event Name</span><input value={draft.eventName} onChange={(e) => setDraft((prev) => ({ ...prev, eventName: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block"><span className="text-sm text-[#475569]">Description</span><textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <label className="block"><span className="text-sm text-[#475569]">Location</span><input value={draft.location} onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block"><span className="text-sm text-[#475569]">Duration ({draft.duration} min)</span><input type="range" min={15} max={90} step={15} value={draft.duration} onChange={(e) => setDraft((prev) => ({ ...prev, duration: Number(e.target.value) }))} className="mt-2 w-full" /></label>
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
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            {banner && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{banner} <button onClick={clearBanner} className="underline">Dismiss</button></div>}
            {integrationsError && <p className="text-sm text-[#dc2626]">{integrationsError}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <IntegrationCard provider="google" title="Google Calendar" description="Sync and prevent double-booking." status={getProviderStatus("google")} rawStatus={statusMap.google} busy={pendingAction?.provider === "google"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("google")} />
              <IntegrationCard provider="microsoft" title="Microsoft Calendar" description="Manage Outlook integration." status={getProviderStatus("microsoft")} rawStatus={statusMap.microsoft} busy={pendingAction?.provider === "microsoft"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("microsoft")} />
              <IntegrationCard provider="zoom" title="Zoom" description="Manage meeting conference integration." status={getProviderStatus("zoom")} rawStatus={statusMap.zoom} busy={pendingAction?.provider === "zoom"} onConnect={() => startGoogleConnect(`${window.location.pathname}${window.location.search}${window.location.hash}`)} onDisconnect={() => disconnect("zoom")} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
            <h3 className="text-xl font-semibold text-[#0f172a]">{draft.eventName}</h3>
            <p className="mt-1 text-sm text-[#475569]">{draft.duration} min · {draft.location}</p>
            <p className="mt-3 text-sm text-[#64748b]">/{slug}</p>
            <p className="mt-1 break-all text-sm text-[#1d4ed8]">{previewPath}</p>
          </div>
        )}
      </StepShell>
    </AppShell>
  );
}
