import { useMemo, useState } from "react";
import { api } from "@/services";
import type { EventTypeSummaryResponse } from "@/services/types";
import { useIntegrationState } from "@/state/IntegrationContext";
import { toConferencingProviderEnum } from "@/lib/providerIds";
import { withLegacyProviderEnums } from "@/domain/adapters/eventTypeAdapter";

interface Props {
  events: EventTypeSummaryResponse[];
  eventsLoading: boolean;
  eventsError: string | null;
  onReload: () => Promise<void> | void;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function readConnectionId(calendar: Record<string, unknown> | undefined, entry: Record<string, unknown> | undefined): string | null {
  const candidate = [
    calendar?.connectionId,
    calendar?.calendarConnectionId,
    calendar?.integrationConnectionId,
    entry?.connectionId,
    entry?.calendarConnectionId,
    entry?.integrationConnectionId,
    entry?.providerConnectionId,
  ].find((value) => typeof value === "string" && value.trim());
  return typeof candidate === "string" ? candidate.trim() : null;
}

export function DashboardEventEditorSection({ events, eventsLoading, eventsError, onReload }: Props) {
  const { calendarStatus, getCalendarProviderStatus, hasConferencingCapability } = useIntegrationState();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Google Meet");
  const [orchestrationProvider, setOrchestrationProvider] = useState<"" | "google" | "microsoft">("");
  const [conferencingProvider, setConferencingProvider] = useState<"google_meet" | "microsoft_teams" | "zoom" | "custom_url" | "none">("google_meet");
  const [customConferenceUrl, setCustomConferenceUrl] = useState("");
  const [availabilityBindings, setAvailabilityBindings] = useState<Array<{ provider: string; calendarId: string }>>([]);
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slug = useMemo(() => slugify(name), [name]);
  const connectedCalendarProviders = Object.keys(calendarStatus).filter((provider) => getCalendarProviderStatus(provider) === "connected");
  const bindingSet = new Set(availabilityBindings.map((binding) => `${binding.provider}:${binding.calendarId}`));
  const conferenceOptions = [
    { value: "google_meet", label: "Google Meet" },
    { value: "microsoft_teams", label: "Microsoft Teams" },
    { value: "zoom", label: "Zoom" },
    { value: "custom_url", label: "Custom URL" },
    { value: "none", label: "None" },
  ] as const;

  const create = async () => {
    if (!name.trim() || !slug || !orchestrationProvider || availabilityBindings.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const availabilityCalendars = availabilityBindings
        .map((binding, idx) => {
          const entry = calendarStatus[binding.provider] as Record<string, unknown> | undefined;
          const calendars = (entry?.calendars as Array<Record<string, unknown>> | undefined) ?? [];
          const match = calendars.find((calendar) => String(calendar.id ?? "") === binding.calendarId);
          const connectionId = readConnectionId(match, entry);
          if (!connectionId) return null;
          return {
            connectionId,
            externalCalendarId: binding.calendarId,
            participatesInAvailability: true,
            receivesBookings: binding.provider === orchestrationProvider,
            priority: 100 - idx,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const organizerCalendarConnectionId =
        availabilityCalendars.find((binding) => binding.receivesBookings)?.connectionId
        ?? availabilityCalendars[0]?.connectionId;
      await api.createEventType({
        name: name.trim(),
        description: description.trim(),
        location: location.trim() || "Google Meet",
        durationMinutes: duration,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        slotIntervalMinutes: 15,
        minNoticeMinutes: 120,
        maxAdvanceDays: 60,
        holdDurationMinutes: 10,
        slug,
        organizerCalendarConnectionId,
        availabilityCalendars,
        conference: {
          enabled: conferencingProvider !== "none",
          provider: conferencingProvider === "custom_url" ? "custom" : conferencingProvider,
          ...(conferencingProvider === "custom_url" && customConferenceUrl.trim() ? { customUrl: customConferenceUrl.trim() } : {}),
        },
        ...withLegacyProviderEnums(orchestrationProvider, conferencingProvider),
        ...(conferencingProvider === "custom_url" && customConferenceUrl.trim() ? { customConferenceUrl: customConferenceUrl.trim() } : {}),
      });
      setName("");
      setDescription("");
      setDuration(30);
      setOrchestrationProvider("");
      setConferencingProvider("google_meet");
      setCustomConferenceUrl("");
      setAvailabilityBindings([]);
      await onReload();
    } catch (e: unknown) {
      console.error(e);
      const message = (typeof e === "object" && e && "message" in e) ? String((e as { message?: unknown }).message ?? "") : "";
      setSubmitError(message || "Unable to create event type.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <div>
          <h2>Event <em>editor</em></h2>
          <div className="sub">Create and tune booking experiences with production scheduling defaults.</div>
        </div>
      </div>

      {(eventsError || submitError) && <div className="dash-alert error">{eventsError ?? submitError}</div>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="h">
          <div>
            <h3>Create event type</h3>
            <div className="sub">Orchestration-aware event type configuration.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr", gap: 12 }}>
          <div className="dash-field">
            <label>Name</label>
            <input className="dash-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Intro call" />
          </div>
          <div className="dash-field">
            <label>Duration (min)</label>
            <select className="dash-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="dash-field">
            <label>Location</label>
            <input className="dash-input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="dash-field">
            <label>Booking / Calendar provider</label>
            <select className="dash-input" value={orchestrationProvider} onChange={(e) => setOrchestrationProvider(e.target.value as "" | "google" | "microsoft")}>
              <option value="">Select provider</option>
              <option value="google">Google</option>
              <option value="microsoft">Microsoft</option>
            </select>
          </div>
          <div className="dash-field">
            <label>Conferencing provider</label>
            <select className="dash-input" value={conferencingProvider} onChange={(e) => setConferencingProvider(e.target.value as typeof conferencingProvider)}>
              {conferenceOptions
                .filter((opt) => !hasConferencingCapability("GOOGLE_MEET") || hasConferencingCapability(toConferencingProviderEnum(opt.value)))
                .map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {conferencingProvider === "custom_url" && (
          <div className="dash-field" style={{ marginTop: 12 }}>
            <label>Custom conference URL</label>
            <input className="dash-input" type="url" value={customConferenceUrl} onChange={(e) => setCustomConferenceUrl(e.target.value)} />
          </div>
        )}

        <div className="dash-field" style={{ marginTop: 12 }}>
          <label>Availability calendars</label>
          <div style={{ display: "grid", gap: 8 }}>
            {connectedCalendarProviders.length === 0 && <div className="dash-alert error">Connect at least one calendar provider before creating an event type.</div>}
            {connectedCalendarProviders.map((provider) => {
              const calendars = (calendarStatus[provider]?.calendars ?? []).filter((cal) => cal.id);
              return (
                <div key={provider} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--plum-500)", marginBottom: 6 }}>{provider}</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {calendars.map((calendar) => {
                      const id = `${provider}:${calendar.id}`;
                      return (
                        <label key={id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={bindingSet.has(id)}
                            onChange={() =>
                              setAvailabilityBindings((prev) =>
                                bindingSet.has(id)
                                  ? prev.filter((b) => `${b.provider}:${b.calendarId}` !== id)
                                  : [...prev, { provider, calendarId: calendar.id }],
                              )
                            }
                          />
                          <span>{calendar.name ?? calendar.id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dash-field" style={{ marginTop: 12 }}>
          <label>Description</label>
          <textarea className="dash-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What guests should expect in this meeting." />
        </div>

        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--plum-500)" }}>
          Booking link slug: <strong>{slug || "(enter a name)"}</strong>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button className="dash-btn-primary" disabled={!name.trim() || !slug || !orchestrationProvider || availabilityBindings.length === 0 || submitting} onClick={create}>
            {submitting ? "Creating..." : "Create event type"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="h">
          <div>
            <h3>Existing event types</h3>
            <div className="sub">Production event links currently available.</div>
          </div>
          <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => onReload()}>
            Refresh
          </button>
        </div>

        {eventsLoading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 56 }} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="dash-empty" style={{ padding: "12px 0" }}>
            <h3>No event types yet</h3>
            <p>Create your first event type using the editor above.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {events.map((event) => (
              <article key={event.id} className="et-row">
                <div className="stripe lilac" />
                <div>
                  <div className="name">{event.name}</div>
                  <div className="slug">/{event.slug}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <a className="dash-btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }} href={event.link} target="_blank" rel="noreferrer">Open</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
