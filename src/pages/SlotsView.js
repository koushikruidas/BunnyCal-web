import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SlotButton } from "@/components/SlotButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useAvailability } from "@/hooks/useAvailability";
import { formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
import { opsLogger } from "@/lib/opsLogger";
import { EmptyState, Skeleton } from "@/ui/controls";
function parseDateKeyToLocalDate(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    if (!y || !m || !d)
        return new Date(dateKey);
    return new Date(y, m - 1, d);
}
export function SlotsView({ onContinue, today, hostKind = "authenticated-host" }) {
    const { ctx, send } = useBooking();
    const date = ctx.selectedDate ? parseDateKeyToLocalDate(ctx.selectedDate) : today;
    const { data, loading, error, refresh } = useAvailability(ctx.username, ctx.eventTypeSlug, ctx.selectedDate, hostKind);
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
    const syncInProgress = data?.status === "CALENDAR_SYNC_IN_PROGRESS";
    const staleCalendar = data?.status === "STALE_CALENDAR_DATA";
    const calendarDisconnected = data?.status === "CALENDAR_NOT_CONNECTED";
    const explicitNoSlots = data?.status === "NO_SLOTS_AVAILABLE";
    const providerOptionalMode = data?.degraded === true &&
        data?.status === "CALENDAR_NOT_CONNECTED" &&
        anyAvailable;
    const degradedMode = data?.degraded === true;
    const bestSlotId = availableSlots[0]?.slotId;
    const hasSelectedValidSlot = !!ctx.selectedSlot &&
        availableSlots.some((s) => s.slotId === ctx.selectedSlot?.slotId || s.start === ctx.selectedSlot?.start);
    const canContinue = !loading && !error && hasSelectedValidSlot;
    const groupedSlots = (() => {
        const morning = [];
        const afternoon = [];
        for (const slot of slots) {
            const hour = new Date(slot.start).getHours();
            if (hour < 12)
                morning.push(slot);
            else
                afternoon.push(slot);
        }
        return [
            { id: "morning", label: "Morning · 9 am – 12 pm", items: morning },
            { id: "afternoon", label: "Afternoon · 1 pm – 5 pm", items: afternoon },
        ].filter((group) => group.items.length > 0);
    })();
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
    if (data?.status && !["CALENDAR_NOT_CONNECTED", "CALENDAR_SYNC_IN_PROGRESS", "STALE_CALENDAR_DATA", "NO_SLOTS_AVAILABLE", "AVAILABLE"].includes(data.status)) {
        opsLogger.warn({
            category: "sync_render_anomaly",
            message: "Unknown slot status rendered",
            details: { status: data.status },
        });
    }
    return (_jsxs("section", { className: "bk-slots", "aria-labelledby": "slot-selection-title", children: [_jsx(Card, { className: "bk-panel bk-cal-panel", children: _jsx(CalendarGrid, { selected: date, today: today, onSelect: setDate }) }), _jsxs(Card, { className: "bk-panel bk-slot-panel", children: [_jsxs("div", { className: "bk-slot-head", children: [_jsxs("div", { children: [_jsx("h2", { id: "slot-selection-title", className: "bk-slot-day", children: longLabel }), _jsxs("div", { className: "bk-slot-sub", children: [_jsxs("span", { children: [availableSlots.length, " times available"] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [ctx.eventInfo?.duration ?? 30, "-min meeting"] })] })] }), _jsx("button", { onClick: refresh, className: "bk-refresh-btn", children: "refresh" })] }), providerOptionalMode && (_jsx("div", { className: "mb-3 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-body-sm text-warning-fg", children: "Calendar sync not connected. Availability is based on internal scheduling only." })), degradedMode && (_jsx("div", { className: "mb-3 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-body-sm text-warning-fg", children: "Availability may be temporarily stale while calendar updates are still processing." })), error && (_jsxs("div", { className: "mb-3", children: [_jsx(ErrorBanner, { code: "SLOTS_UNAVAILABLE", message: "Unable to load available times right now. Please retry." }), _jsx("div", { className: "mt-2", children: _jsx("button", { onClick: refresh, className: "focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary", children: "Retry loading times" }) })] })), loading ? (_jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 12 }).map((_, i) => (_jsx(Skeleton, { variant: "block", className: "h-11 rounded-[10px]", ariaLabel: "Loading available time" }, i))) })) : !error && syncInProgress && !anyAvailable ? (_jsx(EmptyState, { title: "Calendar sync in progress", description: "We are still generating times. This view refreshes automatically." })) : !error && staleCalendar && !anyAvailable ? (_jsx(EmptyState, { title: "Calendar data is temporarily stale", description: "Please retry shortly or choose another date." })) : !error && calendarDisconnected && !anyAvailable ? (_jsx(EmptyState, { title: "Calendar not connected", description: "No slots available right now for this date." })) : !error && (explicitNoSlots || !anyAvailable) ? (_jsx(EmptyState, { title: "No times available on this day", description: "Try another date to continue." })) : !error ? (_jsx("div", { className: "bk-slot-groups max-h-[460px] overflow-y-auto pr-1", children: groupedSlots.map((group) => (_jsxs("section", { className: "bk-slot-group", children: [_jsx("div", { className: "bk-slot-group-label", children: group.label }), _jsx("div", { className: "bk-slots-grid", children: group.items.map((s) => (_jsxs("div", { className: "relative", children: [s.slotId === bestSlotId && (_jsx("span", { className: "absolute -top-2 right-3 z-10 px-1.5 py-0.5 rounded-full bg-accent-mint text-[10px] font-mono text-[#114e38] uppercase tracking-wider", children: "Best" })), _jsx("div", { className: "bk-slot-btn", children: _jsx(SlotButton, { slot: s, selected: ctx.selectedSlot?.slotId === s.slotId, onClick: selectSlot }) })] }, s.slotId))) })] }, group.id))) })) : null, _jsxs("div", { className: "bk-slot-foot", children: [_jsxs("div", { className: "bk-slot-foot-note", children: ["Timezone \u00B7 ", _jsx("strong", { children: getBrowserTimeZone() })] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [!hasSelectedValidSlot && !loading && !error && (_jsx("p", { className: "text-xs text-fg-faint", children: "Select a time slot to continue." })), _jsxs(Button, { disabled: !canContinue, onClick: onContinue, children: ["Continue", " ", hasSelectedValidSlot && ctx.selectedSlot && (_jsxs("span", { className: "font-mono ml-1.5 opacity-70", children: ["\u2192 ", formatMeetingTimeOnly(ctx.selectedSlot.start)] }))] })] })] })] })] }));
}
