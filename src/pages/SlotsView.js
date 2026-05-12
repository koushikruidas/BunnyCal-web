import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SlotButton } from "@/components/SlotButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useAvailability } from "@/hooks/useAvailability";
import { formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
function parseDateKeyToLocalDate(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    if (!y || !m || !d)
        return new Date(dateKey);
    return new Date(y, m - 1, d);
}
export function SlotsView({ onContinue, today }) {
    const { ctx, send } = useBooking();
    const date = ctx.selectedDate ? parseDateKeyToLocalDate(ctx.selectedDate) : today;
    const { data, loading, error, refresh } = useAvailability(ctx.username, ctx.eventTypeSlug, ctx.selectedDate);
    const setDate = (d) => {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (import.meta.env.DEV) {
            console.debug("[booking] date selected", { date: k, username: ctx.username, eventTypeSlug: ctx.eventTypeSlug });
        }
        send({ type: "SELECT_DATE", date: k });
    };
    const selectSlot = (s) => {
        if (import.meta.env.DEV) {
            console.debug("[booking] slot clicked", {
                slotId: s.slotId,
                start: s.start,
                available: s.available,
                currentState: ctx.state,
            });
        }
        send({ type: "SELECT_SLOT", slot: s });
    };
    const longLabel = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: getBrowserTimeZone(),
    });
    const slots = data?.slots ?? [];
    const availableSlots = slots.filter((s) => s.available);
    const anyAvailable = availableSlots.length > 0;
    const syncInProgress = data?.status === "CALENDAR_SYNC_IN_PROGRESS" || data?.degraded;
    const bestSlotId = availableSlots[0]?.slotId;
    const hasSelectedValidSlot = !!ctx.selectedSlot &&
        availableSlots.some((s) => s.slotId === ctx.selectedSlot?.slotId || s.start === ctx.selectedSlot?.start);
    const canContinue = !loading && !error && hasSelectedValidSlot;
    if (import.meta.env.DEV) {
        console.debug("[booking] slot gate", {
            selectedDate: ctx.selectedDate,
            selectedSlotId: ctx.selectedSlot?.slotId ?? null,
            selectedSlotStart: ctx.selectedSlot?.start ?? null,
            availableCount: availableSlots.length,
            hasSelectedValidSlot,
            loading,
            hasError: !!error,
            canContinue,
        });
    }
    return (_jsxs("div", { className: "grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr]", children: [_jsx(Card, { children: _jsx(CalendarGrid, { selected: date, today: today, onSelect: setDate }) }), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[15px] font-medium tracking-tight", children: longLabel }), _jsxs("div", { className: "font-mono text-[11.5px] text-fg-faint", children: ["Times shown in ", getBrowserTimeZone()] })] }), _jsx("button", { onClick: refresh, className: "font-mono text-[11px] text-fg-faint hover:text-fg uppercase tracking-wider", children: "refresh" })] }), error && (_jsxs("div", { className: "mb-3", children: [_jsx(ErrorBanner, { code: "SLOTS_UNAVAILABLE", message: "Unable to load available times right now. Please retry." }), _jsx("div", { className: "mt-2", children: _jsx("button", { onClick: refresh, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-xs", children: "Retry loading times" }) })] })), loading ? (_jsx("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-2", children: Array.from({ length: 12 }).map((_, i) => (_jsx("div", { className: "h-11 rounded-[10px] bg-panel2 animate-pulse" }, i))) })) : !error && syncInProgress && !anyAvailable ? (_jsxs("div", { className: "text-center py-14 text-fg-faint", children: [_jsx("div", { className: "text-[32px] opacity-60 mb-2", children: "\u27F3" }), _jsx("div", { className: "text-[13.5px]", children: "Calendar sync in progress." }), _jsx("div", { className: "text-[12px] mt-1.5", children: "We are still generating times. This view refreshes automatically." })] })) : !error && !anyAvailable ? (_jsxs("div", { className: "text-center py-14 text-fg-faint", children: [_jsx("div", { className: "text-[32px] opacity-50 mb-2", children: "\u25CC" }), _jsx("div", { className: "text-[13.5px]", children: "No times available on this day." }), _jsx("div", { className: "text-[12px] mt-1.5", children: "Try another date to continue." })] })) : !error ? (_jsx("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto pr-1", children: slots.map((s) => (_jsxs("div", { className: "relative", children: [s.slotId === bestSlotId && (_jsx("span", { className: "absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded-full bg-accent-mint text-[10px] font-mono text-[#114e38] uppercase tracking-wider", children: "Best" })), _jsx("div", { className: "transition-transform duration-150 hover:scale-[1.03]", children: _jsx(SlotButton, { slot: s, selected: ctx.selectedSlot?.slotId === s.slotId, onClick: selectSlot }) })] }, s.slotId))) })) : null, _jsxs("div", { className: "mt-4 flex flex-col items-end gap-2", children: [!hasSelectedValidSlot && !loading && !error && (_jsx("p", { className: "text-xs text-fg-faint", children: "Select a time slot to continue." })), _jsxs(Button, { disabled: !canContinue, onClick: onContinue, children: ["Continue", " ", hasSelectedValidSlot && ctx.selectedSlot && (_jsxs("span", { className: "font-mono ml-1.5 opacity-70", children: ["\u2192 ", formatMeetingTimeOnly(ctx.selectedSlot.start)] }))] })] })] })] }));
}
