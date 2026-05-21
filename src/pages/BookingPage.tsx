import { Fragment, useEffect, useRef } from "react";
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
  const duration = ctx.eventInfo?.duration ?? "--";
  const eventName = ctx.eventInfo?.name ?? "Meeting";
  const stepTitles = {
    SLOTS: {
      title: <>When works <em style={{ fontStyle: "italic", color: "#5E4E99" }}>for you?</em></>,
      body: "Pick a time that fits your week. Nothing offered will collide with your existing commitments.",
    },
    DETAILS: {
      title: <>One quiet form, <em style={{ fontStyle: "italic", color: "#5E4E99" }}>and we're done.</em></>,
      body: "A name, an email, and an optional note. Your slot is held while you finish.",
    },
    HELD: {
      title: <>Almost there. <em style={{ fontStyle: "italic", color: "#5E4E99" }}>Just confirm.</em></>,
      body: "We're holding your time gently. Lock it in whenever you're ready.",
    },
    EXPIRED: {
      title: <>Let's pick another <em style={{ fontStyle: "italic", color: "#5E4E99" }}>time.</em></>,
      body: "Your previous hold expired, but everything else is ready. Select a new slot to continue.",
    },
    CONFIRMED: {
      title: <>Beautifully done.</>,
      body: "Your confirmation is ready with invitation details and next steps.",
    },
  } as const;
  const currentHead =
    ctx.state === "SLOTS" ? stepTitles.SLOTS :
    ctx.state === "DETAILS" ? stepTitles.DETAILS :
    ctx.state === "HELD" ? stepTitles.HELD :
    ctx.state === "EXPIRED" ? stepTitles.EXPIRED :
    stepTitles.CONFIRMED;

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
    <PageShell width="full" className="!px-0 !py-0">
      <main className="bk-wrap" aria-label="Public booking flow">
        <div className="bk-layout">
          <aside className="bk-aside">
            <div className="bk-brandline onb-brand">
              <div className="bk-brand-mark">
                <BunnyMark size={26} />
              </div>
              <BrandWordmark className="onb-brand-name" />
            </div>
            <div className="bk-event">
              <div className="bk-event-tag">You're booking</div>
              <h3>{eventName} <em>· {duration} min</em></h3>
              <p>{ctx.eventInfo?.description || "Pick a time that fits your week. Nothing offered will collide with your existing commitments."}</p>
            </div>
            <div className="bk-meta">
              <div className="bk-meta-row">
                <span className="k">Duration</span>
                <span className="v">{duration} min</span>
              </div>
              <div className="bk-meta-row">
                <span className="k">Location</span>
                <span className="v">{ctx.eventInfo?.location ?? "--"}</span>
              </div>
              <div className="bk-meta-row">
                <span className="k">Timezone</span>
                <span className="v">{ctx.eventInfo?.timezone ?? "Local timezone"}</span>
              </div>
            </div>
            <div className="bk-trust">
              <div className="row">
                <span className="dot" />
                Slot holds are private and expire safely
              </div>
              <div className="row">
                <span className="dot" />
                BunnyCal re-verifies before confirming
              </div>
            </div>
          </aside>

          <section className="bk-main">
            <div className="bk-steps">
              {STEP_LABELS.map((label, idx) => (
                <Fragment key={label}>
                  <div className={`s ${idx < step ? "done" : idx === step ? "active" : ""}`}>
                    <span className="num">{idx + 1}</span>
                    <span className="lbl">{label}</span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && <span className="line" />}
                </Fragment>
              ))}
            </div>
            <div className="bk-head">
              <h1>{currentHead.title}</h1>
              <p>{currentHead.body}</p>
            </div>
            {ctx.state === "CONFIRMED" ? (
              <ConfirmedView hostKind={hostKind} />
            ) : (
              <div className="bk-content">
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
            )}
          </section>
        </div>
      </main>
    </PageShell>
  );
}
