import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SlotButton } from "@/components/SlotButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useAvailability } from "@/hooks/useAvailability";
import type { SlotDto } from "@/services/types";

interface Props {
  onContinue: () => void;
  today: Date;
}

export function SlotsView({ onContinue, today }: Props) {
  const { ctx, send } = useBooking();
  const date = ctx.selectedDate ? new Date(ctx.selectedDate) : today;
  const { data, loading, error, refresh } = useAvailability(ctx.username, ctx.eventTypeSlug, ctx.selectedDate);

  const setDate = (d: Date) => {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    send({ type: "SELECT_DATE", date: k });
  };

  const selectSlot = (s: SlotDto) => send({ type: "SELECT_SLOT", slot: s });

  const longLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const slots = data?.slots ?? [];
  const availableSlots = slots.filter((s) => s.available);
  const anyAvailable = availableSlots.length > 0;
  const bestSlotId = availableSlots[0]?.slotId;

  return (
    <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr]">
      <Card>
        <CalendarGrid selected={date} today={today} onSelect={setDate} />
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[15px] font-medium tracking-tight">{longLabel}</div>
            <div className="font-mono text-[11.5px] text-fg-faint">{data?.timezone?.replace("_", " ") ?? "Loading timezone"}</div>
          </div>
          <button onClick={refresh} className="font-mono text-[11px] text-fg-faint hover:text-fg uppercase tracking-wider">
            ↻ refresh
          </button>
        </div>

        {error && (
          <div className="mb-3">
            <ErrorBanner code="LOAD_FAILED" message={error} onDismiss={() => send({ type: "ERROR_CLEARED" })} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-11 rounded-[10px] bg-panel2 animate-pulse" />
            ))}
          </div>
        ) : !anyAvailable ? (
          <div className="text-center py-14 text-fg-faint">
            <div className="text-[32px] opacity-50 mb-2">◌</div>
            <div className="text-[13.5px]">No times available on this day.</div>
            <div className="text-[12px] mt-1.5">Try another date to continue.</div>
          </div>
        ) : (
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
        )}

        <div className="flex items-center justify-end mt-4">
          <Button disabled={!ctx.selectedSlot} onClick={onContinue}>
            Continue{" "}
            {ctx.selectedSlot && (
              <span className="font-mono ml-1.5 opacity-70">
                → {new Date(ctx.selectedSlot.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
