import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HoldRing } from "@/components/HoldRing";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useCountdown } from "@/hooks/useCountdown";
import { useBookingActions } from "@/hooks/useBookingActions";
import { formatMeetingDateTime } from "@/lib/dateTime";
const HOLD_TOTAL = 5 * 60;
export function HeldView({ onBack, hostKind = "authenticated-host" }) {
    const { ctx, send } = useBooking();
    const { confirm } = useBookingActions(hostKind);
    const { remaining, formatted } = useCountdown(ctx.hold?.expiresAt ?? null, () => send({ type: "EXPIRE" }));
    if (!ctx.selectedSlot || !ctx.hold)
        return null;
    const whenLabel = formatMeetingDateTime(ctx.selectedSlot.start);
    return (_jsx(Card, { className: "bk-held-card", children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5 p-3.5 rounded-[14px] border border-warning-border bg-gradient-to-br from-warning-surface to-accent-peach/[.10]", children: [_jsx(HoldRing, { remaining: remaining, total: HOLD_TOTAL }), _jsxs("div", { className: "flex-1", "aria-live": "polite", children: [_jsxs("strong", { className: "block text-body-sm font-medium", children: ["Reserved for you \u2014 ", formatted] }), _jsx("span", { className: "text-caption text-fg-dim", children: "We'll hold this slot exclusively while you finish. No one else can grab it." })] })] }), ctx.error && _jsx(ErrorBanner, { code: ctx.error.code, message: ctx.error.message, onDismiss: () => send({ type: "ERROR_CLEARED" }) }), _jsxs("div", { className: "rounded-[14px] border border-white/[.08] bg-panel2 p-4 flex flex-col gap-2.5", children: [_jsx(ReceiptRow, { k: "When", v: whenLabel }), _jsx(ReceiptRow, { k: "Duration", v: `${ctx.eventInfo?.duration ?? 30} min` }), _jsx(ReceiptRow, { k: "With", v: ctx.eventInfo?.hostName ?? "" }), _jsx(ReceiptRow, { k: "Where", v: ctx.eventInfo?.location ?? "" }), _jsx(ReceiptRow, { k: "Booking ID", v: ctx.hold.bookingId, breakValue: true }), _jsx("div", { className: "pt-2.5 mt-1 border-t border-dashed border-white/[.08]", children: _jsx(ReceiptRow, { k: "Status", v: "HELD \u00B7 expires soon", highlight: "warn" }) })] }), _jsx("div", { className: "text-body-sm text-fg-dim leading-relaxed", children: "On confirm, we re-verify against the host's live calendar. If anything changed in the last few seconds we'll let you pick a new slot \u2014 your spot is never lost mid-flight." }), _jsxs("div", { className: "flex items-center justify-end gap-2.5", children: [_jsx(Button, { variant: "ghost", onClick: onBack, disabled: ctx.loading, children: "Back" }), _jsx(Button, { disabled: ctx.loading || remaining === 0, onClick: confirm, children: ctx.loading ? "Verifying…" : "Confirm booking" })] })] }) }));
}
function ReceiptRow({ k, v, highlight, breakValue = false }) {
    const color = highlight === "warn" ? "text-accent-butter" : highlight === "good" ? "text-accent-mint" : "text-fg";
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: k }), _jsx("span", { className: color + (breakValue ? " text-right break-all" : " text-right"), children: v })] }));
}
