import { useEffect } from "react";
import { Stepper } from "@/components/Stepper";
import { EventSummary } from "@/components/EventSummary";
import { SlotsView } from "./SlotsView";
import { DetailsView } from "./DetailsView";
import { HeldView } from "./HeldView";
import { ConfirmedView } from "./ConfirmedView";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { STEP_LABELS, stepIndex } from "@/state/bookingMachine";

interface Props { username: string; eventTypeSlug: string; }

export function BookingPage({ username, eventTypeSlug }: Props) {
  const { ctx, send } = useBooking();
  const { loadEvent } = useBookingActions();
  const today = new Date();

  useEffect(() => {
    loadEvent(username, eventTypeSlug);
    if (ctx.state === "EVENT") {
      // Initialize selected date to today + 2
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      send({ type: "SELECT_DATE", date: k });
      send({ type: "GO_TO_SLOTS" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = stepIndex(ctx.state);

  return (
    <div className="min-h-screen p-5 sm:p-8 max-w-[1200px] mx-auto flex flex-col gap-4">
      {/* Hero header */}
      <div className="rounded-[24px] p-6 sm:p-8 bg-gradient-header text-white shadow-card relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[16px] bg-white/20 text-white grid place-items-center font-semibold text-[18px] tracking-tight">
            {ctx.eventInfo ? ctx.eventInfo.hostName.split(" ").map(p => p[0]).join("").slice(0, 2) : "—"}
          </div>
          <div>
            <h1 className="m-0 text-[22px] sm:text-[28px] font-semibold tracking-tight">
              Book a time with {ctx.eventInfo?.hostName.split(" ")[0] ?? "…"}
            </h1>
            <div className="font-mono text-[13px] opacity-75">@{username} / {eventTypeSlug}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono">⏱ {ctx.eventInfo?.duration ?? "—"} min</span>
          <span className="px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono">◐ {ctx.eventInfo?.location ?? "—"}</span>
        </div>
      </div>

      <Stepper current={step} steps={STEP_LABELS} onJump={(i) => {
        if (i === 1) send({ type: "BACK" });
        if (i === 2 && ctx.state === "HELD") send({ type: "BACK" });
      }} />

      {ctx.state === "CONFIRMED" ? (
        <ConfirmedView />
      ) : (
        <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr] items-start">
          <EventSummary info={ctx.eventInfo} />
          <div>
            {ctx.state === "SLOTS" && <SlotsView today={today} onContinue={() => send({ type: "GO_TO_DETAILS" })} />}
            {ctx.state === "DETAILS" && <DetailsView onBack={() => send({ type: "BACK" })} />}
            {ctx.state === "HELD" && <HeldView onBack={() => send({ type: "BACK" })} />}
            {ctx.state === "EXPIRED" && (
              <div className="p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]">
                <div className="text-[18px] font-medium mb-1.5">Your hold expired</div>
                <div className="text-[13.5px] text-fg-dim mb-4">No worries — pick another slot and we'll lock it again.</div>
                <button onClick={() => send({ type: "BACK" })} className="font-mono text-[12px] uppercase tracking-widest text-accent-pink">← back to slots</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
