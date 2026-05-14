import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import type { HostKind } from "@/services/bookingResolver";
import { buildInvitationActions, getLifecycleState, getSyncState } from "@/lib/meetingActions";
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
  const sync = getSyncState({
    provider: confirmation?.provider,
    calendarSyncStatus: confirmation?.calendarSyncStatus,
  });
  const actions = buildInvitationActions({
    provider: confirmation?.provider,
    providerEventUrl: confirmation?.providerEventUrl,
    conferenceUrl: confirmation?.conferenceUrl,
  });
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
    <Card padding="lg" className="text-center flex flex-col items-center gap-4">
      <div className="pop w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-mint to-accent-sky grid place-items-center text-[#0f4d35] text-[32px] font-bold">✓</div>
      <h2 className="text-[26px] font-semibold tracking-tight m-0">You're booked.</h2>
      <p className="text-[14px] text-fg-dim max-w-[420px] leading-snug">
        We sent a confirmation to <strong className="text-fg">{ctx.details.email}</strong> with the {ctx.eventInfo?.location} link and calendar invite.
      </p>

      <div className="w-full max-w-[460px] border border-white/[.08] rounded-[14px] p-4 bg-panel2 flex flex-col gap-2.5 text-left">
        <Row k="Booking ID" v={ctx.hold.bookingId} />
        <Row k="Meeting" v={ctx.eventInfo?.name ?? "Meeting"} />
        <Row k="When" v={longLabel} />
        <Row k="Time" v={`${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min`} />
        <Row k="Timezone" v={getBrowserTimeZone()} />
        <Row k="With" v={ctx.eventInfo?.hostName ?? ""} />
        <div className="pt-2.5 mt-1 border-t border-dashed border-white/[.08]"><Row k="Status" v="CONFIRMED" goodVariant /></div>
      </div>

      <div className="w-full max-w-[460px] rounded-[14px] border border-white/[.08] p-4 bg-panel2 text-left">
        <div className="text-[12px] uppercase tracking-widest text-fg-faint">Invitation</div>
        <div className="mt-1 text-[14px] text-fg">{sync.label}</div>
        <div className="text-[12.5px] text-fg-dim mt-1">{sync.detail}</div>
        {lifecycle && (
          <div className="mt-2 text-[12.5px] text-fg-dim">
            {lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && confirmation?.status !== "CANCELLED"
              ? "External event removed; booking status update may still be processing."
              : lifecycle.detail}
          </div>
        )}
        {actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]">
                {action.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-[12.5px] text-fg-dim">
            We are generating your invitation and conferencing details. You can also check your confirmation email shortly.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
        {manageLink && <Link to={manageLink} className="rounded-[12px] text-[14px] font-medium tracking-tight transition border border-white/[.16] px-4 py-3 text-fg-dim hover:text-fg">Manage booking</Link>}
        <Button variant="ghost" onClick={onReschedule} disabled={Boolean(actionPending)}>{actionPending === "reschedule" ? "Rescheduling..." : "Reschedule"}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={Boolean(actionPending)}>{actionPending === "cancel" ? "Cancelling..." : "Cancel"}</Button>
        <Button variant="ghost" onClick={() => send({ type: "RESET" })} disabled={Boolean(actionPending)}>Book another</Button>
      </div>

      {manageLink && (
        <div className="w-full max-w-[460px] rounded-[14px] border border-white/[.08] p-4 bg-panel2 text-left">
          <div className="text-[12px] uppercase tracking-widest text-fg-faint">Manage later</div>
          <p className="mt-1 text-[13px] text-fg-dim break-all">{appOrigin}{manageLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(`${appOrigin}${manageLink}`)}
              className="rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]"
            >
              Copy manage link
            </button>
            <span className="text-[12px] text-fg-faint self-center">Bookmark this page. A manage link is also sent to your email.</span>
          </div>
        </div>
      )}

      {message && <div className="text-[12px] text-fg-faint">{message}</div>}
    </Card>
  );
}

function Row({ k, v, goodVariant }: { k: string; v: string; goodVariant?: boolean }) {
  return (
    <div className="flex justify-between gap-3.5 font-mono text-[13px]">
      <span className="text-fg-faint uppercase tracking-widest text-[11px]">{k}</span>
      <span className={(goodVariant ? "text-accent-mint" : "text-fg") + " text-right"}>{v}</span>
    </div>
  );
}
