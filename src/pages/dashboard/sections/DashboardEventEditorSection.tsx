import { useMemo, useState } from "react";
import { api } from "@/services";
import type { EventTypeSummaryResponse } from "@/services/types";

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

export function DashboardEventEditorSection({ events, eventsLoading, eventsError, onReload }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Google Meet");
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slug = useMemo(() => slugify(name), [name]);

  const create = async () => {
    if (!name.trim() || !slug) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
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
      });
      setName("");
      setDescription("");
      setDuration(30);
      await onReload();
    } catch (e) {
      console.error(e);
      setSubmitError("Unable to create event type.");
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
            <div className="sub">Name, duration, and booking link identity.</div>
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

        <div className="dash-field" style={{ marginTop: 12 }}>
          <label>Description</label>
          <textarea className="dash-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What guests should expect in this meeting." />
        </div>

        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--plum-500)" }}>
          Booking link slug: <strong>{slug || "(enter a name)"}</strong>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button className="dash-btn-primary" disabled={!name.trim() || !slug || submitting} onClick={create}>
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
