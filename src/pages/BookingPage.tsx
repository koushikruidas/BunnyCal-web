import { useEffect, useRef } from "react";
import { Stepper } from "@/components/Stepper";
import { EventSummary } from "@/components/EventSummary";
import { SlotsView } from "./SlotsView";
import { DetailsView } from "./DetailsView";
import { HeldView } from "./HeldView";
import { ConfirmedView } from "./ConfirmedView";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { STEP_LABELS, stepIndex } from "@/state/bookingMachine";

import type { HostKind } from "@/services/bookingResolver";

interface Props { username: string; eventTypeSlug: string; hostKind?: HostKind; }

function addDaysKey(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingPage({ username, eventTypeSlug, hostKind = "authenticated-host" }: Props) {
  const { ctx, send } = useBooking();
  const { loadEvent } = useBookingActions(hostKind);
  const initializedRef = useRef(false);

  useEffect(() => {
    initializedRef.current = false;
    if (import.meta.env.DEV) {
      console.debug("[booking] route init", { username, eventTypeSlug });
    }
    loadEvent(username, eventTypeSlug);
  }, [eventTypeSlug, loadEvent, username]);

  useEffect(() => {
    if (!ctx.eventInfo || initializedRef.current) return;
    if (ctx.state !== "EVENT") return;

    const defaultDate = addDaysKey(2);
    if (import.meta.env.DEV) {
      console.debug("[booking] event loaded -> initializing slots", {
        username: ctx.username,
        eventTypeSlug: ctx.eventTypeSlug,
        defaultDate,
      });
    }
    send({ type: "SELECT_DATE", date: defaultDate });
    send({ type: "GO_TO_SLOTS" });
    initializedRef.current = true;
  }, [ctx.eventInfo, ctx.state, send]);

  const step = stepIndex(ctx.state);

  if (ctx.state === "EVENT" && !ctx.eventInfo) {
    return (
      <div className="min-h-screen p-5 sm:p-8 max-w-[1100px] mx-auto">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
          {ctx.error ? (
            <>
              <h1 className="text-xl font-semibold text-[#0f172a]">Unable to load booking page</h1>
              <p className="text-sm text-[#64748b] mt-2">{ctx.error.message}</p>
              <button onClick={() => loadEvent(username, eventTypeSlug)} className="mt-4 rounded-lg border border-[#d1d5db] px-4 py-2 text-sm">Retry</button>
            </>
          ) : (
            <p className="text-sm text-[#64748b]">Loading booking page...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 sm:p-8 max-w-[1200px] mx-auto flex flex-col gap-4">
      <div className="rounded-[24px] p-6 sm:p-8 bg-gradient-header text-white shadow-card relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[16px] bg-white/20 text-white grid place-items-center font-semibold text-[18px] tracking-tight">
            {ctx.eventInfo ? ctx.eventInfo.hostName.split(" ").map((p) => p[0]).join("").slice(0, 2) : "—"}
          </div>
          <div>
            <h1 className="m-0 text-[22px] sm:text-[28px] font-semibold tracking-tight">
              Book a time with {ctx.eventInfo?.hostName.split(" ")[0] ?? "..."}
            </h1>
            <div className="font-mono text-[13px] opacity-75">@{username} / {eventTypeSlug}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono">{ctx.eventInfo?.duration ?? "--"} min</span>
          <span className="px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono">{ctx.eventInfo?.location ?? "--"}</span>
        </div>
      </div>

      <Stepper current={step} steps={STEP_LABELS} onJump={(i) => {
        if (i === 1) send({ type: "BACK" });
        if (i === 2 && ctx.state === "HELD") send({ type: "BACK" });
      }} />

      {ctx.state === "CONFIRMED" ? (
        <ConfirmedView hostKind={hostKind} />
      ) : (
        <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr] items-start">
          <EventSummary info={ctx.eventInfo} />
          <div>
            {ctx.state === "SLOTS" && <SlotsView hostKind={hostKind} today={new Date()} onContinue={() => send({ type: "GO_TO_DETAILS" })} />}
            {ctx.state === "DETAILS" && <DetailsView hostKind={hostKind} onBack={() => send({ type: "BACK" })} />}
            {ctx.state === "HELD" && <HeldView hostKind={hostKind} onBack={() => send({ type: "BACK" })} />}
            {ctx.state === "EXPIRED" && (
              <div className="p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]">
                <div className="text-[18px] font-medium mb-1.5">Your hold expired</div>
                <div className="text-[13.5px] text-fg-dim mb-4">No worries, pick another slot and lock it again.</div>
                <button onClick={() => send({ type: "BACK" })} className="font-mono text-[12px] uppercase tracking-widest text-accent-pink">back to slots</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
