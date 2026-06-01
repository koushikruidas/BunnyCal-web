import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import type { DayOfWeek } from "@/services/types";
import { toAbsoluteUrl } from "@/lib/urls";
import { saveDraftPublicUrl, saveDraftToken } from "@/modules/draft-host/tokenStore";
import { useDraftOnboardingState } from "@/modules/draft-onboarding/state";
import { StepShell } from "@/features/onboarding/StepShell";
import type { StepMetaItem } from "@/features/onboarding/StepShell";

const STEPS = ["Meeting details", "Your schedule", "How you'll meet", "Review & Publish"];
const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LONG: Record<DayOfWeek, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const DURATIONS = [15, 30, 45, 60, 90];
const STEP_META: StepMetaItem[] = [
  { label: "Meeting details", hint: "Name & description", asideTitle: (<>Let&apos;s set up your <em>booking link.</em></>), blurb: "Add host email, event details, and a short note guests will see." },
  { label: "Your schedule", hint: "Weekly rhythm", asideTitle: (<>The shape of <em>your week.</em></>), blurb: "Define weekly availability manually, with timezone and optional date overrides." },
  { label: "How you'll meet", hint: "Conferencing & duration", asideTitle: (<>Video call, phone, <em>or in person?</em></>), blurb: "Conferencing options are shown based on host email provider and selected mode." },
  { label: "Review & publish", hint: "Share your link", asideTitle: (<>Almost there. <em>Take a calm look.</em></>), blurb: "Review everything before publishing your anonymous booking link." },
];
const LOCATIONS = [
  { id: "meet", name: "Google Meet", sub: "From your calendar", tint: "sage", conferencing: "google_meet" as const },
  { id: "teams", name: "Microsoft Teams", sub: "Auto-generated Teams room", tint: "blush", conferencing: "microsoft_teams" as const },
  { id: "zoom", name: "Zoom", sub: "Auto-generated link", tint: "peach", conferencing: "zoom" as const },
  { id: "custom", name: "Custom URL", sub: "Paste your own link", tint: "lilac", conferencing: "custom_url" as const },
  { id: "phone", name: "Phone call", sub: "Use guest's number", tint: "butter", conferencing: "none" as const },
  { id: "in-person", name: "In person", sub: "Office, café, studio", tint: "blush", conferencing: "none" as const },
];

function hourFromTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function detectEmailProvider(email: string): "google" | "microsoft_work" | "microsoft_personal" | "unknown" {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return "unknown";
  if (domain === "gmail.com" || domain === "googlemail.com" || domain.includes("google")) return "google";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "microsoft_personal";
  if (domain.endsWith(".onmicrosoft.com") || domain === "microsoft.com" || domain === "office365.com" || domain.includes("outlook") || domain.includes("microsoft")) return "microsoft_work";
  return "unknown";
}
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function LocGlyph({ kind }: { kind: string }) {
  const s = { stroke: "#2B1F3D", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (kind === "zoom") return <svg width="14" height="14" viewBox="0 0 16 16"><rect x="2" y="4" width="9" height="8" rx="2" {...s}/><path d="M11 8l4-2v6l-4-2" {...s}/></svg>;
  if (kind === "meet") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 4h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6l-3 2v-2H3z" {...s}/></svg>;
  if (kind === "phone") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 3h2l1.5 3-1.5 1.5a8 8 0 0 0 3 3L10.5 9 13.5 10.5V13h-2A8 8 0 0 1 3 4z" {...s}/></svg>;
  if (kind === "custom") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M6 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" {...s}/><path d="M10 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" {...s}/></svg>;
  return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 13h12M3 13V7l5-4 5 4v6M6 13V9h4v4" {...s}/></svg>;
}

export function DraftOnboardingEventPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, setDraft, goToStep, reset, timezone } = useDraftOnboardingState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<"UNAVAILABLE" | "CUSTOM_HOURS">("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const anonymousResetDoneRef = useRef(false);
  const freshEntry = searchParams.get("fresh") === "1";
  const requestedStep = Number(searchParams.get("step"));
  const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 4 ? requestedStep - 1 : Math.min(draft.currentStep, 3);

  const resetAnonymousFlowState = () => {
    sessionStorage.removeItem("draft-onboarding-state");
    reset();
    setError(null);
    setSaving(false);
    setOverrideMode("UNAVAILABLE");
    setOverrideDate("");
    setOverrideStartTime("09:00");
    setOverrideEndTime("13:00");
  };

  useEffect(() => {
    if (anonymousResetDoneRef.current) return;
    anonymousResetDoneRef.current = true;
    resetAnonymousFlowState();
    const next = new URLSearchParams(searchParams);
    next.set("step", "1");
    next.delete("fresh");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, searchParams, setSearchParams, freshEntry]);

  useEffect(() => {
    if (step !== draft.currentStep) goToStep(step);
  }, [draft.currentStep, goToStep, step]);

  const setStep = (idx: number) => {
    goToStep(idx);
    const next = new URLSearchParams(searchParams);
    next.set("step", String(idx + 1));
    next.delete("fresh");
    setSearchParams(next, { replace: true });
  };
  const back = () => { if (step > 0) setStep(step - 1); };
  const next = async () => {
    setError(null);
    if (!stepComplete(step)) {
      if (step === 0 && !isValidEmail(draft.hostEmail)) {
        setError("Please provide a valid host email.");
      } else {
        setError("Please complete this step before continuing.");
      }
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const buildRules = () =>
    DAYS.filter((day) => draft.weeklyRules[day].enabled).map((day) => ({
      dayOfWeek: day,
      startTime: draft.weeklyRules[day].startTime,
      endTime: draft.weeklyRules[day].endTime,
    }));

  const ensureDraftCredentials = async () => {
    const currentSlug = draft.draftSlug.trim();
    const currentToken = draft.draftToken.trim();
    if (currentSlug && currentToken) {
      return { draftSlug: currentSlug, draftToken: currentToken };
    }
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
      rules: buildRules(),
      overrides: draft.overrides,
    });
    const normalizedSlug = created.slug?.trim();
    const token = created.managementToken?.trim();
    const canonicalPublicUrl = created.publicUrl?.trim();
    if (!normalizedSlug || !token || !canonicalPublicUrl) throw new Error("Draft create response missing slug/token/publicUrl");
    saveDraftToken(normalizedSlug, token);
    saveDraftPublicUrl(normalizedSlug, canonicalPublicUrl);
    setDraft((prev) => ({ ...prev, draftSlug: normalizedSlug, draftToken: token }));
    return { draftSlug: normalizedSlug, draftToken: token };
  };

  const publish = async () => {
    setSaving(true);
    setError(null);
    try {
      const rules = buildRules();
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
      if (!normalizedSlug || !token || !canonicalPublicUrl) throw new Error("Draft create response missing slug/token/publicUrl");
      saveDraftToken(normalizedSlug, token);
      saveDraftPublicUrl(normalizedSlug, canonicalPublicUrl);
      setDraft((prev) => ({ ...prev, draftSlug: normalizedSlug, draftToken: token }));
      sessionStorage.setItem("createdEventLink", toAbsoluteUrl(canonicalPublicUrl));
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
    if (index < step && draft.touchedSteps.includes(index + 1)) return true;
    if (index === 0) return isValidEmail(draft.hostEmail) && draft.hostDisplayName.trim().length > 1 && draft.eventName.trim().length > 1;
    if (index === 1) return DAYS.some((d) => draft.weeklyRules[d].enabled);
    if (index === 2) return draft.location.trim().length > 0 && draft.duration >= 15;
    return false;
  };
  const overrideValidationMessage = useMemo(() => {
    if (!overrideDate) return "Choose a date.";
    if (overrideMode === "CUSTOM_HOURS") {
      if (!overrideStartTime || !overrideEndTime) return "Choose start and end time.";
      if (overrideEndTime <= overrideStartTime) return "End time must be after start time.";
    }
    return "";
  }, [overrideDate, overrideEndTime, overrideMode, overrideStartTime]);
  const addOverride = () => {
    if (overrideValidationMessage) return;
    const nextValue = overrideMode === "UNAVAILABLE"
      ? { date: overrideDate, isAvailable: false }
      : { date: overrideDate, isAvailable: true, startTime: overrideStartTime, endTime: overrideEndTime };
    setDraft((prev) => ({
      ...prev,
      overrides: [...prev.overrides.filter((o) => o.date !== nextValue.date), nextValue].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setOverrideDate("");
  };
  const emailProvider = detectEmailProvider(draft.hostEmail);
  const allowedConferencingProviders = (() => {
    if (emailProvider === "google") return new Set(["google_meet", "zoom", "custom_url", "none"]);
    if (emailProvider === "microsoft_work") return new Set(["microsoft_teams", "zoom", "custom_url", "none"]);
    return new Set(["zoom", "custom_url", "none"]);
  })();
  const visibleLocations = LOCATIONS.filter((item) => allowedConferencingProviders.has(item.conferencing));

  return (
    <StepShell
      steps={STEPS}
      currentStep={step}
      stepComplete={stepComplete}
      onStepChange={setStep}
      error={error}
      onBack={back}
      onNext={next}
      onPublish={publish}
      publishing={saving}
      stepMeta={STEP_META}
    >
      {step === 0 && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">Step 01 · Basic details</span>
            <h2>What should we call <em>this conversation?</em></h2>
            <p>A short name and a calm note. Invitees see this when your link opens.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
            <div className="onb-field"><label className="lbl" htmlFor="hostEmail">Host email</label><input id="hostEmail" type="email" className="onb-input" value={draft.hostEmail} onChange={(e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value }))} /></div>
            <div className="onb-field"><label className="lbl" htmlFor="hostDisplayName">Display name</label><input id="hostDisplayName" className="onb-input" value={draft.hostDisplayName} onChange={(e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value }))} /></div>
            <div className="onb-field"><label className="lbl" htmlFor="eventName">Event name</label><input id="eventName" className="onb-input onb-input-xl" value={draft.eventName} onChange={(e) => setDraft((prev) => ({ ...prev, eventName: e.target.value }))} /></div>
            <div className="onb-field"><label className="lbl" htmlFor="description">Description</label><textarea id="description" className="onb-textarea" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div className="onb-field"><span className="lbl">Duration</span><div className="onb-chips-row">{DURATIONS.map((d) => <button key={d} type="button" className={"onb-chip-btn" + (draft.duration === d ? " selected" : "")} onClick={() => setDraft((prev) => ({ ...prev, duration: d }))}>{d} min</button>)}</div></div>
            <div className="onb-field"><label className="lbl" htmlFor="timezone">Timezone</label><input id="timezone" className="onb-input" value={timezone} readOnly /></div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">Step 02 · Availability</span>
            <h2>The shape <em>of your week.</em></h2>
            <p>Quiet mornings, soft afternoons, no Fridays — define the rhythm you actually live by.</p>
          </div>
          <div className="onb-avail-rows">
            {DAYS.map((day) => {
              const rule = draft.weeklyRules[day];
              const startH = hourFromTime(rule.startTime);
              const endH = hourFromTime(rule.endTime);
              return (
                <div key={day} className={"onb-avail-row" + (rule.enabled ? "" : " off")}>
                  <div className="day">{DAY_LONG[day]}<span className="sub">{rule.enabled ? "Available" : "Day off"}</span></div>
                  <div className="bar" aria-hidden="true">{Array.from({ length: 24 }).map((_, h) => <div key={h} className={"cell" + (rule.enabled && h >= Math.floor(startH) && h < Math.ceil(endH) ? " on" : "")} />)}</div>
                  <input type="time" value={rule.startTime} disabled={!rule.enabled} onChange={(e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], startTime: e.target.value } } }))} />
                  <input type="time" value={rule.endTime} disabled={!rule.enabled} onChange={(e) => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], endTime: e.target.value } } }))} />
                  <button type="button" role="switch" aria-checked={rule.enabled} className={"onb-toggle" + (rule.enabled ? " on" : "")} onClick={() => setDraft((prev) => ({ ...prev, weeklyRules: { ...prev.weeklyRules, [day]: { ...prev.weeklyRules[day], enabled: !rule.enabled } } }))} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, padding: 18, background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }}>Date overrides</div>
            <p style={{ marginTop: 8, marginBottom: 14, color: "var(--plum-500)", fontSize: 13.5 }}>Add blocked days or custom-hours exceptions for holidays, travel, and special schedules.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={"onb-chip-btn" + (overrideMode === "UNAVAILABLE" ? " selected" : "")} onClick={() => setOverrideMode("UNAVAILABLE")}>Block date</button>
              <button type="button" className={"onb-chip-btn" + (overrideMode === "CUSTOM_HOURS" ? " selected" : "")} onClick={() => setOverrideMode("CUSTOM_HOURS")}>Custom hours</button>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "1fr 1fr 1fr auto" : "1fr auto", gap: 8, alignItems: "end" }}>
              <input type="date" className="onb-input" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
              {overrideMode === "CUSTOM_HOURS" && (<><input type="time" className="onb-input" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} /><input type="time" className="onb-input" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} /></>)}
              <button type="button" className="onb-btn onb-btn-secondary onb-btn-sm" onClick={addOverride} disabled={Boolean(overrideValidationMessage)}>Add</button>
            </div>
            {overrideValidationMessage && <p style={{ marginTop: 10, fontSize: 12.5, color: "#991B1B" }} role="alert">{overrideValidationMessage}</p>}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">Step 03 · Conferencing</span>
            <h2>How should guests <em>join this meeting?</em></h2>
            <p>Choose a meeting platform based on host email. Zoom is always available.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div className="onb-field">
              <span className="lbl">Location & conferencing</span>
              <div className="onb-radios">
                {visibleLocations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={"onb-radio-card" + (draft.location === l.id ? " selected" : "")}
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, location: l.id, conferencingProvider: l.conferencing }));
                      if (l.conferencing !== "google_meet" && l.conferencing !== "zoom") return;
                      void (async () => {
                        try {
                          const creds = await ensureDraftCredentials();
                          const kind = l.conferencing === "google_meet" ? "calendar" : "conferencing";
                          const provider = l.conferencing === "google_meet" ? "google" : "zoom";
                          window.location.assign(api.getIntegrationConnectUrl(kind, provider, {
                            draftSlug: creds.draftSlug,
                            draftToken: creds.draftToken,
                            source: "host-dashboard",
                            returnTo: "/d/onboarding/event?step=3",
                          }));
                        } catch (e) {
                          console.error(e);
                          setError("Unable to start conferencing authentication.");
                        }
                      })();
                    }}
                  >
                    <span className="glyph" style={{ background: `var(--${l.tint}-soft)`, borderColor: `var(--${l.tint})` }}><LocGlyph kind={l.id} /></span>
                    <span className="name">{l.name}</span>
                    <span className="sub">{l.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">Step 04 · Review & publish</span>
            <h2>One quiet look <em>before it goes live.</em></h2>
            <p>You can adjust anything later.</p>
          </div>
          <div className="onb-review-card">
            <div className="onb-review-rows">
              <div className="row"><span className="lbl">Host email</span><span className="val">{draft.hostEmail || <em>Not set</em>}</span></div>
              <div className="row"><span className="lbl">Event</span><span className="val">{draft.eventName || <em>Untitled</em>}</span></div>
              <div className="row"><span className="lbl">Duration</span><span className="val">{draft.duration} minutes</span></div>
              <div className="row"><span className="lbl">Conferencing</span><span className="val">{LOCATIONS.find((l) => l.id === draft.location)?.name ?? draft.location}</span></div>
              <div className="row"><span className="lbl">Timezone</span><span className="val">{timezone}</span></div>
            </div>
          </div>
        </>
      )}
    </StepShell>
  );
}
