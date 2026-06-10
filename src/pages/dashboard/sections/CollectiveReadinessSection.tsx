import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import type { EventTypeParticipantResponse, ParticipantReadinessStatus, PublishReadinessResponse } from "@/services/types";
import { PublishedStateBadge } from "@/features/collective/PublishedStateBadge";
import { Skeleton } from "@/ui/controls/Skeleton";
import clsx from "@/lib/clsx";

interface Props {
  eventTypeId: string;
}

// ── Readiness semantics (mirrors backend isStructurallyBlocking) ───────────────

type ReadinessTier = "ready" | "degraded" | "blocking" | "inactive";

function getTier(status: ParticipantReadinessStatus): ReadinessTier {
  switch (status) {
    case "READY":             return "ready";
    case "DEGRADED_CALENDAR": return "degraded";
    case "INACTIVE":
    case "REVOKED":           return "inactive";
    default:                  return "blocking";
  }
}

interface StatusInfo {
  label: string;
  description: string;
  action: string | null;
  variant: "ok" | "warn" | "err" | "muted";
}

function getStatusInfo(status: ParticipantReadinessStatus): StatusInfo {
  switch (status) {
    case "READY":
      return {
        label: "Ready",
        description: "Availability schedule set, active calendar connected, writeback enabled.",
        action: null,
        variant: "ok",
      };
    case "DEGRADED_CALENDAR":
      return {
        label: "Degraded",
        description: "Calendar is connected but operating with limited capability. Bookings may still succeed, but event creation or sync may be unreliable.",
        action: "Ask participant to reconnect their calendar.",
        variant: "warn",
      };
    case "NO_AVAILABILITY":
      return {
        label: "No schedule",
        description: "This participant has not configured any availability rules. BunnyCal cannot find open slots for them.",
        action: "Participant must set up their weekly availability schedule.",
        variant: "err",
      };
    case "NO_CALENDAR":
      return {
        label: "No calendar",
        description: "No active calendar connection. Booking events cannot be written to this participant's calendar.",
        action: "Participant must connect a calendar (Google or Microsoft).",
        variant: "err",
      };
    case "NO_WRITEBACK":
      return {
        label: "Read-only calendar",
        description: "A calendar is connected but only has read access. Confirmed bookings cannot be written to this participant's calendar.",
        action: "Participant must reconnect their calendar with write permissions.",
        variant: "err",
      };
    case "INACTIVE":
      return {
        label: "Inactive",
        description: "This user account is inactive and is excluded from scheduling.",
        action: "Remove this participant or reactivate their account.",
        variant: "muted",
      };
    case "REVOKED":
      return {
        label: "Revoked / not found",
        description: "This participant's account was deleted or they are no longer reachable. They are excluded from scheduling.",
        action: "Remove this participant from the event.",
        variant: "muted",
      };
    case "NOT_SCHEDULABLE":
      return {
        label: "Not schedulable",
        description: "This participant does not meet the eligibility requirements for scheduling.",
        action: "Remove this participant or check their account status.",
        variant: "muted",
      };
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressBar({ ready, degraded, total }: { ready: number; degraded: number; total: number }) {
  if (total === 0) return null;
  const readyPct = (ready / total) * 100;
  const degradedPct = (degraded / total) * 100;
  const blockingPct = Math.max(0, 100 - readyPct - degradedPct);

  return (
    <div style={{ height: 6, borderRadius: 4, background: "var(--surface-sunken, #f4f4f5)", overflow: "hidden", display: "flex" }}>
      <div style={{ width: `${readyPct}%`, background: "#22c55e", transition: "width 0.3s" }} />
      <div style={{ width: `${degradedPct}%`, background: "#f59e0b", transition: "width 0.3s" }} />
      <div style={{ width: `${blockingPct}%`, background: "#e5e7eb" }} />
    </div>
  );
}

function ParticipantCard({ p }: { p: EventTypeParticipantResponse }) {
  const tier = getTier(p.readinessStatus);
  const info = getStatusInfo(p.readinessStatus);
  const displayName = p.userName ?? p.userEmail ?? "Unknown";

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${
        tier === "ready"     ? "var(--sage, #86efac)" :
        tier === "degraded"  ? "#fcd34d" :
        tier === "blocking"  ? "#fca5a5" :
                               "var(--border, #e5e5e5)"
      }`,
      background: tier === "ready"    ? "#f0fdf4" :
                  tier === "degraded" ? "#fffbeb" :
                  tier === "blocking" ? "#fff7f7" :
                                        "var(--surface)",
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        {/* Left: identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: tier === "ready"    ? "#dcfce7" :
                        tier === "degraded" ? "#fef3c7" :
                        tier === "blocking" ? "#fee2e2" :
                                              "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
            color: tier === "ready"    ? "#166534" :
                   tier === "degraded" ? "#92400e" :
                   tier === "blocking" ? "#991b1b" :
                                         "#6b7280",
          }}>
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--plum-700)" }}>{displayName}</div>
            {p.userEmail && p.userName && (
              <div style={{ fontSize: 11, color: "var(--plum-400)", marginTop: 1 }}>{p.userEmail}</div>
            )}
            {p.calendarProvider && (
              <div style={{ fontSize: 11, color: "var(--plum-400)", marginTop: 1 }}>
                Calendar: {p.calendarProvider}
              </div>
            )}
          </div>
        </div>

        {/* Right: status badge */}
        <div style={{ flexShrink: 0 }}>
          <span className={clsx("dbadge", info.variant)} title={info.description}>
            <span className="dot" />{info.label}
          </span>
          {p.isOwner && (
            <span className="dbadge ok" style={{ marginLeft: 4 }}>Owner</span>
          )}
        </div>
      </div>

      {/* Status detail */}
      {tier !== "ready" && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 12, color: "var(--plum-600)", lineHeight: 1.5 }}>
            {p.readinessMessage ?? info.description}
          </div>
          {info.action && (
            <div style={{
              marginTop: 6, fontSize: 12, fontWeight: 600,
              color: tier === "degraded" ? "#92400e" : tier === "blocking" ? "#991b1b" : "#6b7280",
            }}>
              → {info.action}
            </div>
          )}
          {/* Capability checklist */}
          <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <CapabilityDot ok={p.hasAvailabilityRules} label="Schedule" />
            <CapabilityDot ok={p.hasActiveCalendar} label="Calendar" />
            <CapabilityDot ok={p.hasWritebackCapability} label="Writeback" />
          </div>
        </div>
      )}

      {/* READY: compact capability confirmation */}
      {tier === "ready" && (
        <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <CapabilityDot ok label="Schedule" />
          <CapabilityDot ok label="Calendar" />
          <CapabilityDot ok label="Writeback" />
        </div>
      )}
    </div>
  );
}

function CapabilityDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: ok ? "#22c55e" : "#e5e7eb",
        flexShrink: 0,
      }} />
      <span style={{ color: ok ? "#166534" : "#9ca3af" }}>{label}</span>
    </span>
  );
}

function ReadinessGate({ readiness, isPublished }: { readiness: PublishReadinessResponse; isPublished: boolean }) {
  const { publishable, degraded, reasons } = readiness;
  const isLiveUnpublishable = isPublished && !publishable;

  if (isLiveUnpublishable) {
    return (
      <div style={{
        borderRadius: 10, border: "1px solid #fca5a5",
        background: "#fff7f7", padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#991b1b", marginBottom: 4 }}>
          Live — no longer publishable
        </div>
        <p style={{ fontSize: 12, color: "#7f1d1d", margin: "0 0 10px" }}>
          This event is live but can no longer meet publish requirements because participants were changed or their calendar access was revoked. Guests can still reach existing booking slots. New bookings may fail if participant availability is unavailable.
        </p>
        <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>Blocking issues:</div>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#7f1d1d" }}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <div style={{ marginTop: 10, fontSize: 12 }}>
          Fix the issues below or{" "}
          <span style={{ fontWeight: 600, color: "#991b1b" }}>unpublish</span>{" "}
          from the event detail page to take it offline immediately.
        </div>
      </div>
    );
  }

  if (!publishable) {
    return (
      <div style={{
        borderRadius: 10, border: "1px solid #fca5a5",
        background: "#fff7f7", padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#991b1b", marginBottom: 4 }}>
          Not publishable
        </div>
        <p style={{ fontSize: 12, color: "#7f1d1d", margin: "0 0 8px" }}>
          The following issues must be resolved before this event can go live. Each blocking participant must fix their calendar setup, or be removed from the event.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#7f1d1d" }}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    );
  }

  if (degraded) {
    return (
      <div style={{
        borderRadius: 10, border: "1px solid #fcd34d",
        background: "#fffbeb", padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 4 }}>
          Publishable — degraded
        </div>
        <p style={{ fontSize: 12, color: "#78350f", margin: 0 }}>
          All participants meet the minimum requirements to publish, but one or more calendars are operating with limited capability. Bookings will likely succeed, but event creation or sync may be unreliable for degraded participants. Consider asking them to reconnect their calendar.
        </p>
      </div>
    );
  }

  // Fully publishable, no issues
  return (
    <div style={{
      borderRadius: 10, border: "1px solid var(--sage, #86efac)",
      background: "#f0fdf4", padding: "12px 14px", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>✓</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>All participants ready</div>
        <div style={{ fontSize: 12, color: "#14532d" }}>
          {isPublished
            ? "This event is live and fully operational."
            : "This event is ready to publish. All participants have availability, an active calendar, and writeback enabled."}
        </div>
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export function CollectiveReadinessSection({ eventTypeId }: Props) {
  const queryClient = useQueryClient();

  const etQuery = useQuery({
    queryKey: ["eventType", eventTypeId],
    queryFn: () => api.getEventType(eventTypeId),
    retry: 1,
  });

  const readinessQuery = useQuery({
    queryKey: ["publishReadiness", eventTypeId],
    queryFn: () => api.getPublishReadiness(eventTypeId),
    retry: 1,
    // Refresh every 30s so status reflects calendar-sync events
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const eventType = etQuery.data;
  const readiness = readinessQuery.data;
  const isPublished = eventType?.published ?? false;
  const isDegraded = eventType?.degraded ?? false;

  // ── Derived partition of participants by tier ─────────────────────────────
  const participants = readiness?.participants ?? [];
  const ready     = participants.filter(p => getTier(p.readinessStatus) === "ready");
  const degraded  = participants.filter(p => getTier(p.readinessStatus) === "degraded");
  const blocking  = participants.filter(p => getTier(p.readinessStatus) === "blocking");
  const inactive  = participants.filter(p => getTier(p.readinessStatus) === "inactive");

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["publishReadiness", eventTypeId] });
    queryClient.invalidateQueries({ queryKey: ["eventType", eventTypeId] });
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (etQuery.isLoading || readinessQuery.isLoading) {
    return (
      <div className="dash-section">
        <div style={{ display: "grid", gap: 12 }}>
          <Skeleton variant="block" className="h-6 w-48" />
          <Skeleton variant="block" className="h-20" />
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (etQuery.error || !eventType) {
    return (
      <div className="dash-section">
        <div className="dash-alert error">Event type not found.</div>
        <Link to="/dashboard/event-types" className="dash-btn-secondary" style={{ marginTop: 12, display: "inline-block" }}>
          ← Back
        </Link>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dash-section">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
        <Link to="/dashboard/event-types" style={{ color: "var(--plum-500)", textDecoration: "none" }}>Event types</Link>
        <span style={{ color: "var(--plum-300)" }}>›</span>
        <Link to={`/dashboard/event-types/${eventTypeId}`} style={{ color: "var(--plum-500)", textDecoration: "none" }}>{eventType.name}</Link>
        <span style={{ color: "var(--plum-300)" }}>›</span>
        <span style={{ color: "var(--plum-700)" }}>Readiness</span>
      </div>

      {/* Header card */}
      <div className="panel">
        <div className="h">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Readiness Dashboard</h2>
              <PublishedStateBadge published={isPublished} degraded={isDegraded} />
            </div>
            <div className="sub">{eventType.name}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="dash-btn-secondary"
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={handleRefresh}
              disabled={readinessQuery.isFetching}
            >
              {readinessQuery.isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <Link to={`/dashboard/event-types/${eventTypeId}`} className="dash-btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }}>
              ← Back to event
            </Link>
          </div>
        </div>

        {readiness && (
          <div style={{ marginTop: 14 }}>
            {/* Summary numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
              <StatTile n={readiness.totalParticipants} label="Participants" color="var(--plum-700)" />
              <StatTile n={ready.length} label="Ready" color="#166534" bg="#f0fdf4" border="var(--sage, #86efac)" />
              <StatTile n={degraded.length} label="Degraded" color="#92400e" bg="#fffbeb" border="#fcd34d" />
              <StatTile n={blocking.length + inactive.length} label="Blocking" color="#991b1b" bg="#fff7f7" border="#fca5a5" />
            </div>

            {/* Progress bar */}
            <ProgressBar
              ready={ready.length}
              degraded={degraded.length}
              total={readiness.totalParticipants}
            />
            <div style={{ fontSize: 11, color: "var(--plum-400)", marginTop: 4 }}>
              <span style={{ color: "#166534" }}>■</span> Ready&nbsp;
              <span style={{ color: "#f59e0b" }}>■</span> Degraded&nbsp;
              <span style={{ color: "#e5e7eb" }}>■</span> Blocking / Inactive
            </div>
          </div>
        )}
      </div>

      {/* Publish gate summary */}
      {readiness && (
        <div style={{ marginTop: 16 }}>
          <ReadinessGate readiness={readiness} isPublished={isPublished} />
        </div>
      )}

      {/* Blocking participants (errors first) */}
      {blocking.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#991b1b", marginBottom: 8 }}>
            Blocking ({blocking.length}) — must fix before publishing
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {blocking.map(p => <ParticipantCard key={p.userId} p={p} />)}
          </div>
        </div>
      )}

      {/* Degraded participants (warnings) */}
      {degraded.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#92400e", marginBottom: 8 }}>
            Degraded ({degraded.length}) — publishable, reduced capability
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {degraded.map(p => <ParticipantCard key={p.userId} p={p} />)}
          </div>
        </div>
      )}

      {/* Ready participants */}
      {ready.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#166534", marginBottom: 8 }}>
            Ready ({ready.length})
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {ready.map(p => <ParticipantCard key={p.userId} p={p} />)}
          </div>
        </div>
      )}

      {/* Inactive / revoked */}
      {inactive.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: 8 }}>
            Inactive / removed ({inactive.length}) — excluded from scheduling
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {inactive.map(p => <ParticipantCard key={p.userId} p={p} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!readiness || readiness.totalParticipants === 0 ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="dash-empty" style={{ padding: "12px 0" }}>
            <h3>No participants</h3>
            <p>Add participants to this event to see their readiness here.</p>
            <Link to={`/dashboard/event-types/${eventTypeId}/participants`} className="dash-btn-primary" style={{ marginTop: 12, display: "inline-block" }}>
              Manage participants →
            </Link>
          </div>
        </div>
      ) : null}

      {/* Action footer */}
      <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to={`/dashboard/event-types/${eventTypeId}/participants`} className="dash-btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
          Manage participants
        </Link>
        <Link to={`/dashboard/event-types/${eventTypeId}`} className="dash-btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
          Publish controls
        </Link>
      </div>
    </div>
  );
}

function StatTile({ n, label, color, bg, border }: { n: number; label: string; color: string; bg?: string; border?: string }) {
  return (
    <div style={{
      textAlign: "center", padding: "10px 4px", borderRadius: 8,
      border: `1px solid ${border ?? "var(--border, #e5e5e5)"}`,
      background: bg ?? "var(--surface)",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div>
      <div style={{ fontSize: 10, color: "var(--plum-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
    </div>
  );
}
