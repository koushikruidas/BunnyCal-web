import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SlotButton } from "@/components/SlotButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useAvailability } from "@/hooks/useAvailability";
import type { SlotDto } from "@/services/types";
import { formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
import { opsLogger } from "@/lib/opsLogger";
import { EmptyState, Skeleton, Badge } from "@/ui/controls";

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
  const syncInProgress = data?.status === "CALENDAR_SYNC_IN_PROGRESS";
  const staleCalendar = data?.status === "STALE_CALENDAR_DATA";
  const calendarDisconnected = data?.status === "CALENDAR_NOT_CONNECTED";
  const explicitNoSlots = data?.status === "NO_SLOTS_AVAILABLE";
  const providerOptionalMode =
    data?.degraded === true &&
    data?.status === "CALENDAR_NOT_CONNECTED" &&
    anyAvailable;
  const degradedMode = data?.degraded === true;
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
  if (data?.status && !["CALENDAR_NOT_CONNECTED", "CALENDAR_SYNC_IN_PROGRESS", "STALE_CALENDAR_DATA", "NO_SLOTS_AVAILABLE", "AVAILABLE"].includes(data.status)) {
    opsLogger.warn({
      category: "sync_render_anomaly",
      message: "Unknown slot status rendered",
      details: { status: data.status },
    });
  }

  return (
    <section className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(260px,360px)_1fr]" aria-labelledby="slot-selection-title">
      <Card>
        <CalendarGrid selected={date} today={today} onSelect={setDate} />
      </Card>
      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="slot-selection-title" className="text-[15px] font-medium tracking-tight text-fg">{longLabel}</h2>
            <div className="mt-1 inline-flex items-center gap-2">
              <Badge tone="neutral" size="sm">Timezone</Badge>
              <span className="font-mono text-[11.5px] text-fg-faint">{getBrowserTimeZone()}</span>
            </div>
          </div>
          <button onClick={refresh} className="focus-ring min-h-touch rounded-lg px-3 font-mono text-[11px] uppercase tracking-wider text-fg-faint hover:text-fg">
            refresh
          </button>
        </div>

        {providerOptionalMode && (
          <div className="mb-3 rounded-xl border border-[#f59e0b]/35 bg-[#fff7ed] px-3 py-2 text-sm text-[#92400e]">
            Calendar sync not connected. Availability is based on internal scheduling only.
          </div>
        )}
        {degradedMode && (
          <div className="mb-3 rounded-xl border border-[#f59e0b]/35 bg-[#fff7ed] px-3 py-2 text-sm text-[#92400e]">
            Availability may be temporarily stale while calendar updates are still processing.
          </div>
        )}

        {error && (
          <div className="mb-3">
            <ErrorBanner code="SLOTS_UNAVAILABLE" message="Unable to load available times right now. Please retry." />
            <div className="mt-2">
              <button onClick={refresh} className="focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs text-text-primary">Retry loading times</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} variant="block" className="h-11 rounded-[10px]" ariaLabel="Loading available time" />
            ))}
          </div>
        ) : !error && syncInProgress && !anyAvailable ? (
          <EmptyState
            title="Calendar sync in progress"
            description="We are still generating times. This view refreshes automatically."
          />
        ) : !error && staleCalendar && !anyAvailable ? (
          <EmptyState
            title="Calendar data is temporarily stale"
            description="Please retry shortly or choose another date."
          />
        ) : !error && calendarDisconnected && !anyAvailable ? (
          <EmptyState
            title="Calendar not connected"
            description="No slots available right now for this date."
          />
        ) : !error && (explicitNoSlots || !anyAvailable) ? (
          <EmptyState
            title="No times available on this day"
            description="Try another date to continue."
          />
        ) : !error ? (
          <div className="grid max-h-[440px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => (
              <div key={s.slotId} className="relative">
                {s.slotId === bestSlotId && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded-full bg-accent-mint text-[10px] font-mono text-[#114e38] uppercase tracking-wider">
                    Best
                  </span>
                )}
                <SlotButton slot={s} selected={ctx.selectedSlot?.slotId === s.slotId} onClick={selectSlot} />
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
    </section>
  );
}
