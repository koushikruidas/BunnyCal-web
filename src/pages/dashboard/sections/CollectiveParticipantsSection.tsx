import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import type { EventTypeParticipantResponse, ParticipantReadinessStatus, TeamMemberResponse } from "@/services/types";
import { PublishedStateBadge } from "@/features/collective/PublishedStateBadge";
import { Button } from "@/ui/controls/Button";
import { Skeleton } from "@/ui/controls/Skeleton";
import clsx from "@/lib/clsx";

interface Props {
  eventTypeId: string;
}

function readinessMeta(status: ParticipantReadinessStatus): { label: string; variant: "ok" | "warn" | "err" | "muted"; title: string } {
  const map: Record<ParticipantReadinessStatus, { label: string; variant: "ok" | "warn" | "err" | "muted"; title: string }> = {
    READY:             { label: "Ready",           variant: "ok",   title: "Availability configured, active calendar connected, writeback enabled." },
    NO_AVAILABILITY:   { label: "No schedule",     variant: "err",  title: "No availability rules configured. This participant contributes no open slots." },
    NO_CALENDAR:       { label: "No calendar",     variant: "err",  title: "No active calendar connection. Booking events cannot be written." },
    NO_WRITEBACK:      { label: "Read-only",        variant: "err",  title: "Calendar connected but lacks write access." },
    DEGRADED_CALENDAR: { label: "Degraded",         variant: "warn", title: "Calendar has limited capability. Bookings may still work." },
    INACTIVE:          { label: "Inactive",         variant: "muted", title: "User account is inactive. Excluded from scheduling." },
    REVOKED:           { label: "Revoked",          variant: "muted", title: "User was removed. Excluded from scheduling." },
    NOT_SCHEDULABLE:   { label: "Not schedulable",  variant: "muted", title: "Participant is ineligible for scheduling." },
  };
  return map[status] ?? map.NOT_SCHEDULABLE;
}

