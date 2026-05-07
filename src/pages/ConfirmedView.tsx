import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useBooking } from "@/state/BookingContext";

export function ConfirmedView() {
  const { ctx, send } = useBooking();
  if (!ctx.selectedSlot || !ctx.hold) return null;
  const start = new Date(ctx.selectedSlot.start);
  const longLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <Card padding="lg" className="text-center flex flex-col items-center gap-4">
      <div className="pop w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-mint to-accent-sky grid place-items-center text-[#0f4d35] text-[32px] font-bold">✓</div>
      <h2 className="text-[26px] font-semibold tracking-tight m-0">You're booked.</h2>
      <p className="text-[14px] text-fg-dim max-w-[420px] leading-snug">
        We sent a confirmation to <strong className="text-fg">{ctx.details.email}</strong> with the {ctx.eventInfo?.location} link and a calendar invite.
      </p>

      <div className="w-full max-w-[460px] border border-white/[.08] rounded-[14px] p-4 bg-panel2 flex flex-col gap-2.5 text-left">
        <Row k="Booking ID" v={ctx.hold.bookingId} />
        <Row k="When" v={longLabel} />
        <Row k="Time" v={`${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min`} />
        <Row k="With" v={ctx.eventInfo?.hostName ?? ""} />
        <div className="pt-2.5 mt-1 border-t border-dashed border-white/[.08]">
          <Row k="Status" v="CONFIRMED" goodVariant />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
        <Button variant="ghost">Add to Google Calendar</Button>
        <Button variant="ghost">Reschedule</Button>
        <Button variant="ghost" onClick={() => send({ type: "RESET" })}>Book another</Button>
      </div>

      <div className="text-[12px] text-fg-faint flex items-center gap-2 mt-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
        Slot was locked end-to-end. No double booking. Ever.
      </div>
    </Card>
  );
}

function Row({ k, v, goodVariant }: { k: string; v: string; goodVariant?: boolean }) {
  return (
    <div className="flex justify-between gap-3.5 font-mono text-[13px]">
      <span className="text-fg-faint uppercase tracking-widest text-[11px]">{k}</span>
      <span className={(goodVariant ? "text-accent-mint" : "text-fg") + " text-right"}>{v}</span>
    </div>
  );
}
