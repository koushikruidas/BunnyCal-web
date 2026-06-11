import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import type { EventTypeSummaryResponse, PublishReadinessResponse, EventTypeParticipantResponse } from "@/services/types";
import { PublishedStateBadge } from "@/features/collective/PublishedStateBadge";
import { getEventTypeDisplayName } from "@/features/event-types/eventTypeCatalog";
import { Button } from "@/ui/controls/Button";
import { Dialog } from "@/ui/controls/Dialog";
import { Skeleton } from "@/ui/controls/Skeleton";
import clsx from "@/lib/clsx";

interface Props {
  eventTypeId: string;
}

function readinessVariant(status: string): "ok" | "warn" | "err" | "muted" {
  switch (status) {
    case "READY": return "ok";
    case "DEGRADED_CALENDAR": return "warn";
    case "INACTIVE":
    case "REVOKED":
    case "NOT_SCHEDULABLE": return "muted";
    default: return "err";
  }
}

function readinessLabel(status: string): string {
  switch (status) {
    case "READY": return "Ready";
    case "NO_AVAILABILITY": return "No schedule";
    case "NO_CALENDAR": return "No calendar";
    case "NO_WRITEBACK": return "Read-only";
    case "DEGRADED_CALENDAR": return "Degraded";
    case "INACTIVE": return "Inactive";
    case "REVOKED": return "Revoked";
    case "NOT_SCHEDULABLE": return "Not schedulable";
    default: return status;
  }
}

