import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";

export function ConfirmedView() {
  const { ctx, send } = useBooking();
  const { cancel, reschedule } = useBookingActions();
  const [message, setMessage] = useState<string | null>(null);

  if (!ctx.selectedSlot || !ctx.hold) return null;
  const start = new Date(ctx.selectedSlot.start);
  const longLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const onCancel = async () => {
    await cancel();
    setMessage("Booking cancelled.");
  };

  const onReschedule = async () => {
    const ok = await reschedule();
    setMessage(ok ? "Reschedule request submitted." : "Unable to reschedule right now.");
  };

  return (
    <Card padding="lg" className="text-center flex flex-col items-center gap-4">
      <div className="pop w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-accent-mint to-accent-sky grid place-items-center text-[#0f4d35] text-[32px] font-bold">✓</div>
      <h2 className="text-[26px] font-semibold tracking-tight m-0">You're booked.</h2>
      <p className="text-[14px] text-fg-dim max-w-[420px] leading-snug">
        We sent a confirmation to <strong className="text-fg">{ctx.details.email}</strong> with the {ctx.eventInfo?.location} link and calendar invite.
      </p>

      <div className="w-full max-w-[460px] border border-white/[.08] rounded-[14px] p-4 bg-panel2 flex flex-col gap-2.5 text-left">
        <Row k="Booking ID" v={ctx.hold.bookingId} />
        <Row k="When" v={longLabel} />
        <Row k="Time" v={`${timeLabel} · ${ctx.eventInfo?.duration ?? 30} min`} />
        <Row k="With" v={ctx.eventInfo?.hostName ?? ""} />
        <div className="pt-2.5 mt-1 border-t border-dashed border-white/[.08]"><Row k="Status" v="CONFIRMED" goodVariant /></div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
        <Button variant="ghost" onClick={onReschedule}>Reschedule</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="ghost" onClick={() => send({ type: "RESET" })}>Book another</Button>
      </div>

      {message && <div className="text-[12px] text-fg-faint">{message}</div>}
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
