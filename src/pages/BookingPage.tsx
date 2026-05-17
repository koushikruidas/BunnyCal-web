import { useEffect, useRef } from "react";
import { EventSummary } from "@/components/EventSummary";
import { SlotsView } from "./SlotsView";
import { DetailsView } from "./DetailsView";
import { HeldView } from "./HeldView";
import { ConfirmedView } from "./ConfirmedView";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { STEP_LABELS, stepIndex } from "@/state/bookingMachine";
import { PageShell } from "@/ui/layout";
import { Button } from "@/ui/controls";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import "./booking/booking.css";

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
      <PageShell width="wide">
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft" role="status" aria-live="polite">
          {ctx.error ? (
            <>
              <h1 className="text-xl font-semibold text-text-primary">Unable to load booking page</h1>
              <p className="mt-2 text-sm text-text-secondary">{ctx.error.message}</p>
              <Button variant="secondary" size="sm" onClick={() => loadEvent(username, eventTypeSlug)} className="mt-4">
                Retry
              </Button>
            </>
          ) : (
            <p className="text-sm text-text-secondary">Loading booking page...</p>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="full">
      <main className="bk-wrap" aria-label="Public booking flow">
        <div className="bk-layout">
          <aside className="bk-aside">
            <div className="bk-brandline onb-brand">
              <BunnyMark size={45} color="#2B1F3D" />
              <BrandWordmark style={{ fontFamily: '"Newsreader", serif', fontWeight: 500, fontSize: 26 }} />
            </div>
            <div className="bk-host">
              <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[#7A6BB0]">A calm invitation</div>
              <h2>{ctx.eventInfo?.hostName?.split(" ")[0] ?? "Host"}, <em style={{ fontStyle: "italic", color: "#5E4E99" }}>let's find a time.</em></h2>
              <p>@{username} / {eventTypeSlug}</p>
            </div>
            <div className="bk-event">
              <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[#7A6BB0]">Meeting</div>
              <h3>{ctx.eventInfo?.name ?? "Loading event..."}</h3>
              <p>{ctx.eventInfo?.description || "Pick a time that fits your week. Nothing offered will collide with your existing commitments."}</p>
              <div className="bk-meta">
                <span>{ctx.eventInfo?.duration ?? "--"} min</span>
                <span>·</span>
                <span>{ctx.eventInfo?.location ?? "--"}</span>
                <span>·</span>
                <span>{ctx.eventInfo?.timezone ?? "Local timezone"}</span>
              </div>
            </div>
            <div className="bk-trust">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#BFCDB9", boxShadow: "0 0 0 3px #DDE6D8" }} />
                Slot holds are private and expire safely
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#BFCDB9", boxShadow: "0 0 0 3px #DDE6D8" }} />
                BunnyCal re-verifies before confirming
              </div>
            </div>
          </aside>

          <section className="bk-main">
            <div className="bk-steps">
              {STEP_LABELS.map((label, idx) => (
                <div key={label} className={idx === step ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="dot">{idx + 1}</span>
                  <span className="lbl">{label}</span>
                </div>
              ))}
            </div>
            <div className="bk-head">
              <h1>When works <em style={{ fontStyle: "italic", color: "#5E4E99" }}>for you?</em></h1>
              <p>Choose a slot and continue with a lightweight flow. Your selection is held briefly while you confirm details.</p>
            </div>
            {ctx.state === "CONFIRMED" ? (
              <ConfirmedView hostKind={hostKind} />
            ) : (
              <div className="bk-content">
                <EventSummary info={ctx.eventInfo} />
                <div>
                  {ctx.state === "SLOTS" && <SlotsView hostKind={hostKind} today={new Date()} onContinue={() => send({ type: "GO_TO_DETAILS" })} />}
                  {ctx.state === "DETAILS" && <DetailsView hostKind={hostKind} onBack={() => send({ type: "BACK" })} />}
                  {ctx.state === "HELD" && <HeldView hostKind={hostKind} onBack={() => send({ type: "BACK" })} />}
                  {ctx.state === "EXPIRED" && (
                    <div className="p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]">
                      <div className="text-[18px] font-medium mb-1.5">Your hold expired</div>
                      <div className="text-[13.5px] text-fg-dim mb-4">No worries, pick another slot and lock it again.</div>
                      <button onClick={() => send({ type: "BACK" })} className="font-mono text-[12px] uppercase tracking-widest text-accent-pink">Back to slots</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </PageShell>
  );
}
