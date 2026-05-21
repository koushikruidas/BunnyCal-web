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
import { EmptyState, Skeleton } from "@/ui/controls";

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
  const groupedSlots = (() => {
    const morning: SlotDto[] = [];
    const afternoon: SlotDto[] = [];
    for (const slot of slots) {
      const hour = new Date(slot.start).getHours();
      if (hour < 12) morning.push(slot);
      else afternoon.push(slot);
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

  return (
    <section className="bk-slots" aria-labelledby="slot-selection-title">
      <Card className="bk-panel bk-cal-panel">
        <CalendarGrid selected={date} today={today} onSelect={setDate} />
      </Card>
      <Card className="bk-panel bk-slot-panel">
        <div className="bk-slot-head">
          <div>
            <h2 id="slot-selection-title" className="bk-slot-day">{longLabel}</h2>
            <div className="bk-slot-sub">
              <span>{availableSlots.length} times available</span>
              <span>·</span>
              <span>{ctx.eventInfo?.duration ?? 30}-min meeting</span>
            </div>
          </div>
          <button onClick={refresh} className="bk-refresh-btn">
            refresh
          </button>
        </div>

        {providerOptionalMode && (
          <div className="mb-3 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-body-sm text-warning-fg">
            Calendar sync not connected. Availability is based on internal scheduling only.
          </div>
        )}
        {degradedMode && (
          <div className="mb-3 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-body-sm text-warning-fg">
            Availability may be temporarily stale while calendar updates are still processing.
          </div>
        )}

        {error && (
          <div className="mb-3">
            <ErrorBanner code="SLOTS_UNAVAILABLE" message="Unable to load available times right now. Please retry." />
            <div className="mt-2">
              <button onClick={refresh} className="focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary">Retry loading times</button>
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
          <div className="bk-slot-groups max-h-[460px] overflow-y-auto pr-1">
            {groupedSlots.map((group) => (
              <section key={group.id} className="bk-slot-group">
                <div className="bk-slot-group-label">{group.label}</div>
                <div className="bk-slots-grid">
                  {group.items.map((s) => (
                    <div key={s.slotId} className="relative">
                      {s.slotId === bestSlotId && (
                        <span className="absolute -top-2 right-3 z-10 px-1.5 py-0.5 rounded-full bg-accent-mint text-[10px] font-mono text-[#114e38] uppercase tracking-wider">
                          Best
                        </span>
                      )}
                      <div className="bk-slot-btn">
                        <SlotButton slot={s} selected={ctx.selectedSlot?.slotId === s.slotId} onClick={selectSlot} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        <div className="bk-slot-foot">
          <div className="bk-slot-foot-note">
            Timezone · <strong>{getBrowserTimeZone()}</strong>
          </div>
          <div className="flex flex-col items-end gap-2">
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
        </div>
      </Card>
    </section>
  );
}
