import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import type { HostKind } from "@/services/bookingResolver";
import { getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { opsLogger } from "@/lib/opsLogger";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";

export function ConfirmedView({ hostKind = "authenticated-host" }: { hostKind?: HostKind }) {
  const { ctx, send } = useBooking();
  const { cancel, reschedule } = useBookingActions(hostKind);
  const [message, setMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"cancel" | "reschedule" | null>(null);
  const lifecycleLoggedRef = useRef<Set<string>>(new Set());

  if (!ctx.selectedSlot || !ctx.hold) return null;

  const onCancel = async () => {
    if (actionPending) return;
    setActionPending("cancel");
    await cancel();
    setMessage("Booking cancelled.");
    setActionPending(null);
  };

  const onReschedule = async () => {
    if (actionPending) return;
    setActionPending("reschedule");
    const ok = await reschedule();
    setMessage(ok ? "Reschedule request submitted." : "Unable to reschedule right now.");
    setActionPending(null);
  };

  const confirmation = ctx.confirmation;
  const manageToken = confirmation?.manageToken?.trim() || "";
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const confirmedBookingId = confirmation?.bookingId || ctx.hold?.bookingId || "";
  const meetingTitle = ctx.eventInfo?.name ?? "Meeting";
  const meetingDuration = ctx.eventInfo?.duration ?? 30;
  const meetingLocation = ctx.eventInfo?.location?.trim() || "Zoom";
  const meetingTimezone = ctx.eventInfo?.timezone ?? getBrowserTimeZone();
  const syncStatus = getSyncState({ provider: confirmation?.provider, calendarSyncStatus: confirmation?.calendarSyncStatus });
  const providerEventUrl = confirmation?.providerEventUrl?.trim() || "";
  const conferenceUrl = confirmation?.conferenceUrl?.trim() || "";
  const canOpenCalendar = Boolean(providerEventUrl);

  const manageLink = confirmedBookingId && manageToken && ctx.username && ctx.eventTypeSlug
    ? `/manage/${confirmedBookingId}?token=${encodeURIComponent(manageToken)}&u=${encodeURIComponent(ctx.username)}&e=${encodeURIComponent(ctx.eventTypeSlug)}`
    : "";
  if (import.meta.env.DEV && confirmation?.bookingId && ctx.hold?.bookingId && confirmation.bookingId !== ctx.hold.bookingId) {
    console.warn("[guest-manage] booking id mismatch between hold and confirmation", {
      holdBookingId: ctx.hold.bookingId,
      confirmationBookingId: confirmation.bookingId,
    });
  }
  const lifecycle = getLifecycleState({
    externalLifecycleState: confirmation?.externalLifecycleState,
    externalLifecycleReason: confirmation?.externalLifecycleReason,
    reconcileSuppressed: confirmation?.reconcileSuppressed,
    actionRequired: confirmation?.actionRequired,
  });

  useEffect(() => {
    if (!lifecycle || !confirmation?.bookingId) return;
    const key = `${confirmation.bookingId}:${lifecycle.kind}:confirmed-view`;
    if (lifecycleLoggedRef.current.has(key)) return;
    lifecycleLoggedRef.current.add(key);
    opsLogger.warn({
      category: lifecycle.kind === "PROVIDER_DISCONNECTED" ? "provider_disconnect_lifecycle_visible" : "external_lifecycle_rendered",
      message: "External lifecycle state rendered in confirmed booking view",
      details: { view: "confirmed-view", state: lifecycle.kind, bookingStatus: confirmation.status },
    });
    if (lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && confirmation.status !== "CANCELLED") {
      opsLogger.warn({
        category: "lifecycle_mismatch_rendered",
        message: "External lifecycle mismatch rendered in confirmed booking view",
        details: { view: "confirmed-view", state: lifecycle.kind, bookingStatus: confirmation.status },
      });
    }
  }, [confirmation?.bookingId, confirmation?.status, lifecycle]);

  const startDate = new Date(ctx.selectedSlot.start);
  const endDate = new Date(startDate.getTime() + meetingDuration * 60 * 1000);
  const meetingRange = formatMeetingDateAndTimeRange(ctx.selectedSlot.start, endDate.toISOString());
  const calendarDescription = `Meeting with ${ctx.eventInfo?.hostName ?? "your host"} via BunnyCal.`;
  const icsHref = buildIcsDataUri({
    title: meetingTitle,
    start: startDate,
    end: endDate,
    description: calendarDescription,
    location: meetingLocation,
  });
  const googleCalendarHref = buildGoogleCalendarUrl({
    title: meetingTitle,
    start: startDate,
    end: endDate,
    description: calendarDescription,
    location: meetingLocation,
  });
  const outlookCalendarHref = buildOutlookCalendarUrl({
    title: meetingTitle,
    start: startDate,
    end: endDate,
    description: calendarDescription,
    location: meetingLocation,
  });

  return (
    <section className="bk-success" aria-label="Booking confirmed">
      <header className="bk-success-header">
        <Link to={manageLink || "/"} className="onb-brand bk-success-brand">
          <div className="bk-brand-mark">
            <BunnyMark size={26} />
          </div>
          <BrandWordmark className="onb-brand-name" style={{ fontFamily: "var(--sans)", fontWeight: 600 }} />
        </Link>
        <div className="bk-success-header-actions">
          <a href="mailto:help@bunnycal.com" className="bk-success-link">Help</a>
          <button type="button" className="bk-success-link" onClick={() => send({ type: "RESET" })}>Book another time</button>
        </div>
      </header>

      <div className="bk-success-hero">
        <div>
          <div className="bk-success-pill"><span className="dot" /> Confirmed · Synced everywhere</div>
          <h1 className="bk-success-title">
            It&apos;s on the calendar. <em>See you {new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(startDate)}.</em>
          </h1>
          <p className="bk-success-copy">
            A calm confirmation is on its way to <strong className="text-fg">{ctx.details.email}</strong>, with the link and invite details.
          </p>
        </div>
        <article className="bk-success-summary">
          <div className="bk-success-summary-host">
            <div className="bk-host-avatar">{(ctx.eventInfo?.hostName?.trim()?.[0] || "H").toUpperCase()}</div>
            <div>
              <strong>{ctx.eventInfo?.hostName ?? "Host"}</strong>
              <div>{ctx.eventInfo?.description || "Independent strategist · BunnyCal"}</div>
            </div>
          </div>
          <h2>{meetingTitle} · <em>{meetingDuration} min</em></h2>
          <div className="bk-success-summary-grid">
            <div>
              <span>When</span>
              <strong>{formatMeetingDateTime(ctx.selectedSlot.start)}</strong>
            </div>
            <div>
              <span>Where</span>
              <strong>{meetingLocation}</strong>
              {conferenceUrl && <a href={conferenceUrl} target="_blank" rel="noreferrer">Open meeting link</a>}
            </div>
          </div>
          <div className="bk-success-summary-meta">{meetingRange.date} · {meetingRange.time} · {meetingTimezone}</div>
        </article>
      </div>

      <section className="bk-success-section">
        <h3>What happens <em>between now and then.</em></h3>
        <p>Four quiet steps. You don&apos;t need to do any of them.</p>
        <div className="bk-success-timeline">
          <div className="bk-success-step">
            <span>Just now</span>
            <strong>Held & confirmed</strong>
            <p>Your slot is locked across calendars.</p>
          </div>
          <div className="bk-success-step">
            <span>In a moment</span>
            <strong>Confirmation email</strong>
            <p>Invite details and your manage link arrive in your inbox.</p>
          </div>
          <div className="bk-success-step">
            <span>Before meeting</span>
            <strong>Soft reminder</strong>
            <p>A gentle reminder with the meeting details.</p>
          </div>
          <div className="bk-success-step">
            <span>At start time</span>
            <strong>Quiet nudge</strong>
            <p>Join from your invite or meeting link.</p>
          </div>
        </div>
      </section>

      <section className="bk-success-section">
        <h3>Add it to <em>your calendar.</em></h3>
        <p>Optional, your invitation email already includes this.</p>
        <div className="bk-success-calendar-ctas">
          <a href={googleCalendarHref} target="_blank" rel="noreferrer" className="bk-success-cta">Google Calendar</a>
          <a href={icsHref} download={`${slugify(meetingTitle)}.ics`} className="bk-success-cta">Apple Calendar</a>
          <a href={outlookCalendarHref} target="_blank" rel="noreferrer" className="bk-success-cta">Outlook</a>
          <a href={icsHref} download={`${slugify(meetingTitle)}.ics`} className="bk-success-cta">Download .ics</a>
          {canOpenCalendar && <a href={providerEventUrl} target="_blank" rel="noreferrer" className="bk-success-cta">Open invitation</a>}
        </div>
      </section>

      <div className="bk-success-footnote">
        <span className="dot" />
        {syncStatus.label} · {syncStatus.detail} · Times shown in your local zone
      </div>

      <section className="bk-success-manage">
        <div>
          <h4>Need to change anything?</h4>
          <p>Reschedule or cancel anytime.</p>
        </div>
        <div className="bk-success-manage-actions">
          {manageLink && <Link to={manageLink} className="bk-success-cta bk-success-cta-primary">Manage booking</Link>}
          <Button variant="ghost" className="bk-success-cta" onClick={onReschedule} disabled={Boolean(actionPending)}>{actionPending === "reschedule" ? "Rescheduling..." : "Reschedule"}</Button>
          <Button variant="ghost" className="bk-success-cta" onClick={onCancel} disabled={Boolean(actionPending)}>{actionPending === "cancel" ? "Cancelling..." : "Cancel"}</Button>
          <button
            type="button"
            className="bk-success-cta"
            onClick={() => manageLink && navigator.clipboard.writeText(`${appOrigin}${manageLink}`)}
            disabled={!manageLink}
          >
            Copy manage link
          </button>
        </div>
      </section>

      {message && <div className="text-caption text-fg-faint" role="status" aria-live="polite">{message}</div>}
    </section>
  );
}

function toUtcStamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildIcsDataUri(input: { title: string; start: Date; end: Date; description: string; location: string }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BunnyCal//Booking Confirmation//EN",
    "BEGIN:VEVENT",
    `UID:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}@bunnycal`}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(input.start)}`,
    `DTEND:${toUtcStamp(input.end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

function buildGoogleCalendarUrl(input: { title: string; start: Date; end: Date; description: string; location: string }) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${toUtcStamp(input.start)}/${toUtcStamp(input.end)}`);
  url.searchParams.set("details", input.description);
  url.searchParams.set("location", input.location);
  return url.toString();
}

function buildOutlookCalendarUrl(input: { title: string; start: Date; end: Date; description: string; location: string }) {
  const url = new URL("https://outlook.office.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", input.title);
  url.searchParams.set("startdt", input.start.toISOString());
  url.searchParams.set("enddt", input.end.toISOString());
  url.searchParams.set("body", input.description);
  url.searchParams.set("location", input.location);
  return url.toString();
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "booking";
}
