import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import type { EventTypeParticipantResponse, ParticipantReadinessStatus, RoundRobinStatsResponse, TeamMemberResponse } from "@/services/types";
import { Button } from "@/ui/controls";
import clsx from "@/lib/clsx";

type Kind = "ONE_ON_ONE" | "GROUP" | "ROUND_ROBIN" | "COLLECTIVE" | string;

interface Props {
  eventTypeId: string;
  kind: Kind;
}

const MULTI_HOST_KINDS = new Set(["ROUND_ROBIN", "COLLECTIVE"]);

function participantsQueryKey(eventTypeId: string) {
  return ["event-type-participants", eventTypeId] as const;
}

/** Aggregate selectable users across every team the current user belongs to. */
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

export function EventTypeParticipantsEditor({ eventTypeId, kind }: Props) {
  const queryClient = useQueryClient();
  const isMultiHost = MULTI_HOST_KINDS.has(String(kind).toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const participantsQuery = useQuery({
    queryKey: participantsQueryKey(eventTypeId),
    queryFn: () => api.listEventTypeParticipants(eventTypeId),
    staleTime: 30_000,
    retry: false,
  });

  const poolQuery = useSelectablePool();
  const participants = participantsQuery.data ?? [];

  // Working ordered list of selected user ids (initialized from server state).
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? participants.map((p) => p.userId);

  const poolById = useMemo(() => {
    const map = new Map<string, TeamMemberResponse>();
    (poolQuery.data ?? []).forEach((m) => map.set(m.userId, m));
    return map;
  }, [poolQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (userIds: string[]) => api.replaceEventTypeParticipants(eventTypeId, userIds),
    onSuccess: (result) => {
      setError(null);
      setDraft(null);
      queryClient.setQueryData(participantsQueryKey(eventTypeId), result);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to save participants."),
  });

  if (!isMultiHost) {
    // ONE_ON_ONE / GROUP: locked to owner — show read-only single host.
    const owner = participants.find((p) => p.isOwner) ?? participants[0] ?? null;
    return (
      <div style={{ marginTop: 10 }}>
        <div className="sub" style={{ marginBottom: 6 }}>Host</div>
        {participantsQuery.isPending ? (
          <div className="dash-skel" style={{ height: 40 }} />
        ) : owner ? (
          <ParticipantChip participant={owner} locked />
        ) : (
          <div className="sub">Single host (you).</div>
        )}
      </div>
    );
  }

  const toggle = (userId: string) => {
    setDraft((prev) => {
      const base = prev ?? participants.map((p) => p.userId);
      return base.includes(userId) ? base.filter((id) => id !== userId) : [...base, userId];
    });
  };

  const move = (userId: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const base = [...(prev ?? participants.map((p) => p.userId))];
      const idx = base.indexOf(userId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= base.length) return base;
      [base[idx], base[next]] = [base[next], base[idx]];
      return base;
    });
  };

  const dirty = draft !== null;
  const canSave = dirty && selected.length >= 1 && !saveMutation.isPending;

  const isRoundRobin = String(kind).toUpperCase() === "ROUND_ROBIN";

  const rrStatsQuery = useQuery({
    queryKey: ["rr-stats", eventTypeId],
    queryFn: () => api.getRrStats(eventTypeId),
    staleTime: 60_000,
    retry: false,
    enabled: isRoundRobin,
  });

  return (
    <div style={{ marginTop: 10 }}>
      {isRoundRobin && rrStatsQuery.data && (
        <RRHealthPanel stats={rrStatsQuery.data} />
      )}
      <div className="sub" style={{ marginBottom: 6 }}>
        Participants ({selected.length}) · {isRoundRobin ? "a slot is offered when any one participant is free — bookings rotate to whoever was least recently assigned" : "a slot is offered only when all participants are simultaneously free"}
      </div>
      {isRoundRobin && selected.length === 0 && poolQuery.isSuccess && (poolQuery.data ?? []).length > 0 && (
        <div className="dash-alert" style={{ marginBottom: 8, background: "var(--lilac-soft, #f0edff)", border: "1px solid var(--lilac, #c4b5fd)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          Add at least one participant. BunnyCal will rotate bookings to whoever was least recently assigned and is currently free.
        </div>
      )}

      {error && <div className="dash-alert error" style={{ marginBottom: 8 }}>{error}</div>}

      {/* Selected, ordered */}
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {selected.length === 0 && <div className="sub">No participants selected yet. Choose team members from the list below.</div>}
        {selected.map((userId, idx) => {
          const member = poolById.get(userId);
          const serverRow = participants.find((p) => p.userId === userId);
          const assignmentStat = rrStatsQuery.data?.assignmentDistribution.find((s) => s.userId === userId);
          return (
            <div key={userId} className="override-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="count" style={{ minWidth: 22, textAlign: "center" }}>{idx + 1}</span>
                <div>
                  <div className="date">{member?.userName ?? serverRow?.userName ?? userId}</div>
                  <div className="detail" style={{ display: "flex", gap: 8 }}>
                    <span>{member?.userEmail ?? serverRow?.userEmail ?? ""}</span>
                    {assignmentStat && assignmentStat.bookingCount > 0 && (
                      <span style={{ color: "var(--plum-400)" }}>
                        {assignmentStat.bookingCount} assignments
                        {assignmentStat.lastAssignedAt && <span> · last {formatRelativeTime(assignmentStat.lastAssignedAt)}</span>}
                      </span>
                    )}
                  </div>
                </div>
                {serverRow?.readinessStatus && <ReadinessBadge status={serverRow.readinessStatus} />}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button className="dash-btn-secondary" style={{ fontSize: 12, padding: "2px 8px" }} disabled={idx === 0} onClick={() => move(userId, -1)} aria-label="Move up">↑</button>
                <button className="dash-btn-secondary" style={{ fontSize: 12, padding: "2px 8px" }} disabled={idx === selected.length - 1} onClick={() => move(userId, 1)} aria-label="Move down">↓</button>
                <button style={{ fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer" }} onClick={() => toggle(userId)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pool to add from */}
      <div className="sub" style={{ marginBottom: 6 }}>Add from your teams</div>
      {poolQuery.isPending ? (
        <div className="dash-skel" style={{ height: 40 }} />
      ) : (poolQuery.data ?? []).length === 0 ? (
        <div style={{ padding: "10px 0" }}>
          <div className="sub" style={{ marginBottom: 4 }}>No team members yet.</div>
          <div className="sub">Go to <strong>Teams</strong> in the sidebar, create a team, and invite members. Once they accept, they&apos;ll appear here as participants you can add to this event.</div>
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
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {dirty && (
          <Button variant="secondary" size="sm" onClick={() => { setDraft(null); setError(null); }}>
            Reset
          </Button>
        )}
        <Button size="sm" disabled={!canSave} loading={saveMutation.isPending} onClick={() => saveMutation.mutate(selected)}>
          Save participants
        </Button>
      </div>
    </div>
  );
}

function ReadinessBadge({ status }: { status: ParticipantReadinessStatus }) {
  const config: Record<ParticipantReadinessStatus, { label: string; variant: "ok" | "warn" | "err" | "muted"; title: string }> = {
    READY:           { label: "Ready",          variant: "ok",   title: "Availability configured, active calendar connected, writeback enabled." },
    NO_AVAILABILITY: { label: "No schedule",    variant: "err",  title: "No availability rules configured. This participant contributes no open slots." },
    NO_CALENDAR:     { label: "No calendar",    variant: "err",  title: "No active calendar connection. Booking events cannot be written." },
    NO_WRITEBACK:    { label: "Read-only",       variant: "err",  title: "Calendar connected but lacks write access. Booking events won't appear on their calendar." },
    INACTIVE:        { label: "Inactive",        variant: "err",  title: "User account is inactive. Excluded from scheduling." },
    REVOKED:         { label: "Revoked",         variant: "err",  title: "User was deleted or not found. Excluded from scheduling." },
    NOT_SCHEDULABLE: { label: "Not schedulable", variant: "err",  title: "Participant is ineligible for scheduling." },
  };
  const { label, variant, title } = config[status] ?? config.NOT_SCHEDULABLE;
  return (
    <span className={clsx("dbadge", variant)} title={title}>
      <span className="dot" />
      {label}
    </span>
  );
}

function RRHealthPanel({ stats }: { stats: RoundRobinStatsResponse }) {
  const { totalParticipants, ready, needsSetup, assignmentDistribution } = stats;
  const hasAssignments = assignmentDistribution.some((s) => s.bookingCount > 0);

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--plum-600)", marginBottom: 10 }}>Round Robin health</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--ivory)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--plum-700)" }}>{totalParticipants}</div>
          <div style={{ fontSize: 10, color: "var(--plum-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Participants</div>
        </div>
        <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, border: `1px solid ${ready > 0 ? "var(--sage)" : "var(--border)"}`, background: ready > 0 ? "#f0fdf4" : "var(--ivory)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: ready > 0 ? "#166534" : "var(--plum-400)" }}>{ready}</div>
          <div style={{ fontSize: 10, color: "var(--plum-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ready</div>
        </div>
        <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, border: `1px solid ${needsSetup > 0 ? "#fbbf24" : "var(--border)"}`, background: needsSetup > 0 ? "#fffbeb" : "var(--ivory)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: needsSetup > 0 ? "#92400e" : "var(--plum-400)" }}>{needsSetup}</div>
          <div style={{ fontSize: 10, color: "var(--plum-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Needs setup</div>
        </div>
      </div>

      {hasAssignments && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--plum-400)", marginBottom: 6 }}>Assignment distribution</div>
          <div style={{ display: "grid", gap: 4 }}>
            {assignmentDistribution
              .filter((s) => s.bookingCount > 0)
              .sort((a, b) => b.bookingCount - a.bookingCount)
              .map((s) => {
                const lastAgo = s.lastAssignedAt
                  ? formatRelativeTime(s.lastAssignedAt)
                  : null;
                return (
                  <div key={s.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                    <span style={{ color: "var(--plum-600)" }}>{s.userName ?? s.userEmail ?? s.userId}</span>
                    <span style={{ color: "var(--plum-400)" }}>
                      {s.bookingCount} assignment{s.bookingCount === 1 ? "" : "s"}
                      {lastAgo && <span> · last {lastAgo}</span>}
                    </span>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

function ParticipantChip({ participant, locked }: { participant: EventTypeParticipantResponse; locked?: boolean }) {
  return (
    <div className="override-row">
      <div>
        <div className="date">{participant.userName ?? participant.userEmail}</div>
        <div className="detail">{participant.userEmail}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {participant.readinessStatus && <ReadinessBadge status={participant.readinessStatus} />}
        <span className={clsx("dbadge", "ok")}>
          <span className="dot" />
          {locked ? "Owner · locked" : "Owner"}
        </span>
      </div>
    </div>
  );
}
