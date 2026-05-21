import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Link } from "react-router-dom";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { opsLogger } from "@/lib/opsLogger";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
export function ConfirmedView({ hostKind = "authenticated-host" }) {
    const { ctx, send } = useBooking();
    const { cancel, reschedule } = useBookingActions(hostKind);
    const [message, setMessage] = useState(null);
    const [actionPending, setActionPending] = useState(null);
    const lifecycleLoggedRef = useRef(new Set());
    if (!ctx.selectedSlot || !ctx.hold)
        return null;
    const onCancel = async () => {
        if (actionPending)
            return;
        setActionPending("cancel");
        await cancel();
        setMessage("Booking cancelled.");
        setActionPending(null);
    };
    const onReschedule = async () => {
        if (actionPending)
            return;
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
        if (!lifecycle || !confirmation?.bookingId)
            return;
        const key = `${confirmation.bookingId}:${lifecycle.kind}:confirmed-view`;
        if (lifecycleLoggedRef.current.has(key))
            return;
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
    return (_jsxs("section", { className: "bk-success", "aria-label": "Booking confirmed", children: [_jsxs("header", { className: "bk-success-header", children: [_jsxs(Link, { to: manageLink || "/", className: "onb-brand bk-success-brand", children: [_jsx("div", { className: "bk-brand-mark", children: _jsx(BunnyMark, { size: 26 }) }), _jsx(BrandWordmark, { className: "onb-brand-name", style: { fontFamily: "var(--sans)", fontWeight: 600 } })] }), _jsxs("div", { className: "bk-success-header-actions", children: [_jsx("a", { href: "mailto:help@bunnycal.com", className: "bk-success-link", children: "Help" }), _jsx("button", { type: "button", className: "bk-success-link", onClick: () => send({ type: "RESET" }), children: "Book another time" })] })] }), _jsxs("div", { className: "bk-success-hero", children: [_jsxs("div", { children: [_jsxs("div", { className: "bk-success-pill", children: [_jsx("span", { className: "dot" }), " Confirmed \u00B7 Synced everywhere"] }), _jsxs("h1", { className: "bk-success-title", children: ["It's on the calendar. ", _jsxs("em", { children: ["See you ", new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(startDate), "."] })] }), _jsxs("p", { className: "bk-success-copy", children: ["A calm confirmation is on its way to ", _jsx("strong", { className: "text-fg", children: ctx.details.email }), ", with the link and invite details."] })] }), _jsxs("article", { className: "bk-success-summary", children: [_jsxs("div", { className: "bk-success-summary-host", children: [_jsx("div", { className: "bk-host-avatar", children: (ctx.eventInfo?.hostName?.trim()?.[0] || "H").toUpperCase() }), _jsxs("div", { children: [_jsx("strong", { children: ctx.eventInfo?.hostName ?? "Host" }), _jsx("div", { children: ctx.eventInfo?.description || "Independent strategist · BunnyCal" })] })] }), _jsxs("h2", { children: [meetingTitle, " \u00B7 ", _jsxs("em", { children: [meetingDuration, " min"] })] }), _jsxs("div", { className: "bk-success-summary-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "When" }), _jsx("strong", { children: formatMeetingDateTime(ctx.selectedSlot.start) })] }), _jsxs("div", { children: [_jsx("span", { children: "Where" }), _jsx("strong", { children: meetingLocation }), conferenceUrl && _jsx("a", { href: conferenceUrl, target: "_blank", rel: "noreferrer", children: "Open meeting link" })] })] }), _jsxs("div", { className: "bk-success-summary-meta", children: [meetingRange.date, " \u00B7 ", meetingRange.time, " \u00B7 ", meetingTimezone] })] })] }), _jsxs("section", { className: "bk-success-section", children: [_jsxs("h3", { children: ["What happens ", _jsx("em", { children: "between now and then." })] }), _jsx("p", { children: "Four quiet steps. You don't need to do any of them." }), _jsxs("div", { className: "bk-success-timeline", children: [_jsxs("div", { className: "bk-success-step", children: [_jsx("span", { children: "Just now" }), _jsx("strong", { children: "Held & confirmed" }), _jsx("p", { children: "Your slot is locked across calendars." })] }), _jsxs("div", { className: "bk-success-step", children: [_jsx("span", { children: "In a moment" }), _jsx("strong", { children: "Confirmation email" }), _jsx("p", { children: "Invite details and your manage link arrive in your inbox." })] }), _jsxs("div", { className: "bk-success-step", children: [_jsx("span", { children: "Before meeting" }), _jsx("strong", { children: "Soft reminder" }), _jsx("p", { children: "A gentle reminder with the meeting details." })] }), _jsxs("div", { className: "bk-success-step", children: [_jsx("span", { children: "At start time" }), _jsx("strong", { children: "Quiet nudge" }), _jsx("p", { children: "Join from your invite or meeting link." })] })] })] }), _jsxs("section", { className: "bk-success-section", children: [_jsxs("h3", { children: ["Add it to ", _jsx("em", { children: "your calendar." })] }), _jsx("p", { children: "Optional, your invitation email already includes this." }), _jsxs("div", { className: "bk-success-calendar-ctas", children: [_jsx("a", { href: googleCalendarHref, target: "_blank", rel: "noreferrer", className: "bk-success-cta", children: "Google Calendar" }), _jsx("a", { href: icsHref, download: `${slugify(meetingTitle)}.ics`, className: "bk-success-cta", children: "Apple Calendar" }), _jsx("a", { href: outlookCalendarHref, target: "_blank", rel: "noreferrer", className: "bk-success-cta", children: "Outlook" }), _jsx("a", { href: icsHref, download: `${slugify(meetingTitle)}.ics`, className: "bk-success-cta", children: "Download .ics" }), canOpenCalendar && _jsx("a", { href: providerEventUrl, target: "_blank", rel: "noreferrer", className: "bk-success-cta", children: "Open invitation" })] })] }), _jsxs("div", { className: "bk-success-footnote", children: [_jsx("span", { className: "dot" }), syncStatus.label, " \u00B7 ", syncStatus.detail, " \u00B7 Times shown in your local zone"] }), _jsxs("section", { className: "bk-success-manage", children: [_jsxs("div", { children: [_jsx("h4", { children: "Need to change anything?" }), _jsx("p", { children: "Reschedule or cancel anytime." })] }), _jsxs("div", { className: "bk-success-manage-actions", children: [manageLink && _jsx(Link, { to: manageLink, className: "bk-success-cta bk-success-cta-primary", children: "Manage booking" }), _jsx(Button, { variant: "ghost", className: "bk-success-cta", onClick: onReschedule, disabled: Boolean(actionPending), children: actionPending === "reschedule" ? "Rescheduling..." : "Reschedule" }), _jsx(Button, { variant: "ghost", className: "bk-success-cta", onClick: onCancel, disabled: Boolean(actionPending), children: actionPending === "cancel" ? "Cancelling..." : "Cancel" }), _jsx("button", { type: "button", className: "bk-success-cta", onClick: () => manageLink && navigator.clipboard.writeText(`${appOrigin}${manageLink}`), disabled: !manageLink, children: "Copy manage link" })] })] }), message && _jsx("div", { className: "text-caption text-fg-faint", role: "status", "aria-live": "polite", children: message })] }));
}
function toUtcStamp(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}
function buildIcsDataUri(input) {
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
function buildGoogleCalendarUrl(input) {
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", input.title);
    url.searchParams.set("dates", `${toUtcStamp(input.start)}/${toUtcStamp(input.end)}`);
    url.searchParams.set("details", input.description);
    url.searchParams.set("location", input.location);
    return url.toString();
}
function buildOutlookCalendarUrl(input) {
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
function escapeIcs(value) {
    return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "booking";
}
