import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SlotButton } from "@/components/SlotButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useAvailability } from "@/hooks/useAvailability";
import type { SlotDto } from "@/services/types";
import { formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";

import type { HostKind } from "@/services/bookingResolver";

interface Props {
  onContinue: () => void;
  today: Date;
  hostKind?: HostKind;
}

function parseDateKeyToLocalDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return new Date(dateKey);
  return new Date(y, m - 1, d);
}

export function SlotsView({ onContinue, today, hostKind = "authenticated-host" }: Props) {
  const { ctx, send } = useBooking();
  const date = ctx.selectedDate ? parseDateKeyToLocalDate(ctx.selectedDate) : today;
  const { data, loading, error, refresh } = useAvailability(ctx.username, ctx.eventTypeSlug, ctx.selectedDate, hostKind);

  const setDate = (d: Date) => {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (import.meta.env.DEV) {
      console.debug("[booking] date selected", { date: k, username: ctx.username, eventTypeSlug: ctx.eventTypeSlug });
    }
    send({ type: "SELECT_DATE", date: k });
  };

  const selectSlot = (s: SlotDto) => {
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
  const providerOptionalMode =
    data?.degraded === true &&
    data?.status === "CALENDAR_NOT_CONNECTED" &&
    anyAvailable;
  const bestSlotId = availableSlots[0]?.slotId;
  const hasSelectedValidSlot =
    !!ctx.selectedSlot &&
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

  return (
    <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr]">
      <Card>
        <CalendarGrid selected={date} today={today} onSelect={setDate} />
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[15px] font-medium tracking-tight">{longLabel}</div>
            <div className="font-mono text-[11.5px] text-fg-faint">Times shown in {getBrowserTimeZone()}</div>
          </div>
          <button onClick={refresh} className="font-mono text-[11px] text-fg-faint hover:text-fg uppercase tracking-wider">
            refresh
          </button>
        </div>

        {providerOptionalMode && (
          <div className="mb-3 rounded-xl border border-[#f59e0b]/35 bg-[#fff7ed] px-3 py-2 text-sm text-[#92400e]">
            Calendar sync not connected. Availability is based on internal scheduling only.
          </div>
        )}

        {error && (
          <div className="mb-3">
            <ErrorBanner code="SLOTS_UNAVAILABLE" message="Unable to load available times right now. Please retry." />
            <div className="mt-2">
              <button onClick={refresh} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-xs">Retry loading times</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-11 rounded-[10px] bg-panel2 animate-pulse" />
            ))}
          </div>
        ) : !error && syncInProgress && !anyAvailable ? (
          <div className="text-center py-14 text-fg-faint">
            <div className="text-[32px] opacity-60 mb-2">⟳</div>
            <div className="text-[13.5px]">Calendar sync in progress.</div>
            <div className="text-[12px] mt-1.5">We are still generating times. This view refreshes automatically.</div>
          </div>
        ) : !error && !anyAvailable ? (
          <div className="text-center py-14 text-fg-faint">
            <div className="text-[32px] opacity-50 mb-2">◌</div>
            <div className="text-[13.5px]">No times available on this day.</div>
            <div className="text-[12px] mt-1.5">Try another date to continue.</div>
          </div>
        ) : !error ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto pr-1">
            {slots.map((s) => (
              <div key={s.slotId} className="relative">
                {s.slotId === bestSlotId && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded-full bg-accent-mint text-[10px] font-mono text-[#114e38] uppercase tracking-wider">
                    Best
                  </span>
                )}
                <div className="transition-transform duration-150 hover:scale-[1.03]">
                  <SlotButton slot={s} selected={ctx.selectedSlot?.slotId === s.slotId} onClick={selectSlot} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col items-end gap-2">
          {!hasSelectedValidSlot && !loading && !error && (
            <p className="text-xs text-fg-faint">Select a time slot to continue.</p>
          )}
          <Button disabled={!canContinue} onClick={onContinue}>
            Continue{" "}
            {hasSelectedValidSlot && ctx.selectedSlot && (
              <span className="font-mono ml-1.5 opacity-70">
                → {formatMeetingTimeOnly(ctx.selectedSlot.start)}
              </span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