function ParticipantRow({ p }: { p: EventTypeParticipantResponse }) {
  const variant = readinessVariant(p.readinessStatus);
  return (
    <div className="et-participant-row">
      <div className="et-participant-avatar">
        {p.userProfileImageUrl ? (
          <img src={p.userProfileImageUrl} alt="" className="et-participant-img" />
        ) : (
          <span className="et-participant-initial">
            {(p.userName ?? p.userEmail ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="et-participant-info">
        <span className="et-participant-name">{p.userName ?? p.userEmail ?? "Unknown"}</span>
        {p.userEmail && p.userName && <span className="et-participant-email">{p.userEmail}</span>}
        {p.isOwner && <span className="et-participant-owner">Owner</span>}
      </div>
      <div className="et-participant-status">
        <span className={clsx("dbadge", variant)}>{readinessLabel(p.readinessStatus)}</span>
        {p.readinessMessage && (
          <span className="et-participant-msg">{p.readinessMessage}</span>
        )}
      </div>
    </div>
  );
}

function ReadinessSummary({ readiness }: { readiness: PublishReadinessResponse }) {
  const { publishable, degraded, readyCount, totalParticipants, reasons, participants } = readiness;

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="h">
        <div>
          <h3>Readiness</h3>
          <div className="sub">
            {readyCount} of {totalParticipants} participants ready
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {publishable ? (
            <span className="dbadge ok">Publishable</span>
          ) : (
            <span className="dbadge err">Not publishable</span>
          )}
          {degraded && <span className="dbadge warn">Degraded</span>}
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="dash-alert" style={{ marginBottom: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {participants.map((p) => (
          <ParticipantRow key={p.userId} p={p} />
        ))}
        {participants.length === 0 && (
          <div className="dash-empty" style={{ padding: "8px 0" }}>
            <p>No participants configured. Add participants to enable collective scheduling.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function EventTypeDetailSection({ eventTypeId }: Props) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  const { data: eventType, isLoading: etLoading, error: etError } = useQuery({
    queryKey: ["eventType", eventTypeId],
    queryFn: () => api.getEventType(eventTypeId),
    retry: 1,
  });

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ["publishReadiness", eventTypeId],
    queryFn: () => api.getPublishReadiness(eventTypeId),
    enabled: !!eventType && String(eventType.kind ?? "").toUpperCase() === "COLLECTIVE",
    retry: 1,
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishEventType(eventTypeId),
    onSuccess: (data) => {
      setPublishDialogOpen(false);
      queryClient.setQueryData(["publishReadiness", eventTypeId], data);
      queryClient.setQueryData(["eventType", eventTypeId], (prev: EventTypeSummaryResponse | undefined) =>
        prev ? { ...prev, published: data.published, degraded: data.degraded } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      setActionError(null);
    },
    onError: (e: Error) => {
      setPublishDialogOpen(false);
      setActionError(e.message ?? "Failed to publish.");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishEventType(eventTypeId),
    onSuccess: (data) => {
      setUnpublishDialogOpen(false);
      queryClient.setQueryData(["publishReadiness", eventTypeId], data);
      queryClient.setQueryData(["eventType", eventTypeId], (prev: EventTypeSummaryResponse | undefined) =>
        prev ? { ...prev, published: data.published, degraded: data.degraded } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      setActionError(null);
    },
    onError: (e: Error) => {
      setUnpublishDialogOpen(false);
      setActionError(e.message ?? "Failed to unpublish.");
    },
  });

  const isCollective = String(eventType?.kind ?? "").toUpperCase() === "COLLECTIVE";
  const isPublished = eventType?.published ?? false;
  const isDegraded = eventType?.degraded ?? false;
  const canPublish = readiness?.publishable ?? false;
  const isMutating = publishMutation.isPending || unpublishMutation.isPending;
  // Live + no longer publishable: participants were removed/degraded after publish
  const isLiveUnpublishable = isPublished && !!readiness && !readiness.publishable;

  if (etLoading) {
    return (
      <div className="dash-section">
        <div style={{ display: "grid", gap: 12 }}>
          <Skeleton variant="block" className="h-8 w-48" />
          <Skeleton variant="block" className="h-5 w-64" />
          <Skeleton variant="block" className="h-40" />
        </div>
      </div>
    );
  }

  if (etError || !eventType) {
    return (
      <div className="dash-section">
        <div className="dash-alert error">
          {etError instanceof Error ? etError.message : "Event type not found."}
        </div>
        <Link to="/dashboard/event-types" className="dash-btn-secondary" style={{ marginTop: 12, display: "inline-block" }}>
          ← Back to event types
        </Link>
      </div>
    );
  }

  return (
    <div className="dash-section">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Link to="/dashboard/event-types" style={{ fontSize: 13, color: "var(--plum-500)", textDecoration: "none" }}>
          ← Event types
        </Link>
      </div>

      <div className="panel">
        <div className="h">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="et-kind-badge">{getEventTypeDisplayName(eventType.kind ?? "ONE_ON_ONE")}</span>
              {isCollective && (
                <PublishedStateBadge published={isPublished} degraded={isDegraded} />
              )}
            </div>
            <h2 style={{ margin: 0 }}>{eventType.name}</h2>
            <div className="sub">/{eventType.slug}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href={eventType.link}
              target="_blank"
              rel="noreferrer"
              className="dash-btn-secondary"
              style={{ fontSize: 12, padding: "5px 12px" }}
            >
              Open booking page ↗
            </a>
            {isCollective && (
              <>
                {isPublished ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUnpublishDialogOpen(true)}
                    disabled={isMutating}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPublishDialogOpen(true)}
                    disabled={isMutating || readinessLoading || !canPublish}
                    title={
                      readinessLoading
                        ? "Checking readiness…"
                        : !canPublish
                        ? "Resolve readiness issues before publishing"
                        : undefined
                    }
                  >
                    {readinessLoading ? "Checking…" : "Publish"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div className="dash-alert error" style={{ marginTop: 8 }}>{actionError}</div>
        )}

        {isCollective && !isPublished && !canPublish && readiness && (
          <div className="dash-alert" style={{ marginTop: 8, fontSize: 13 }}>
            Resolve the readiness issues below before publishing.
          </div>
        )}
        {isCollective && isDegraded && isPublished && (
          <div className="dash-alert" style={{ marginTop: 8, fontSize: 13, background: "var(--warning-surface, #fffbeb)", borderColor: "var(--warning-border, #fcd34d)", color: "var(--warning-fg, #92400e)" }}>
            This event type is live but degraded — some participants have reduced calendar capability. Bookings may still succeed.
          </div>
        )}
        {isCollective && isLiveUnpublishable && (
          <div className="dash-alert error" style={{ marginTop: 8, fontSize: 13 }}>
            This event is live but no longer meets publish requirements — participants were changed after publishing. Guests can still book existing slots. Fix the issues below or unpublish to take it offline.
          </div>
        )}

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "auto auto auto", gap: 16, width: "fit-content" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--plum-500)", marginBottom: 2 }}>Kind</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{getEventTypeDisplayName(eventType.kind ?? "ONE_ON_ONE")}</div>
          </div>
          {eventType.conference && (
            <div>
              <div style={{ fontSize: 11, color: "var(--plum-500)", marginBottom: 2 }}>Conferencing</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{eventType.conference.enabled ? eventType.conference.provider : "None"}</div>
            </div>
          )}
        </div>
      </div>

      {isCollective && (
        <div style={{ marginTop: 12 }}>
          <div className="panel">
            <div className="h">
              <div>
                <h3>Meeting Participants</h3>
                <div className="sub">Every booking will include all participants.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  to={`/dashboard/event-types/${eventTypeId}/readiness`}
                  className="dash-btn-secondary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  View readiness
                </Link>
                <Link
                  to={`/dashboard/event-types/${eventTypeId}/participants`}
                  className="dash-btn-secondary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  Manage participants
                </Link>
              </div>
            </div>
          </div>

          {readinessLoading ? (
            <div className="panel" style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gap: 8 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="block" className="h-14" />
                ))}
              </div>
            </div>
          ) : readiness ? (
            <ReadinessSummary readiness={readiness} />
          ) : null}
        </div>
      )}

      <Dialog
        open={publishDialogOpen}
        onClose={() => !publishMutation.isPending && setPublishDialogOpen(false)}
        dismissible={!publishMutation.isPending}
        title="Publish this event?"
        description={
          isDegraded
            ? "This event will go live but is in a degraded state — some participants have limited calendar capability. Bookings may still succeed. You can unpublish at any time."
            : "This event will go live and your booking link will become accessible to guests. You can unpublish at any time."
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </Button>
          </>
        }
      />

      <Dialog
        open={unpublishDialogOpen}
        onClose={() => !unpublishMutation.isPending && setUnpublishDialogOpen(false)}
        dismissible={!unpublishMutation.isPending}
        title="Unpublish this event?"
        description="Your booking page will go offline. Guests won't be able to book new appointments. Existing bookings are not affected. You can republish at any time."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUnpublishDialogOpen(false)}
              disabled={unpublishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending ? "Unpublishing…" : "Confirm unpublish"}
            </Button>
          </>
        }
      />
    </div>
  );
}