function useSelectablePool() {
  return useQuery({
    queryKey: ["selectable-participant-pool"],
    queryFn: async () => {
      const teams = await api.listTeams();
      const memberLists = await Promise.all(teams.map((t) => api.listTeamMembers(t.id)));
      const byUser = new Map<string, TeamMemberResponse>();
      memberLists.flat().forEach((m) => {
        if (!byUser.has(m.userId)) byUser.set(m.userId, m);
      });
      return Array.from(byUser.values());
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function CollectiveParticipantsSection({ eventTypeId }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const etQuery = useQuery({
    queryKey: ["eventType", eventTypeId],
    queryFn: () => api.getEventType(eventTypeId),
    retry: 1,
  });

  const participantsQuery = useQuery({
    queryKey: ["event-type-participants", eventTypeId],
    queryFn: () => api.listEventTypeParticipants(eventTypeId),
    staleTime: 30_000,
    retry: false,
  });

  const readinessQuery = useQuery({
    queryKey: ["publishReadiness", eventTypeId],
    queryFn: () => api.getPublishReadiness(eventTypeId),
    retry: 1,
  });

  const poolQuery = useSelectablePool();

  const participants: EventTypeParticipantResponse[] = participantsQuery.data ?? [];
  const selected = draft ?? participants.map((p) => p.userId);

  const poolById = useMemo(() => {
    const map = new Map<string, TeamMemberResponse>();
    (poolQuery.data ?? []).forEach((m) => map.set(m.userId, m));
    return map;
  }, [poolQuery.data]);

  const toggle = (userId: string) => {
    setDraft((prev) => {
      const base = prev ?? participants.map((p) => p.userId);
      return base.includes(userId) ? base.filter((id) => id !== userId) : [...base, userId];
    });
  };

  const saveMutation = useMutation({
    mutationFn: (userIds: string[]) => api.replaceEventTypeParticipants(eventTypeId, userIds),
    onSuccess: (result) => {
      setSaveError(null);
      setDraft(null);
      queryClient.setQueryData(["event-type-participants", eventTypeId], result);
      // Invalidate readiness and event type summary — roster change affects both.
      queryClient.invalidateQueries({ queryKey: ["publishReadiness", eventTypeId] });
      queryClient.invalidateQueries({ queryKey: ["eventType", eventTypeId] });
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
    },
    onError: (e) => setSaveError(e instanceof ApiError ? e.message : "Unable to save participants."),
  });

  const dirty = draft !== null;
  const canSave = dirty && selected.length >= 1 && !saveMutation.isPending;
  const eventType = etQuery.data;
  const isPublished = eventType?.published ?? false;
  const isDegraded = eventType?.degraded ?? false;

  if (etQuery.isLoading) {
    return (
      <div className="dash-section">
        <div style={{ display: "grid", gap: 12 }}>
          <Skeleton variant="block" className="h-6 w-48" />
          <Skeleton variant="block" className="h-40" />
        </div>
      </div>
    );
  }

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

  const readiness = readinessQuery.data;
  const allReady = !!readiness && readiness.readyCount === readiness.totalParticipants && readiness.totalParticipants > 0;

  return (
    <div className="dash-section">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
        <Link to="/dashboard/event-types" style={{ color: "var(--plum-500)", textDecoration: "none" }}>Event types</Link>
        <span style={{ color: "var(--plum-300)" }}>›</span>
        <Link to={`/dashboard/event-types/${eventTypeId}`} style={{ color: "var(--plum-500)", textDecoration: "none" }}>{eventType.name}</Link>
        <span style={{ color: "var(--plum-300)" }}>›</span>
        <span style={{ color: "var(--plum-700)" }}>Participants</span>
      </div>

      <div className="panel">
        <div className="h">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Participants</h2>
              <PublishedStateBadge published={isPublished} degraded={isDegraded} />
            </div>
            <div className="sub">{eventType.name} · Collective</div>
          </div>
          <Link to={`/dashboard/event-types/${eventTypeId}`} className="dash-btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }}>
            ← Back to event
          </Link>
        </div>

        <p style={{ fontSize: 13, color: "var(--plum-600)", margin: "4px 0 0" }}>
          Collective events offer a slot only when <strong>all participants are simultaneously free</strong>. Every person listed here must have availability rules, an active calendar, and writeback capability.
        </p>
      </div>

      {/* Readiness summary strip */}
      {readiness && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          border: `1px solid ${allReady ? "var(--sage, #86efac)" : "var(--border, #e5e5e5)"}`,
          background: allReady ? "#f0fdf4" : "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 600, color: allReady ? "#166534" : "var(--plum-600)" }}>
            {readiness.readyCount} / {readiness.totalParticipants} ready
          </span>
          {!readiness.publishable && (
            <span style={{ color: "#991b1b" }}>
              · Fix issues before publishing
            </span>
          )}
          {readiness.degraded && readiness.publishable && (
            <span style={{ color: "#92400e" }}>
              · Degraded calendar — bookings may still succeed
            </span>
          )}
        </div>
      )}

      {/* Selected participants */}
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="h" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Selected ({selected.length})</h3>
            <div className="sub">These people will co-host this event.</div>
          </div>
        </div>

        {participantsQuery.isPending ? (
          <div style={{ display: "grid", gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="block" className="h-14" />)}
          </div>
        ) : selected.length === 0 ? (
          <div className="dash-empty" style={{ padding: "8px 0" }}>
            <p>No participants selected. Add team members from below.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {selected.map((userId) => {
              const member = poolById.get(userId);
              const serverRow = participants.find((p) => p.userId === userId);
              const displayName = member?.userName ?? serverRow?.userName ?? userId;
              const email = member?.userEmail ?? serverRow?.userEmail ?? "";
              const status = serverRow?.readinessStatus;
              const message = serverRow?.readinessMessage;
              const meta = status ? readinessMeta(status) : null;
              const isOwner = serverRow?.isOwner ?? false;

              return (
                <div key={userId} className="override-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div className="et-participant-initial" style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--blush-soft, #fce7f3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "var(--plum-600)",
                      flexShrink: 0,
                    }}>
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{displayName}</div>
                      {email && <div style={{ fontSize: 12, color: "var(--plum-400)" }}>{email}</div>}
                    </div>
                    {isOwner && <span className="dbadge ok" style={{ flexShrink: 0 }}>Owner</span>}
                    {meta && (
                      <span className={clsx("dbadge", meta.variant)} title={meta.title} style={{ flexShrink: 0 }}>
                        <span className="dot" />{meta.label}
                      </span>
                    )}
                    {message && (
                      <span style={{ fontSize: 11, color: "var(--plum-400)", flexShrink: 0 }}>{message}</span>
                    )}
                  </div>
                  {!isOwner && (
                    <button
                      style={{ fontSize: 13, color: "#991b1b", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                      onClick={() => toggle(userId)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pool — add from teams */}
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="h" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Add from your teams</h3>
            <div className="sub">Members appear here once they accept your team invitation.</div>
          </div>
        </div>

        {poolQuery.isPending ? (
          <Skeleton variant="block" className="h-10" />
        ) : (poolQuery.data ?? []).length === 0 ? (
          <div className="sub" style={{ padding: "8px 0" }}>
            No team members yet.{" "}
            <Link to="/dashboard/teams" style={{ color: "var(--plum-500)" }}>
              Go to Teams →
            </Link>{" "}
            to create a team and invite members.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(poolQuery.data ?? []).map((member) => {
              const isSelected = selected.includes(member.userId);
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => toggle(member.userId)}
                  className={clsx("dbadge", isSelected && "ok")}
                  style={{ cursor: "pointer", border: "1px solid var(--border, #e5e5e5)" }}
                >
                  <span className="dot" />
                  {member.userName ?? member.userEmail}
                  {isSelected && <span style={{ marginLeft: 2 }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save / reset */}
      {saveError && <div className="dash-alert error" style={{ marginTop: 10 }}>{saveError}</div>}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {dirty && (
          <Button variant="secondary" size="sm" onClick={() => { setDraft(null); setSaveError(null); }}>
            Reset
          </Button>
        )}
        <Button
          size="sm"
          disabled={!canSave}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate(selected)}
        >
          Save participants
        </Button>
      </div>

      {isPublished && dirty && (
        <div className="dash-alert" style={{ marginTop: 10, fontSize: 12 }}>
          Saving changes to a live event will re-evaluate readiness. If the new roster is not publishable, the event will remain live but flagged as no longer meeting publish requirements.
        </div>
      )}
    </div>
  );
}
