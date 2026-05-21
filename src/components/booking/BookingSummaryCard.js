import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/Card";
import { formatMeetingDateTime, formatMeetingTimeOnly, getBrowserTimeZone } from "@/lib/dateTime";
export function BookingSummaryCard({ bookingId, eventName, hostName, startTime, durationMinutes, timezone, attendeeName, attendeeEmail, conferenceUrl, status, statusLabel, header, children, className, }) {
    const longLabel = formatMeetingDateTime(startTime);
    const timeLabel = formatMeetingTimeOnly(startTime);
    const tz = timezone ?? getBrowserTimeZone();
    const normalizedStatus = (status ?? "CONFIRMED").toString().toUpperCase();
    const visibleStatus = statusLabel ?? (normalizedStatus === "CANCELLED" ? "CANCELLED" : "CONFIRMED");
    const statusGood = visibleStatus.toUpperCase() === "CONFIRMED";
    return (_jsxs(Card, { padding: "lg", className: ["bk-confirmed-card", className].filter(Boolean).join(" "), children: [header, _jsx("div", { className: "bk-confirmed-grid", children: _jsxs("div", { className: "bk-confirmed-panel bk-confirmed-panel-full", children: [_jsx(Row, { k: "Booking ID", v: bookingId }), _jsx(Row, { k: "Meeting", v: eventName }), _jsx(Row, { k: "When", v: longLabel }), _jsx(Row, { k: "Time", v: `${timeLabel} · ${durationMinutes} min` }), _jsx(Row, { k: "Timezone", v: tz }), hostName !== undefined ? _jsx(Row, { k: "With", v: hostName }) : null, attendeeName !== undefined ? _jsx(Row, { k: "Attendee", v: attendeeName }) : null, attendeeEmail !== undefined ? _jsx(Row, { k: "Email", v: attendeeEmail }) : null, _jsx(ConferenceLinkRow, { conferenceUrl: conferenceUrl, status: normalizedStatus }), _jsx("div", { className: "pt-2.5 mt-1 border-t border-dashed border-[rgba(31,21,48,0.12)]", children: _jsx(Row, { k: "Status", v: visibleStatus, goodVariant: statusGood }) })] }) }), children] }));
}
function Row({ k, v, goodVariant }) {
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: k }), _jsx("span", { className: (goodVariant ? "text-accent-mint" : "text-fg") + " text-right", children: v })] }));
}
function ConferenceLinkRow({ conferenceUrl, status }) {
    const url = (conferenceUrl ?? "").trim();
    if (url) {
        return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: "Meeting link" }), _jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "text-right text-fg underline break-all", children: url })] }));
    }
    const showPending = (status ?? "").toUpperCase() !== "CANCELLED";
    if (!showPending)
        return null;
    return (_jsxs("div", { className: "flex justify-between gap-3.5 font-mono text-body-sm", children: [_jsx("span", { className: "text-fg-faint uppercase tracking-widest text-eyebrow", children: "Meeting link" }), _jsx("span", { className: "text-right text-fg-dim", "aria-live": "polite", children: "Preparing meeting link\u2026" })] }));
}
