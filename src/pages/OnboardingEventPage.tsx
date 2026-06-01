import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { useOnboardingState } from "@/state/OnboardingContext";
import { useIntegrationState } from "@/state/IntegrationContext";
import type { DayOfWeek, DraftOverride, ProjectionDestinationRequest } from "@/services/types";
import { StepShell } from "@/features/onboarding/StepShell";
import type { StepMetaItem } from "@/features/onboarding/StepShell";
import { redirectToExternal } from "@/lib/redirectSafety";
import "./onboarding/calendars-projection.css";
import { CalendarsProjectionStep } from "./onboarding/CalendarsProjectionStep";
import {
  hasConsumerMicrosoftConnection,
  isTeamsDisabledByRuntimeCapability,
  toCapabilityAwareUnsupportedMessage,
  unsupportedCapabilityMessage,
} from "@/lib/conferencingCapabilities";
import type { IntegrationProviderId } from "@/state/IntegrationContext";

const DEFAULT_STEPS = ["Meeting details", "Calendars & projection", "Schedule", "How you'll meet", "Review & Publish"];
const ANON_STEPS = ["Meeting details", "Your schedule", "How you'll meet", "Review & Publish"];
const ANON_STEP_META: StepMetaItem[] = [
  {
    label: "Meeting details",
    hint: "Name & description",
    asideTitle: (<>Let&apos;s set up your <em>booking link.</em></>),
    blurb: "Add host email, event details, and a short note guests will see.",
  },
  {
    label: "Your schedule",
    hint: "Weekly rhythm",
    asideTitle: (<>The shape of <em>your week.</em></>),
    blurb: "Define weekly availability manually, with timezone and optional date overrides.",
  },
  {
    label: "How you'll meet",
    hint: "Conferencing & duration",
    asideTitle: (<>Video call, phone, <em>or in person?</em></>),
    blurb: "Conferencing options are shown based on host email provider and selected mode.",
  },
  {
    label: "Review & publish",
    hint: "Share your link",
    asideTitle: (<>Almost there. <em>Take a calm look.</em></>),
    blurb: "Review everything before publishing your anonymous booking link.",
  },
];

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const DAY_LONG: Record<DayOfWeek, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

const LOCATIONS = [
  { id: "meet",      name: "Google Meet",  sub: "From your calendar",       tint: "sage",  conferencing: "google_meet" as const },
  { id: "teams",     name: "Microsoft Teams", sub: "Auto-generated Teams room", tint: "blush", conferencing: "microsoft_teams" as const },
  { id: "zoom",      name: "Zoom",         sub: "Auto-generated link",      tint: "peach", conferencing: "zoom" as const },
  { id: "custom",    name: "Custom URL",   sub: "Paste your own link",      tint: "lilac", conferencing: "custom_url" as const },
  { id: "phone",     name: "Phone call",   sub: "Use guest's number",       tint: "butter", conferencing: "none" as const },
  { id: "in-person", name: "In person",    sub: "Office, café, studio",     tint: "blush", conferencing: "none" as const },
];

