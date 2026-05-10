import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HoldRing } from "@/components/HoldRing";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useCountdown } from "@/hooks/useCountdown";
import { useBookingActions } from "@/hooks/useBookingActions";
import { formatMeetingDateTime } from "@/lib/dateTime";

const HOLD_TOTAL = 5 * 60;

export function HeldView({ onBack }: { onBack: () => void }) {
  const { ctx, send } = useBooking();
  const { confirm } = useBookingActions();
  const { remaining, formatted } = useCountdown(ctx.hold?.expiresAt ?? null, () => send({ type: "EXPIRE" }));

  if (!ctx.selectedSlot || !ctx.hold) return null;

  const whenLabel = formatMeetingDateTime(ctx.selectedSlot.start);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3.5 p-3.5 rounded-[14px] border border-accent-butter/[.28] bg-gradient-to-br from-accent-butter/[.18] to-accent-peach/[.12]">
          <HoldRing remaining={remaining} total={HOLD_TOTAL} />
          <div className="flex-1">
            <strong className="block text-[13.5px] font-medium">Reserved for you — {formatted}</strong>
            <span className="text-[12px] text-fg-dim">We'll hold this slot exclusively while you finish. No one else can grab it.</span>
          </div>
        </div>

        {ctx.error && <ErrorBanner code={ctx.error.code} message={ctx.error.message} onDismiss={() => send({ type: "ERROR_CLEARED" })} />}

        <div className="rounded-[14px] border border-white/[.08] bg-panel2 p-4 flex flex-col gap-2.5">
          <ReceiptRow k="When" v={whenLabel} />
          <ReceiptRow k="Duration" v={`${ctx.eventInfo?.duration ?? 30} min`} />
          <ReceiptRow k="With" v={ctx.eventInfo?.hostName ?? ""} />
          <ReceiptRow k="Where" v={ctx.eventInfo?.location ?? ""} />
          <ReceiptRow k="Booking ID" v={ctx.hold.bookingId} />
          <div className="pt-2.5 mt-1 border-t border-dashed border-white/[.08]">
            <ReceiptRow k="Status" v="HELD · expires soon" highlight="warn" />
          </div>
        </div>

        <div className="text-[12.5px] text-fg-dim leading-relaxed">
          On confirm, we re-verify against the host's live calendar. If anything changed in the last few seconds we'll let you pick a new slot — your spot is never lost mid-flight.
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onBack} disabled={ctx.loading}>Back</Button>
          <Button disabled={ctx.loading || remaining === 0} onClick={confirm}>
            {ctx.loading ? "Verifying…" : "Confirm booking"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ReceiptRow({ k, v, highlight }: { k: string; v: string; highlight?: "warn" | "good" }) {
  const color = highlight === "warn" ? "text-accent-butter" : highlight === "good" ? "text-accent-mint" : "text-fg";
  return (
    <div className="flex justify-between gap-3.5 font-mono text-[13px]">
      <span className="text-fg-faint uppercase tracking-widest text-[11px]">{k}</span>
      <span className={color + " text-right"}>{v}</span>
    </div>
  );
}
