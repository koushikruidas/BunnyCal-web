import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { formatMeetingDateTime, formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";

export type BookingSummaryStatus = "CONFIRMED" | "CANCELLED" | "RESCHEDULED" | string;

export interface BookingSummaryCardProps {
  bookingId: string;
  eventName: string;
  /** When undefined, the "With" row is omitted; when an empty string, the row is still rendered (matches ConfirmedView parity). */
  hostName?: string;
  /** ISO timestamp for the booking start. */
  startTime: string;
  durationMinutes: number;
  /** Defaults to the browser timezone. */
  timezone?: string;
  /** Attendee name row. Omitted when undefined. */
  attendeeName?: string;
  /** Attendee email row. Omitted when undefined. */
  attendeeEmail?: string;
  conferenceUrl?: string | null;
  /** Drives the "Meeting link" pending state and the Status row label. Defaults to "CONFIRMED". */
  status?: BookingSummaryStatus;
  /** Overrides the visible Status row label (ConfirmedView hard-codes "CONFIRMED" regardless of status). */
  statusLabel?: string;
  /** Top section (icon + title + subtitle). Omit to render the grid only. */
  header?: ReactNode;
  /** Extra content rendered inside the card after the grid (actions, message, brand foot). */
  children?: ReactNode;
  className?: string;
}

export function BookingSummaryCard({
  bookingId,
  eventName,
  hostName,
  startTime,
  durationMinutes,
  timezone,
  attendeeName,
  attendeeEmail,
  conferenceUrl,
  status,
  statusLabel,
  header,
  children,
  className,
}: BookingSummaryCardProps) {
  const longLabel = formatMeetingDateTime(startTime);
  const timeLabel = formatMeetingTimeOnly(startTime);
  const tz = timezone ?? getBrowserTimeZone();
  const normalizedStatus = (status ?? "CONFIRMED").toString().toUpperCase();
  const visibleStatus = statusLabel ?? (normalizedStatus === "CANCELLED" ? "CANCELLED" : "CONFIRMED");
  const statusGood = visibleStatus.toUpperCase() === "CONFIRMED";

  return (
    <Card padding="lg" className={["bk-confirmed-card", className].filter(Boolean).join(" ")}>
      {header}

      <div className="bk-confirmed-grid">
        <div className="bk-confirmed-panel bk-confirmed-panel-full">
          <Row k="Booking ID" v={bookingId} />
          <Row k="Meeting" v={eventName} />
          <Row k="When" v={longLabel} />
          <Row k="Time" v={`${timeLabel} · ${durationMinutes} min`} />
          <Row k="Timezone" v={tz} />
          {hostName !== undefined ? <Row k="With" v={hostName} /> : null}
          {attendeeName !== undefined ? <Row k="Attendee" v={attendeeName} /> : null}
          {attendeeEmail !== undefined ? <Row k="Email" v={attendeeEmail} /> : null}
          <ConferenceLinkRow conferenceUrl={conferenceUrl} status={normalizedStatus} />
          <div className="pt-2.5 mt-1 border-t border-dashed border-[rgba(31,21,48,0.12)]">
            <Row k="Status" v={visibleStatus} goodVariant={statusGood} />
          </div>
        </div>
      </div>

      {children}
    </Card>
  );
}

function Row({ k, v, goodVariant }: { k: string; v: string; goodVariant?: boolean }) {
  return (
    <div className="flex justify-between gap-3.5 font-mono text-body-sm">
      <span className="text-fg-faint uppercase tracking-widest text-eyebrow">{k}</span>
      <span className={(goodVariant ? "text-accent-mint" : "text-fg") + " text-right"}>{v}</span>
    </div>
  );
}

function ConferenceLinkRow({ conferenceUrl, status }: { conferenceUrl?: string | null; status?: string | null }) {
  const url = (conferenceUrl ?? "").trim();
  if (url) {
    return (
      <div className="flex justify-between gap-3.5 font-mono text-body-sm">
        <span className="text-fg-faint uppercase tracking-widest text-eyebrow">Meeting link</span>
        <a href={url} target="_blank" rel="noreferrer" className="text-right text-fg underline break-all">
          {url}
        </a>
      </div>
    );
  }
  const showPending = (status ?? "").toUpperCase() !== "CANCELLED";
  if (!showPending) return null;
  return (
    <div className="flex justify-between gap-3.5 font-mono text-body-sm">
      <span className="text-fg-faint uppercase tracking-widest text-eyebrow">Meeting link</span>
      <span className="text-right text-fg-dim" aria-live="polite">Preparing meeting link…</span>
    </div>
  );
}
