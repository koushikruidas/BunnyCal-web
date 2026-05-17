import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { buildInvitationActions, getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { formatMeetingDateTime, formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
import { opsLogger } from "@/lib/opsLogger";
export function ConfirmedView({ hostKind = "authenticated-host" }) {
    const { ctx, send } = useBooking();
    const { cancel, reschedule } = useBookingActions(hostKind);
    const [message, setMessage] = useState(null);
    const [actionPending, setActionPending] = useState(null);
    const lifecycleLoggedRef = useRef(new Set());
    if (!ctx.selectedSlot || !ctx.hold)
        return null;
    const longLabel = formatMeetingDateTime(ctx.selectedSlot.start);
    const timeLabel = formatMeetingTimeOnly(ctx.selectedSlot.start);
    const onCancel = async () => {
        if (actionPending)
            return;
        setActionPending("cancel");
        await cancel();
        setMessage("Booking cancelled.");
        setActionPending(null);
    };
    const onReschedule = async () => {
        if (actionPending)
            return;
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
        if (!lifecycle || !confirmation?.bookingId)
            return;
        const key = `${confirmation.bookingId}:${lifecycle.kind}:confirmed-view`;
        if (lifecycleLoggedRef.current.has(key))
            return;
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
    return (_jsxs(Card, { padding: "lg", className: "text-center flex flex-col items-center gap-5", children: [_jsx("div", { className: "pop w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-mint to-accent-sky grid place-items-center text-[#0f4d35] text-display font-bold", children: "\u2713" }), _jsx("h2", { className: "text-h1 font-semibold m-0", children: "You're booked." }), _jsxs("p", { className: "text-body text-fg-dim max-w-[440px] leading-snug", children: ["We sent a confirmation to ", _jsx("strong", { className: "text-fg", children: ctx.details.email }), " with the ", ctx.eventInfo?.location, " link and calendar invite."] }), _jsxs("div", { className: "w-full max-w-[460px] border border-white/[.08] rounded-[14px] p-4 bg-panel2 flex flex-col gap-2.5 text-left", children: [_jsx(Row, { k: "Booking ID", v: ctx.hold.bookingId }), _jsx(Row, { k: "Meeting", v: ctx.eventInfo?.name ?? "Meeting" }), _jsx(Row, { k: "When", v: longLabel }), _jsx(Row, { k: "Time", v: `${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min` }), _jsx(Row, { k: "Timezone", v: getBrowserTimeZone() }), _jsx(Row, { k: "With", v: ctx.eventInfo?.hostName ?? "" }), _jsx("div", { className: "pt-2.5 mt-1 border-t border-dashed border-white/[.08]", children: _jsx(Row, { k: "Status", v: "CONFIRMED", goodVariant: true }) })] }), _jsxs("div", { className: "w-full max-w-[460px] rounded-[14px] border border-white/[.08] p-4 bg-panel2 text-left", children: [_jsx("div", { className: "text-caption uppercase tracking-widest text-fg-faint", children: "Invitation" }), _jsx("div", { className: "mt-1 text-body text-fg", children: sync.label }), _jsx("div", { className: "text-body-sm text-fg-dim mt-1", children: sync.detail }), lifecycle && (_jsx("div", { className: "mt-2 text-body-sm text-fg-dim", children: lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && confirmation?.status !== "CANCELLED"
                            ? "External event removed; booking status update may still be processing."
                            : lifecycle.detail })), actions.length > 0 ? (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: actions.map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "focus-ring inline-flex min-h-touch items-center rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]", children: action.label }, action.id))) })) : (_jsx("div", { className: "mt-3 text-body-sm text-fg-dim", children: "We are generating your invitation and conferencing details. You can also check your confirmation email shortly." }))] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap justify-center mt-1", children: [manageLink && _jsx(Link, { to: manageLink, className: "focus-ring inline-flex min-h-touch items-center rounded-[12px] text-[14px] font-medium tracking-tight transition border border-white/[.16] px-4 py-3 text-fg-dim hover:text-fg", children: "Manage booking" }), _jsx(Button, { variant: "ghost", onClick: onReschedule, disabled: Boolean(actionPending), children: actionPending === "reschedule" ? "Rescheduling..." : "Reschedule" }), _jsx(Button, { variant: "ghost", onClick: onCancel, disabled: Boolean(actionPending), children: actionPending === "cancel" ? "Cancelling..." : "Cancel" }), _jsx(Button, { variant: "ghost", onClick: () => send({ type: "RESET" }), disabled: Boolean(actionPending), children: "Book another" })] }), manageLink && (_jsxs("div", { className: "w-full max-w-[460px] rounded-[14px] border border-white/[.08] p-4 bg-panel2 text-left", children: [_jsx("div", { className: "text-caption uppercase tracking-widest text-fg-faint", children: "Manage later" }), _jsxs("p", { className: "mt-1 text-body-sm text-fg-dim break-all", children: [appOrigin, manageLink] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => navigator.clipboard.writeText(`${appOrigin}${manageLink}`), className: "focus-ring min-h-touch rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]", children: "Copy manage link" }), _jsx("span", { className: "text-caption text-fg-faint self-center", children: "Bookmark this page. A manage link is also sent to your email." })] })] })), message && _jsx("div", { className: "text-caption text-fg-faint", role: "status", "aria-live": "polite", children: message })] }));
}
function Row({ k, v, goodVariant }) {
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: k }), _jsx("span", { className: (goodVariant ? "text-accent-mint" : "text-fg") + " text-right", children: v })] }));
}
