import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useBooking } from "@/state/BookingContext";
export function ConfirmedView() {
    const { ctx, send } = useBooking();
    if (!ctx.selectedSlot || !ctx.hold)
        return null;
    const start = new Date(ctx.selectedSlot.start);
    const longLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return (_jsxs(Card, { padding: "lg", className: "text-center flex flex-col items-center gap-4", children: [_jsx("div", { className: "pop w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-mint to-accent-sky grid place-items-center text-[#0f4d35] text-[32px] font-bold", children: "\u2713" }), _jsx("h2", { className: "text-[26px] font-semibold tracking-tight m-0", children: "You're booked." }), _jsxs("p", { className: "text-[14px] text-fg-dim max-w-[420px] leading-snug", children: ["We sent a confirmation to ", _jsx("strong", { className: "text-fg", children: ctx.details.email }), " with the ", ctx.eventInfo?.location, " link and a calendar invite."] }), _jsxs("div", { className: "w-full max-w-[460px] border border-white/[.08] rounded-[14px] p-4 bg-panel2 flex flex-col gap-2.5 text-left", children: [_jsx(Row, { k: "Booking ID", v: ctx.hold.bookingId }), _jsx(Row, { k: "When", v: longLabel }), _jsx(Row, { k: "Time", v: `${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min` }), _jsx(Row, { k: "With", v: ctx.eventInfo?.hostName ?? "" }), _jsx("div", { className: "pt-2.5 mt-1 border-t border-dashed border-white/[.08]", children: _jsx(Row, { k: "Status", v: "CONFIRMED", goodVariant: true }) })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap justify-center mt-1", children: [_jsx(Button, { variant: "ghost", children: "Add to Google Calendar" }), _jsx(Button, { variant: "ghost", children: "Reschedule" }), _jsx(Button, { variant: "ghost", onClick: () => send({ type: "RESET" }), children: "Book another" })] }), _jsxs("div", { className: "text-[12px] text-fg-faint flex items-center gap-2 mt-2", children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", children: [_jsx("path", { d: "M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" }), _jsx("path", { d: "M9 12l2 2 4-4" })] }), "Slot was locked end-to-end. No double booking. Ever."] })] }));
}
function Row({ k, v, goodVariant }) {
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-[13px]", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-[11px]", children: k }), _jsx("span", { className: (goodVariant ? "text-accent-mint" : "text-fg") + " text-right", children: v })] }));
}
