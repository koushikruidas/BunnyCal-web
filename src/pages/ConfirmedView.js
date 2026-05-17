import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { getLifecycleState } from "@/lib/meetingActions";
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
    return (_jsxs(Card, { padding: "lg", className: "bk-confirmed-card", children: [_jsxs("div", { className: "bk-confirmed-top", children: [_jsx("div", { className: "bk-confirmed-icon", children: "\u2713" }), _jsxs("div", { children: [_jsx("h2", { className: "bk-confirmed-title", children: "You're booked." }), _jsxs("p", { className: "bk-confirmed-sub", children: ["We sent a confirmation to ", _jsx("strong", { className: "text-fg", children: ctx.details.email }), " with the ", ctx.eventInfo?.location, " link and calendar invite."] })] })] }), _jsx("div", { className: "bk-confirmed-grid", children: _jsxs("div", { className: "bk-confirmed-panel bk-confirmed-panel-full", children: [_jsx(Row, { k: "Booking ID", v: ctx.hold.bookingId }), _jsx(Row, { k: "Meeting", v: ctx.eventInfo?.name ?? "Meeting" }), _jsx(Row, { k: "When", v: longLabel }), _jsx(Row, { k: "Time", v: `${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min` }), _jsx(Row, { k: "Timezone", v: getBrowserTimeZone() }), _jsx(Row, { k: "With", v: ctx.eventInfo?.hostName ?? "" }), _jsx("div", { className: "pt-2.5 mt-1 border-t border-dashed border-[rgba(31,21,48,0.12)]", children: _jsx(Row, { k: "Status", v: "CONFIRMED", goodVariant: true }) })] }) }), _jsxs("div", { className: "bk-confirmed-actions", children: [manageLink && _jsx(Link, { to: manageLink, className: "bk-confirmed-btn bk-confirmed-btn-primary", children: "Manage booking" }), _jsx(Button, { variant: "ghost", className: "bk-confirmed-btn", onClick: onReschedule, disabled: Boolean(actionPending), children: actionPending === "reschedule" ? "Rescheduling..." : "Reschedule" }), _jsx(Button, { variant: "ghost", className: "bk-confirmed-btn", onClick: onCancel, disabled: Boolean(actionPending), children: actionPending === "cancel" ? "Cancelling..." : "Cancel" }), _jsx(Button, { variant: "ghost", className: "bk-confirmed-btn", onClick: () => send({ type: "RESET" }), disabled: Boolean(actionPending), children: "Book another" })] }), manageLink && (_jsxs("div", { className: "bk-confirmed-link", children: [_jsx("div", { className: "text-caption uppercase tracking-widest text-fg-faint", children: "Manage later" }), _jsxs("p", { className: "mt-1 text-body-sm text-fg-dim break-all", children: [appOrigin, manageLink] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => navigator.clipboard.writeText(`${appOrigin}${manageLink}`), className: "focus-ring min-h-touch rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-1.5 text-[12.5px] text-fg hover:bg-white/[.08]", children: "Copy manage link" }), _jsx("span", { className: "text-caption text-fg-faint self-center", children: "Bookmark this page. A manage link is also sent to your email." })] })] })), message && _jsx("div", { className: "text-caption text-fg-faint", role: "status", "aria-live": "polite", children: message }), _jsxs("div", { className: "flex items-center gap-1.5 pt-2 mt-2 border-t border-white/[.08]", children: [_jsx(BunnyMark, { size: 13, color: "#6b7280" }), _jsx(BrandWordmark, { className: "text-[10px] tracking-[.06em]", style: { fontFamily: "var(--mono)" } })] })] }));
}
function Row({ k, v, goodVariant }) {
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: k }), _jsx("span", { className: (goodVariant ? "text-accent-mint" : "text-fg") + " text-right", children: v })] }));
}
