import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import type { HostKind } from "@/services/bookingResolver";
import { getLifecycleState } from "@/lib/meetingActions";
import { formatMeetingDateTime, formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
import { opsLogger } from "@/lib/opsLogger";

export function ConfirmedView({ hostKind = "authenticated-host" }: { hostKind?: HostKind }) {
  const { ctx, send } = useBooking();
  const { cancel, reschedule } = useBookingActions(hostKind);
  const [message, setMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"cancel" | "reschedule" | null>(null);
  const lifecycleLoggedRef = useRef<Set<string>>(new Set());

  if (!ctx.selectedSlot || !ctx.hold) return null;
  const longLabel = formatMeetingDateTime(ctx.selectedSlot.start);
  const timeLabel = formatMeetingTimeOnly(ctx.selectedSlot.start);

  const onCancel = async () => {
    if (actionPending) return;
    setActionPending("cancel");
    await cancel();
    setMessage("Booking cancelled.");
    setActionPending(null);
  };

  const onReschedule = async () => {
    if (actionPending) return;
    setActionPending("reschedule");
    const ok = await reschedule();
    setMessage(ok ? "Reschedule request submitted." : "Unable to reschedule right now.");
    setActionPending(null);
  };

  const confirmation = ctx.confirmation;
  const manageToken = confirmation?.manageToken?.trim() || "";
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const confirmedBookingId = confirmation?.bookingId || ctx.hold?.bookingId || "";
  const manageLink = confirmedBookingId && manageToken && ctx.username && ctx.eventTypeSlug
    ? `/manage/${confirmedBookingId}?token=${encodeURIComponent(manageToken)}&u=${encodeURIComponent(ctx.username)}&e=${encodeURIComponent(ctx.eventTypeSlug)}`
    : "";
  if (import.meta.env.DEV && confirmation?.bookingId && ctx.hold?.bookingId && confirmation.bookingId !== ctx.hold.bookingId) {
    console.warn("[guest-manage] booking id mismatch between hold and confirmation", {
      holdBookingId: ctx.hold.bookingId,
      confirmationBookingId: confirmation.bookingId,
    });
  }
  const lifecycle = getLifecycleState({
    externalLifecycleState: confirmation?.externalLifecycleState,
    externalLifecycleReason: confirmation?.externalLifecycleReason,
    reconcileSuppressed: confirmation?.reconcileSuppressed,
    actionRequired: confirmation?.actionRequired,
  });

  useEffect(() => {
    if (!lifecycle || !confirmation?.bookingId) return;
    const key = `${confirmation.bookingId}:${lifecycle.kind}:confirmed-view`;
    if (lifecycleLoggedRef.current.has(key)) return;
    lifecycleLoggedRef.current.add(key);
    opsLogger.warn({
      category: lifecycle.kind === "PROVIDER_DISCONNECTED" ? "provider_disconnect_lifecycle_visible" : "external_lifecycle_rendered",
      message: "External lifecycle state rendered in confirmed booking view",
      details: { view: "confirmed-view", state: lifecycle.kind, bookingStatus: confirmation.status },
    });
    if (lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && confirmation.status !== "CANCELLED") {
      opsLogger.warn({
        category: "lifecycle_mismatch_rendered",
        message: "External lifecycle mismatch rendered in confirmed booking view",
        details: { view: "confirmed-view", state: lifecycle.kind, bookingStatus: confirmation.status },
      });
    }
  }, [confirmation?.bookingId, confirmation?.status, lifecycle]);

  return (
    <Card padding="lg" className="bk-confirmed-card">
      <div className="bk-confirmed-top">
        <div className="bk-confirmed-icon">✓</div>
        <div>
          <h2 className="bk-confirmed-title">You're booked.</h2>
          <p className="bk-confirmed-sub">
        We sent a confirmation to <strong className="text-fg">{ctx.details.email}</strong>{ctx.eventInfo?.location ? <> with the {ctx.eventInfo.location} link and calendar invite</> : <> with the calendar invite</>}.
          </p>
        </div>
      </div>

      <div className="bk-confirmed-grid">
        <div className="bk-confirmed-panel bk-confirmed-panel-full">
        <Row k="Booking ID" v={ctx.hold.bookingId} />
        <Row k="Meeting" v={ctx.eventInfo?.name ?? "Meeting"} />
        <Row k="When" v={longLabel} />
        <Row k="Time" v={`${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min`} />
        <Row k="Timezone" v={getBrowserTimeZone()} />
        <Row k="With" v={ctx.eventInfo?.hostName ?? ""} />
        <ConferenceLinkRow conferenceUrl={confirmation?.conferenceUrl} status={confirmation?.status} />
          <div className="pt-2.5 mt-1 border-t border-dashed border-[rgba(31,21,48,0.12)]"><Row k="Status" v="CONFIRMED" goodVariant /></div>
        </div>
      </div>

      <div className="bk-confirmed-actions">
        {manageLink && <Link to={manageLink} className="bk-confirmed-btn bk-confirmed-btn-primary">Manage booking</Link>}
        <Button variant="ghost" className="bk-confirmed-btn" onClick={onReschedule} disabled={Boolean(actionPending)}>{actionPending === "reschedule" ? "Rescheduling..." : "Reschedule"}</Button>
        <Button variant="ghost" className="bk-confirmed-btn" onClick={onCancel} disabled={Boolean(actionPending)}>{actionPending === "cancel" ? "Cancelling..." : "Cancel"}</Button>
        <Button variant="ghost" className="bk-confirmed-btn" onClick={() => send({ type: "RESET" })} disabled={Boolean(actionPending)}>Book another</Button>
      </div>

      {manageLink && (
        <div className="bk-confirmed-link">
          <div className="text-caption uppercase tracking-widest text-fg-faint">Manage later</div>
          <p className="mt-1 text-body-sm text-fg-dim break-all">{appOrigin}{manageLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(`${appOrigin}${manageLink}`)}
              className="focus-ring min-h-touch rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]"
            >
              Copy manage link
            </button>
            <span className="text-caption text-fg-faint self-center">Bookmark this page. A manage link is also sent to your email.</span>
          </div>
        </div>
      )}

      {message && <div className="text-caption text-fg-faint" role="status" aria-live="polite">{message}</div>}

      {/* BunnyCal brand foot */}
      <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-white/[.08]">
        <BunnyMark size={13} color="#6b7280" />
        <BrandWordmark className="text-[10px] tracking-[.06em]" style={{ fontFamily: "var(--mono)" }} />
      </div>
    </Card>
  );
}

function Row({ k, v, goodVariant }: { k: string; v: string; goodVariant?: boolean }) {
  return (
    <div className="flex justify-between gap-3.5 font-mono text-body-sm">
      <span className="text-fg-faint uppercase tracking-widest text-eyebrow">{k}</span>
      <span className={(goodVariant ? "text-accent-mint" : "text-fg") + " text-right"}>{v}</span>
    </div>
  );
}

function ConferenceLinkRow({ conferenceUrl, status }: { conferenceUrl?: string | null; status?: string | null }) {
  const url = (conferenceUrl ?? "").trim();
  if (url) {
    return (
      <div className="flex justify-between gap-3.5 font-mono text-body-sm">
        <span className="text-fg-faint uppercase tracking-widest text-eyebrow">Meeting link</span>
        <a href={url} target="_blank" rel="noreferrer" className="text-right text-fg underline break-all">
          {url}
        </a>
      </div>
    );
  }
  // Booking is confirmed but the conferencing provider has not provisioned a link yet.
  const showPending = (status ?? "").toUpperCase() !== "CANCELLED";
  if (!showPending) return null;
  return (
    <div className="flex justify-between gap-3.5 font-mono text-body-sm">
      <span className="text-fg-faint uppercase tracking-widest text-eyebrow">Meeting link</span>
      <span className="text-right text-fg-dim" aria-live="polite">Preparing meeting link…</span>
    </div>
  );
}