const DURATIONS = [15, 30, 45, 60, 90];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function hourFromTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function detectEmailProvider(email: string): "google" | "microsoft_work" | "microsoft_personal" | "unknown" {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return "unknown";
  if (domain === "gmail.com" || domain === "googlemail.com" || domain.includes("google")) return "google";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "microsoft_personal";
  if (
    domain.endsWith(".onmicrosoft.com")
    || domain === "microsoft.com"
    || domain === "office365.com"
    || domain.includes("outlook")
    || domain.includes("microsoft")
  ) return "microsoft_work";
  return "unknown";
}
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Location icon glyphs ───────────────────────────────────────────────────
function LocGlyph({ kind }: { kind: string }) {
  const s = { stroke: "#2B1F3D", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (kind === "zoom") return <svg width="14" height="14" viewBox="0 0 16 16"><rect x="2" y="4" width="9" height="8" rx="2" {...s}/><path d="M11 8l4-2v6l-4-2" {...s}/></svg>;
  if (kind === "meet") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 4h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6l-3 2v-2H3z" {...s}/></svg>;
  if (kind === "phone") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 3h2l1.5 3-1.5 1.5a8 8 0 0 0 3 3L10.5 9 13.5 10.5V13h-2A8 8 0 0 1 3 4z" {...s}/></svg>;
  if (kind === "custom") return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M6 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" {...s}/><path d="M10 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" {...s}/></svg>;
  return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 13h12M3 13V7l5-4 5 4v6M6 13V9h4v4" {...s}/></svg>;
}

interface AvailabilityCalendarRow {
  key: string;
  connectionId: string;
  provider: string;
  externalCalendarId: string;
  canWrite: boolean;
  label: string;
  connectionLabel: string;
}

// ── Live preview card ──────────────────────────────────────────────────────
function LivePreview({ eventName, duration, location, username }: {
  eventName: string; duration: number; location: string; username: string;
}) {
  const slug = slugify(eventName) || "your-event";
  const locName = (LOCATIONS.find((l) => l.id === location) || LOCATIONS[0]).name;
  return (
    <div className="onb-live-preview">
      <div>
        <div className="prev-lbl">Your booking link · preview</div>
        <div className="prev-url">
          bunnycal.io / <span className="slug">{username}</span> / {slug}
        </div>
        <div className="prev-name">{eventName || "Your event"}</div>
        <div className="prev-meta">{duration} min · {locName}</div>
      </div>
      <div className="prev-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z" stroke="#2B1F3D" strokeWidth="1.3"/>
          <circle cx="10" cy="16.4" r=".7" fill="#2B1F3D"/>
          <circle cx="14" cy="16.4" r=".7" fill="#2B1F3D"/>
        </svg>
      </div>
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────
export function OnboardingEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, setDraft, goToStep, reset } = useOnboardingState();
  const flowMode = searchParams.get("mode") === "anonymous" ? "anonymous" : "default";
  const isAnonymousFlow = flowMode === "anonymous";
  const freshEntry = searchParams.get("fresh") === "1";
  const steps = isAnonymousFlow ? ANON_STEPS : DEFAULT_STEPS;
  const maxStep = steps.length;
  const availabilityStepIndex = isAnonymousFlow ? 1 : 2;
  const conferencingStepIndex = isAnonymousFlow ? 2 : 3;
  const reviewStepIndex = isAnonymousFlow ? 3 : 4;
  const {
    calendarConnections,
    conferencingRuntime,
    error: integrationsError,
    getConferencingProviderStatus,
  } = useIntegrationState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<"UNAVAILABLE" | "CUSTOM_HOURS">("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const anonymousResetDoneRef = useRef(false);
  const requestedStep = Number(searchParams.get("step"));
  const step = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= maxStep
    ? requestedStep - 1
    : Math.min(draft.currentStep, maxStep - 1);

  const resetAnonymousFlowState = () => {
    sessionStorage.removeItem(`onboarding-draft:${user?.id ?? "anon"}`);
    reset();
    setDraft((prev) => ({ ...prev, location: "", conferencingProvider: "none", customConferenceUrl: "" }));
    setError(null);
    setSaving(false);
    setOverrideMode("UNAVAILABLE");
    setOverrideDate("");
    setOverrideStartTime("09:00");
    setOverrideEndTime("13:00");
  };

  useEffect(() => {
    if (!isAnonymousFlow) {
      anonymousResetDoneRef.current = false;
      return;
    }
    if (anonymousResetDoneRef.current) return;
    anonymousResetDoneRef.current = true;
    resetAnonymousFlowState();
    const next = new URLSearchParams(searchParams);
    next.set("mode", "anonymous");
    next.set("step", "1");
    next.delete("fresh");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnonymousFlow, reset, searchParams, setSearchParams, user?.id, freshEntry]);

  useEffect(() => {
    if (step !== draft.currentStep) goToStep(step);
  }, [draft.currentStep, goToStep, step]);

  const slug = useMemo(() => slugify(draft.eventName || "event"), [draft.eventName]);
  const previewPath = useMemo(
    () => toPublicBookingPath(user?.username || "yourname", slug),
    [slug, user?.username],
  );

  const setStep = (idx: number) => {
    goToStep(idx);
    const next = new URLSearchParams(searchParams);
    next.set("step", String(idx + 1));
    if (isAnonymousFlow) next.set("mode", "anonymous");
    next.delete("fresh");
    setSearchParams(next, { replace: true });
  };

  const next = async () => {
    setError(null);
    if (!stepComplete(step)) {
      if (isAnonymousFlow && step === 0 && !isValidEmail(draft.hostEmail)) {
        setError("Please provide a valid host email.");
      } else {
        setError("Please complete this step before continuing.");
      }
      return;
    }
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
            await Promise.all(
              draft.overrides.map((ovr) =>
                api.createAvailabilityOverride({
                  date: ovr.date,
                  available: ovr.isAvailable ?? false,
                  isAvailable: ovr.isAvailable ?? false,
                  ...(ovr.isAvailable ? { startTime: ovr.startTime, endTime: ovr.endTime } : {}),
                }),
              ),
            );
          }
        }
      } catch (e) {
        console.error(e);
        setError("Unable to save availability and overrides.");
        return;
      }
    }
    if (step < reviewStepIndex) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const publish = async () => {
    setSaving(true);
    setError(null);
    try {
      const conferencingProvider = draft.conferencingProvider ?? "google_meet";
      const customConferenceUrl = conferencingProvider === "custom_url" ? draft.customConferenceUrl.trim() : "";
      const providerNeedsAuth = conferencingProvider === "google_meet" || conferencingProvider === "microsoft_teams" || conferencingProvider === "zoom";
      const providerConnected = providerNeedsAuth
        ? getConferencingProviderStatus(conferencingProvider as IntegrationProviderId) === "connected"
        : true;
      if (providerNeedsAuth && !providerConnected) {
        setError("Connect the selected conferencing provider before publishing.");
        setSaving(false);
        return;
      }
      if (conferencingProvider === "custom_url" && !isValidHttpUrl(customConferenceUrl)) {
        setError("Enter a valid custom meeting URL before publishing.");
        setSaving(false);
        return;
      }
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
          if (!selection.connectionId || !selection.provider || !selection.externalCalendarId) return null;
          return {
            connectionId: selection.connectionId,
            provider: selection.provider,
            externalCalendarId: selection.externalCalendarId,
          };
        })
        .filter((item): item is { connectionId: string; provider: string; externalCalendarId: string } => Boolean(item));

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
      const projectionDestination: ProjectionDestinationRequest = {
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
    } catch (e) {
      console.error(e);
      setError(toCapabilityAwareUnsupportedMessage(e, "Unable to create event type."));
    } finally {
      setSaving(false);
    }
  };

  const toLabel = (provider: string) =>
    provider.split(/[_-]/g).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

  // /integrations/calendar/status returns connections[].calendars[] inventory.
  // Step 4 must select from that inventory and persist calendar.calendarId verbatim.
  const availabilityCalendarRows: AvailabilityCalendarRow[] = calendarConnections
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
    .filter((row): row is AvailabilityCalendarRow => Boolean(row));

  const selectionKey = (item: { connectionId: string; externalCalendarId: string }) => `${item.connectionId}:${item.externalCalendarId}`;
  const selectedCalendarKeys = new Set(draft.availabilityCalendars.map(selectionKey));
  const projectionKey = draft.projectionDestination ? selectionKey(draft.projectionDestination) : "";

  const toggleAvailabilityCalendar = (row: AvailabilityCalendarRow) => {
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

  const setProjectionDestinationByKey = (key: string) => {
    setDraft((prev) => {
      const row = availabilityCalendarRows.find((r) => r.key === key);
      if (!row) return { ...prev, projectionDestination: null };
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
    if (!overrideDate) return "Choose a date.";
    if (overrideMode === "CUSTOM_HOURS") {
      if (!overrideStartTime || !overrideEndTime) return "Choose start and end time.";
      if (overrideEndTime <= overrideStartTime) return "End time must be after start time.";
    }
    return "";
  }, [overrideDate, overrideEndTime, overrideMode, overrideStartTime]);
  const teamsDisabledByRuntime = isTeamsDisabledByRuntimeCapability(calendarConnections, conferencingRuntime);
  const hasConsumerMsa = hasConsumerMicrosoftConnection(calendarConnections);
  const emailProvider = detectEmailProvider(draft.hostEmail);
  const projectionProvider = (draft.projectionDestination?.provider ?? "").toLowerCase();
  const teamsEligibleForProjection = projectionProvider === "microsoft" && !teamsDisabledByRuntime;
  const conferencingOptionReasons: Record<string, string> = {
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
      if (emailProvider === "google") return new Set(["google_meet", "zoom", "custom_url", "none"]);
      if (emailProvider === "microsoft_work") return new Set(["microsoft_teams", "zoom", "custom_url", "none"]);
      return new Set(["zoom", "custom_url", "none"]);
    }
    if (projectionProvider === "google") return new Set(["google_meet", "zoom", "custom_url", "none"]);
    if (projectionProvider === "microsoft") {
      const allowed = new Set(["zoom", "custom_url", "none"]);
      if (teamsEligibleForProjection) allowed.add("microsoft_teams");
      return allowed;
    }
    return new Set(["custom_url", "none"]);
  })();
  const visibleLocations = isAnonymousFlow
    ? LOCATIONS.filter((item) => allowedConferencingProviders.has(item.conferencing))
    : LOCATIONS;
  const conferencingReturnTo = isAnonymousFlow ? "/onboarding/event?mode=anonymous&step=3" : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const providerAuthUrl = (provider: "google_meet" | "microsoft_teams" | "zoom") => {
    if (provider === "google_meet") return api.getIntegrationConnectUrl("calendar", "google", { source: "host-dashboard", returnTo: conferencingReturnTo });
    if (provider === "microsoft_teams") return api.getIntegrationConnectUrl("calendar", "microsoft", { source: "host-dashboard", returnTo: conferencingReturnTo });
    return api.getIntegrationConnectUrl("conferencing", "zoom", { source: "host-dashboard", returnTo: conferencingReturnTo });
  };
  const conferencingProviderValid = allowedConferencingProviders.has(draft.conferencingProvider);
  const requiresConferencingAuth = draft.conferencingProvider === "google_meet" || draft.conferencingProvider === "microsoft_teams" || draft.conferencingProvider === "zoom";
  const conferencingConnected = requiresConferencingAuth
    ? getConferencingProviderStatus(draft.conferencingProvider as IntegrationProviderId) === "connected"
    : true;
  const stepComplete = (index: number) => {
    if (isAnonymousFlow && index < step && draft.touchedSteps.includes(index + 1)) return true;
    if (index === 0) {
      if (isAnonymousFlow) {
        const hasHostEmail = isValidEmail(draft.hostEmail);
        return hasHostEmail && draft.eventName.trim().length > 1 && draft.duration >= 15;
      }
      return draft.eventName.trim().length > 1;
    }
    if (index === 1 && !isAnonymousFlow) {
      if (draft.availabilityCalendars.length === 0) return false;
      const target = draft.projectionDestination;
      return Boolean(target && target.connectionId && target.provider && target.externalCalendarId);
    }
    if (index === availabilityStepIndex) return DAYS.some((d) => draft.weeklyRules[d].enabled);
    if (index === conferencingStepIndex) {
      if (draft.location.trim().length < 1 || draft.duration < 15) return false;
      if (!conferencingProviderValid) return false;
      if (draft.conferencingProvider === "custom_url") return isValidHttpUrl(draft.customConferenceUrl);
      if (requiresConferencingAuth && !conferencingConnected) return false;
      return true;
    }
    return false;
  };

  const addOverride = () => {
    if (overrideValidationMessage) return;
    const next: DraftOverride = overrideMode === "UNAVAILABLE"
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

  const removeOverride = (date: string) => {
    setDraft((prev) => ({ ...prev, overrides: prev.overrides.filter((o) => o.date !== date) }));
  };

  return (
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
      stepMeta={isAnonymousFlow ? ANON_STEP_META : undefined}
    >
      {/* ── Step 0: Basic details ── */}
      {step === 0 && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">Step 01 · Basic details</span>
            <h2>What should we call <em>this conversation?</em></h2>
            <p>A short name and a calm note. Invitees see this when your link opens.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
            {isAnonymousFlow && (
              <>
                <div className="onb-field">
                  <label className="lbl" htmlFor="hostEmail">Host email</label>
                  <input
                    id="hostEmail"
                    type="email"
                    className="onb-input"
                    placeholder="name@company.com"
                    value={draft.hostEmail}
                    onChange={(e) => setDraft((prev) => ({ ...prev, hostEmail: e.target.value }))}
                  />
                </div>
                <div className="onb-field">
                  <label className="lbl" htmlFor="hostDisplayName">Host name</label>
                  <input
                    id="hostDisplayName"
                    className="onb-input"
                    placeholder="Host name"
                    value={draft.hostDisplayName}
                    onChange={(e) => setDraft((prev) => ({ ...prev, hostDisplayName: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div className="onb-field">
              <label className="lbl" htmlFor="eventName">Event name</label>
              <input
                id="eventName"
                className="onb-input onb-input-xl"
                placeholder="Intro chat"
                value={draft.eventName}
                onChange={(e) => setDraft((prev) => ({ ...prev, eventName: e.target.value }))}
              />
              <span className="hint">e.g. "Intro chat", "Quarterly walk", "Office hours"</span>
            </div>

            <div className="onb-field">
              <label className="lbl" htmlFor="description">A short note</label>
              <textarea
                id="description"
                className="onb-textarea"
                placeholder="A gentle line so invitees know what to expect. Optional."
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {isAnonymousFlow && (
              <>
                <div className="onb-field">
                  <span className="lbl">Duration</span>
                  <div className="onb-chips-row">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={"onb-chip-btn" + (draft.duration === d ? " selected" : "")}
                        onClick={() => setDraft((prev) => ({ ...prev, duration: d }))}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
                <div className="onb-field">
                  <label className="lbl" htmlFor="timezone">Timezone</label>
                  <input
                    id="timezone"
                    className="onb-input"
                    value={draft.timezone}
                    onChange={(e) => setDraft((prev) => ({ ...prev, timezone: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <LivePreview
            eventName={draft.eventName}
            duration={draft.duration}
            location={draft.location}
            username={username}
          />
        </>
      )}

      {/* ── Step 1: Calendars & projection ── */}
      {!isAnonymousFlow && step === 1 && (
        <CalendarsProjectionStep
          rows={availabilityCalendarRows}
          selectedKeys={selectedCalendarKeys}
          projectionKey={projectionKey}
          integrationsError={integrationsError}
          onToggleAvailability={toggleAvailabilityCalendar}
          onSelectProjection={setProjectionDestinationByKey}
          toLabel={toLabel}
        />
      )}

      {/* ── Step 2: Availability ── */}
      {step === availabilityStepIndex && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">{isAnonymousFlow ? "Step 02 · Availability" : "Step 03 · Availability"}</span>
            <h2>The shape <em>of your week.</em></h2>
            <p>Quiet mornings, soft afternoons, no Fridays — define the rhythm you actually live by. BunnyCal honors it gently.</p>
          </div>

          {isAnonymousFlow && (
            <div className="onb-field" style={{ marginBottom: 14 }}>
              <label className="lbl" htmlFor="timezone-step">Timezone</label>
              <input
                id="timezone-step"
                className="onb-input"
                value={draft.timezone}
                onChange={(e) => setDraft((prev) => ({ ...prev, timezone: e.target.value }))}
              />
            </div>
          )}

          <div className="onb-avail-rows">
            {DAYS.map((day) => {
              const rule = draft.weeklyRules[day];
              const startH = hourFromTime(rule.startTime);
              const endH = hourFromTime(rule.endTime);
              return (
                <div key={day} className={"onb-avail-row" + (rule.enabled ? "" : " off")}>
                  <div className="day">
                    {DAY_LONG[day]}
                    <span className="sub">{rule.enabled ? "Available" : "Day off"}</span>
                  </div>
                  <div className="bar" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, h) => {
                      const on = rule.enabled && h >= Math.floor(startH) && h < Math.ceil(endH);
                      return <div key={h} className={"cell" + (on ? " on" : "")} />;
                    })}
                  </div>
                  <input
                    type="time"
                    value={rule.startTime}
                    disabled={!rule.enabled}
                    onChange={(e) => setDraft((prev) => ({
                      ...prev,
                      weeklyRules: {
                        ...prev.weeklyRules,
                        [day]: { ...prev.weeklyRules[day], startTime: e.target.value },
                      },
                    }))}
                    aria-label={`${DAY_LONG[day]} start time`}
                  />
                  <input
                    type="time"
                    value={rule.endTime}
                    disabled={!rule.enabled}
                    onChange={(e) => setDraft((prev) => ({
                      ...prev,
                      weeklyRules: {
                        ...prev.weeklyRules,
                        [day]: { ...prev.weeklyRules[day], endTime: e.target.value },
                      },
                    }))}
                    aria-label={`${DAY_LONG[day]} end time`}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    className={"onb-toggle" + (rule.enabled ? " on" : "")}
                    onClick={() => setDraft((prev) => ({
                      ...prev,
                      weeklyRules: {
                        ...prev.weeklyRules,
                        [day]: { ...prev.weeklyRules[day], enabled: !rule.enabled },
                      },
                    }))}
                    aria-label={`Toggle ${DAY_LONG[day]}`}
                  />
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 28, padding: 18, background: "var(--ivory-2)",
            border: "1px solid var(--border)", borderRadius: 14,
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 12,
              background: "var(--sage-soft)", border: "1px solid var(--sage)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8.5L6 12.5L14 4.5" stroke="var(--plum-700)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--plum-400)" }}>Protected by default</div>
              <div style={{ marginTop: 4, color: "var(--plum-700)", fontSize: 14 }}>
                BunnyCal won't offer times outside these hours. You can also set one-off overrides below.
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 16,
            padding: 18,
            background: "var(--cream)",
            border: "1px solid var(--border)",
            borderRadius: 14,
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }}>
              Date overrides
            </div>
            <p style={{ marginTop: 8, marginBottom: 14, color: "var(--plum-500)", fontSize: 13.5 }}>
              Add blocked days or custom-hours exceptions for holidays, travel, and special schedules.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={"onb-chip-btn" + (overrideMode === "UNAVAILABLE" ? " selected" : "")} onClick={() => setOverrideMode("UNAVAILABLE")}>
                Block date
              </button>
              <button type="button" className={"onb-chip-btn" + (overrideMode === "CUSTOM_HOURS" ? " selected" : "")} onClick={() => setOverrideMode("CUSTOM_HOURS")}>
                Custom hours
              </button>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "1fr 1fr 1fr auto" : "1fr auto", gap: 8, alignItems: "end" }}>
              <label className="onb-field">
                <span className="lbl">Date</span>
                <input type="date" className="onb-input" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
              </label>
              {overrideMode === "CUSTOM_HOURS" && (
                <>
                  <label className="onb-field">
                    <span className="lbl">Start</span>
                    <input type="time" className="onb-input" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} />
                  </label>
                  <label className="onb-field">
                    <span className="lbl">End</span>
                    <input type="time" className="onb-input" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} />
                  </label>
                </>
              )}
              <button type="button" className="onb-btn onb-btn-secondary onb-btn-sm" onClick={addOverride} disabled={Boolean(overrideValidationMessage)}>
                Add
              </button>
            </div>
            {overrideValidationMessage && (
              <p style={{ marginTop: 10, fontSize: 12.5, color: "#991B1B" }} role="alert">{overrideValidationMessage}</p>
            )}
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {draft.overrides.length === 0 ? (
                <p style={{ margin: 0, color: "var(--plum-400)", fontSize: 13 }}>No overrides yet.</p>
              ) : draft.overrides.map((ovr) => (
                <div key={ovr.date} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, background: "var(--ivory-2)", padding: "10px 12px" }}>
                  <div style={{ color: "var(--plum-700)", fontSize: 13.5 }}>
                    <strong>{ovr.date}</strong>{" "}
                    <span style={{ color: "var(--plum-500)" }}>
                      {ovr.isAvailable ? `· ${ovr.startTime} – ${ovr.endTime}` : "· Unavailable"}
                    </span>
                  </div>
                  <button type="button" className="onb-btn onb-btn-secondary onb-btn-sm" onClick={() => removeOverride(ovr.date)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Step 3: Conferencing ── */}
      {step === conferencingStepIndex && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">{isAnonymousFlow ? "Step 03 · Conferencing" : "Step 04 · Conferencing"}</span>
            <h2>How should guests <em>join this meeting?</em></h2>
            <p>{isAnonymousFlow ? "Options depend on host email provider, with Zoom always available." : "Options are filtered by the selected projection provider and account capabilities."}</p>
          </div>

          {!isAnonymousFlow && !draft.projectionDestination && (
            <p className="onb-error">Select a booking destination calendar in Step 02 to unlock conferencing options.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 820 }}>
            <div className="onb-field">
              <span className="lbl">Location & conferencing</span>
              <div className="onb-radios">
                {visibleLocations.map((l) => {
                  const isAllowed = allowedConferencingProviders.has(l.conferencing);
                  const disabledReason = isAllowed ? "" : (conferencingOptionReasons[l.conferencing] ?? "Unavailable for current projection.");
                  const disabled = !isAllowed && !isAnonymousFlow;
                  const onPick = () => {
                    if (disabled) return;
                    const nextProvider = l.conferencing;
                    setDraft((prev) => ({
                      ...prev,
                      location: l.id,
                      conferencingProvider: nextProvider,
                    }));
                    const needsOAuth = nextProvider === "google_meet" || nextProvider === "microsoft_teams" || nextProvider === "zoom";
                    const connected = needsOAuth ? getConferencingProviderStatus(nextProvider as IntegrationProviderId) === "connected" : true;
                    if (isAnonymousFlow && needsOAuth && !connected) {
                      try {
                        redirectToExternal(providerAuthUrl(nextProvider), api.baseUrl, "assign");
                      } catch (redirectError) {
                        console.error("Failed to start conferencing authentication redirect", redirectError);
                        setError("Unable to start conferencing authentication.");
                      }
                    }
                  };
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={"onb-radio-card" + (draft.location === l.id ? " selected" : "")}
                      onClick={onPick}
                      disabled={disabled}
                      aria-disabled={disabled}
                      style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                      title={!isAnonymousFlow && disabled ? disabledReason : undefined}
                    >
                      <span
                        className="glyph"
                        style={{
                          background: `var(--${l.tint}-soft)`,
                          borderColor: `var(--${l.tint})`,
                        }}
                      >
                        <LocGlyph kind={l.id} />
                      </span>
                      <span className="name">{l.name}</span>
                      <span className="sub">
                        {l.sub}
                        {!isAnonymousFlow && disabled ? ` · ${disabledReason}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!isAnonymousFlow && projectionProvider === "microsoft" && hasConsumerMsa && (
                <div className="hint" style={{ marginTop: 8 }}>{unsupportedCapabilityMessage()}</div>
              )}
              {draft.conferencingProvider === "custom_url" && (
                <div style={{ marginTop: 12 }}>
                  <label className="onb-field">
                    <span className="lbl">Custom meeting URL</span>
                    <input
                      type="url"
                      className="onb-input"
                      placeholder="https://meet.example.com/your-room"
                      value={draft.customConferenceUrl}
                      onChange={(e) => setDraft((prev) => ({ ...prev, customConferenceUrl: e.target.value }))}
                    />
                    <span className="hint">This link is shared with guests on every booking.</span>
                  </label>
                </div>
              )}
              {requiresConferencingAuth && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {conferencingConnected ? (
                    <span className="onb-badge ok"><span className="dot"></span>{(LOCATIONS.find((v) => v.conferencing === draft.conferencingProvider)?.name ?? "Provider")} connected</span>
                  ) : (
                    <span className="hint">
                      Selecting this card starts provider authentication automatically.
                    </span>
                  )}
                </div>
              )}
            </div>

            {!isAnonymousFlow && (
              <div className="onb-field">
              <span className="lbl">Duration</span>
              <div className="onb-chips-row">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={"onb-chip-btn" + (draft.duration === d ? " selected" : "")}
                    onClick={() => setDraft((prev) => ({ ...prev, duration: d }))}
                  >
                    {d} min
                  </button>
                ))}
              </div>
              <span className="hint">BunnyCal adds a 5-minute hold and a 15-minute buffer automatically.</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Step 4: Review & publish ── */}
      {step === reviewStepIndex && (
        <>
          <div className="onb-step-head">
            <span className="eyebrow">{isAnonymousFlow ? "Step 04 · Review & publish" : "Step 05 · Review & publish"}</span>
            <h2>One quiet look <em>before it goes live.</em></h2>
            <p>You can adjust anything later from the dashboard.</p>
          </div>

          <div className="onb-review-card">
            <div className="rev-header">
              <div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }}>Booking link</span>
                <h3 className="ev-name" style={{ marginTop: 10 }}>
                  {draft.eventName || <em>Your event</em>}
                </h3>
                <div className="ev-url">bunnycal.io / {username} / {slug}</div>
              </div>
              <span className="onb-badge synced"><span className="dot"></span>Ready to publish</span>
            </div>

            <div className="onb-review-rows">
              {isAnonymousFlow && (
                <div className="row">
                  <span className="lbl">Host email</span>
                  <span className="val">{draft.hostEmail || <em>Not set</em>}</span>
                </div>
              )}
              <div className="row">
                <span className="lbl">Duration</span>
                <span className="val">{draft.duration} minutes</span>
              </div>
              <div className="row">
                <span className="lbl">Location</span>
                <span className="val">
                  {(LOCATIONS.find((l) => l.id === draft.location) || LOCATIONS[0]).name}
                </span>
              </div>
              <div className="row">
                <span className="lbl">Available days</span>
                <span className="val">
                  {DAYS.filter((d) => draft.weeklyRules[d].enabled).length === 0
                    ? <em>No days enabled</em>
                    : DAYS.filter((d) => draft.weeklyRules[d].enabled)
                        .map((d) => DAY_LONG[d].slice(0, 3)).join(" · ")}
                </span>
              </div>
              <div className="row">
                <span className="lbl">Default hours</span>
                <span className="val">
                  {(() => {
                    const enabledDay = DAYS.find((d) => draft.weeklyRules[d].enabled);
                    if (!enabledDay) return <em>Not set</em>;
                    const r = draft.weeklyRules[enabledDay];
                    return `${r.startTime} – ${r.endTime}`;
                  })()}
                </span>
              </div>
              {!isAnonymousFlow && (
                <div className="row">
                <span className="lbl">Synced calendars</span>
                <span className="val">
                  {(() => {
                    const connected: string[] = [];
                    calendarConnections.forEach((connection) => {
                      if (connection.status.toUpperCase() === "CONNECTED") connected.push(toLabel(connection.provider));
                    });
                    return connected.length === 0 ? <em>None connected</em> : connected.join(" · ");
                  })()}
                </span>
                </div>
              )}
              {!isAnonymousFlow && (
                <div className="row">
                <span className="lbl">Availability calendars</span>
                <span className="val">
                  {draft.availabilityCalendars.length === 0
                    ? <em>None selected</em>
                    : draft.availabilityCalendars
                        .map((selection) => `${toLabel(selection.provider)} · ${selection.displayName || selection.externalCalendarId}`)
                        .join(" · ")}
                </span>
                </div>
              )}
              {!isAnonymousFlow && (
                <div className="row">
                <span className="lbl">Booking destination</span>
                <span className="val">
                  {draft.projectionDestination
                    ? `${toLabel(draft.projectionDestination.provider)} · ${draft.projectionDestination.displayName || draft.projectionDestination.externalCalendarId}`
                    : <em>None selected</em>}
                </span>
                </div>
              )}
              <div className="row">
                <span className="lbl">Conferencing</span>
                <span className="val">
                  {draft.conferencingProvider === "google_meet" && "Google Meet"}
                  {draft.conferencingProvider === "microsoft_teams" && "Microsoft Teams"}
                  {draft.conferencingProvider === "zoom" && "Zoom"}
                  {draft.conferencingProvider === "custom_url" && (draft.customConferenceUrl ? draft.customConferenceUrl : "Custom URL")}
                  {draft.conferencingProvider === "none" && "No video link"}
                </span>
              </div>
              {isAnonymousFlow && (
                <div className="row">
                  <span className="lbl">Conferencing status</span>
                  <span className="val">
                    {draft.conferencingProvider === "custom_url"
                      ? (isValidHttpUrl(draft.customConferenceUrl) ? "Custom link configured" : "Custom link missing")
                      : (conferencingConnected ? "Connected" : "Not connected")}
                  </span>
                </div>
              )}
              <div className="row">
                <span className="lbl">Buffer & hold</span>
                <span className="val">15 min buffer · 5 min hold</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14, color: "var(--plum-500)", fontSize: 14 }}>
            <span className="onb-badge ok"><span className="dot"></span>Your draft is safe</span>
            <span>Publishing will make your link live for invitees. Nothing else changes.</span>
          </div>
        </>
      )}
    </StepShell>
  );
}
