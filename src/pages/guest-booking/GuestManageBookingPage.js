import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import { GuestSlotPicker } from "@/pages/guest-booking/components/GuestSlotPicker";
import { useGuestBookingActions } from "@/modules/guest-booking/useGuestBookingActions";
import { useGuestBooking } from "@/modules/guest-booking/useGuestBooking";
import { clearGuestManageToken, loadGuestManageToken, saveGuestManageToken } from "@/modules/guest-booking/tokenStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useAuth } from "@/state/AuthContext";
import { PageShell } from "@/ui/layout";
import { Skeleton } from "@/ui/controls";
import { formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import "@/pages/booking/booking.css";
export function GuestManageBookingPage() {
    const { user } = useAuth();
    const brandHref = user ? "/dashboard" : "/";
    const { username, eventTypeSlug, bookingId } = useParams();
    const [search] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState("");
    const [resolvedUsername, setResolvedUsername] = useState("");
    const [resolvedEventTypeSlug, setResolvedEventTypeSlug] = useState("");
    useEffect(() => {
        if (!bookingId)
            return;
        const tokenFromUrl = search.get("token")?.trim() || "";
        const usernameFromUrl = search.get("u")?.trim() || "";
        const eventTypeSlugFromUrl = search.get("e")?.trim() || "";
        const stored = loadGuestManageToken(bookingId);
        const nextUsername = username || usernameFromUrl || stored?.username || "";
        const nextEventTypeSlug = eventTypeSlug || eventTypeSlugFromUrl || stored?.eventTypeSlug || "";
        const resolvedToken = tokenFromUrl || stored?.token || "";
        setResolvedUsername(nextUsername);
        setResolvedEventTypeSlug(nextEventTypeSlug);
        if (resolvedToken) {
            setToken(resolvedToken);
            saveGuestManageToken(bookingId, {
                token: resolvedToken,
                username: nextUsername || undefined,
                eventTypeSlug: nextEventTypeSlug || undefined,
                updatedAt: Date.now(),
            });
        }
        if (tokenFromUrl || usernameFromUrl || eventTypeSlugFromUrl) {
            navigate(location.pathname, { replace: true });
        }
    }, [bookingId, eventTypeSlug, location.pathname, navigate, search, username]);
    const actionParams = useMemo(() => {
        if (!resolvedUsername || !resolvedEventTypeSlug || !bookingId || !token)
            return null;
        return {
            username: resolvedUsername,
            eventTypeSlug: resolvedEventTypeSlug,
            bookingId,
            token,
            clearStoredToken: () => {
                clearGuestManageToken(bookingId);
                setToken("");
            },
        };
    }, [bookingId, resolvedEventTypeSlug, resolvedUsername, token]);
    const { canMutate, terminalState, cancelState, rescheduleState, banner, tokenProblem: actionTokenProblem, cancelBooking, rescheduleBooking, } = useGuestBookingActions(actionParams);
    const { booking, loading: bookingLoading, tokenProblem: loadTokenProblem, notFound, refresh: refreshBooking, } = useGuestBooking(actionParams);
    const tokenProblem = loadTokenProblem ?? actionTokenProblem;
    const isTerminal = terminalState !== "ACTIVE";
    const [view, setView] = useState("summary");
    const [pendingSlot, setPendingSlot] = useState(null);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    useEffect(() => {
        if (isTerminal) {
            refreshBooking();
            setView("summary");
            setPendingSlot(null);
        }
    }, [isTerminal, refreshBooking]);
    const tokenMissing = (!token || !resolvedUsername || !resolvedEventTypeSlug) && !isTerminal;
    const actionsDisabled = !canMutate || isTerminal;
    const tz = booking?.timezone ?? getBrowserTimeZone();
    const onConfirmReschedule = async () => {
        if (!pendingSlot)
            return;
        await rescheduleBooking(pendingSlot.start);
    };
    return (_jsxs(PageShell, { width: "full", className: "!px-0 !py-0", children: [_jsx("main", { className: "bk-wrap", "aria-label": "Manage your booking", children: _jsx("section", { className: "bk-main bk-main-confirmed", children: _jsxs("div", { className: "bm-wrap", children: [_jsxs("header", { className: "bk-success-header", children: [_jsxs(Link, { to: brandHref, className: "onb-brand bk-success-brand", children: [_jsx("div", { className: "bk-brand-mark", children: _jsx(BunnyMark, { size: 26 }) }), _jsx(BrandWordmark, { className: "onb-brand-name", style: { fontFamily: "var(--sans)", fontWeight: 600 } })] }), _jsxs("div", { className: "bk-success-header-actions", children: [_jsx("a", { href: "mailto:help@bunnycal.com", className: "bk-success-link", children: "Help" }), resolvedUsername && resolvedEventTypeSlug && (_jsx(Link, { className: "bk-success-link", to: `/book/${resolvedUsername}/${resolvedEventTypeSlug}`, children: "Book another time" }))] })] }), tokenMissing && (_jsxs("div", { className: "mt-4 rounded-xl border border-danger-border bg-danger-surface p-4", children: [_jsx("p", { className: "text-sm font-medium text-danger-fg", children: "Missing management token" }), _jsx("p", { className: "mt-1 text-sm text-danger-fg", children: "Open this page from your confirmation email so the link can be restored." })] })), tokenProblem && (_jsxs("div", { className: "mt-4 rounded-xl border border-danger-border bg-danger-surface p-4", role: "alert", children: [_jsx("p", { className: "text-sm font-medium text-danger-fg", children: tokenProblem.title }), _jsx("p", { className: "mt-1 text-sm text-danger-fg", children: tokenProblem.message })] })), notFound && !tokenProblem && (_jsxs("div", { className: "mt-4 rounded-xl border border-warning-border bg-warning-surface p-4", children: [_jsx("p", { className: "text-sm font-medium text-warning-fg", children: "Booking not found" }), _jsx("p", { className: "mt-1 text-sm text-warning-fg", children: "We could not find a booking with this ID. The link may be incorrect, or the booking may have been removed." })] })), banner && (_jsx("div", { className: `mt-4 rounded-xl border p-3 text-sm ${banner.tone === "good"
                                    ? "border-success-border bg-success-surface text-success-fg"
                                    : "border-danger-border bg-danger-surface text-danger-fg"}`, role: "status", "aria-live": "polite", children: banner.text })), _jsx("div", { className: "bk-content", children: !booking && bookingLoading && !tokenProblem && !notFound ? (_jsx(SummarySkeleton, {})) : isTerminal ? (_jsx(TerminalView, { terminalState: terminalState, booking: booking, resolvedUsername: resolvedUsername, resolvedEventTypeSlug: resolvedEventTypeSlug, brandHref: brandHref })) : view === "summary" && booking ? (_jsxs("div", { className: "bm-stack", children: [_jsxs("div", { className: "bm-hero", children: [_jsxs("section", { className: "bm-copy", children: [_jsxs("div", { className: "bk-success-pill", children: [_jsx("span", { className: "dot" }), " Manage booking"] }), _jsxs("h1", { className: "bk-success-title", children: ["Manage your ", _jsx("em", { children: "booking." })] }), _jsx("p", { className: "bk-success-copy", children: "Reschedule for a better fit or cancel if plans changed. Everything updates automatically across your calendars." }), _jsxs("div", { className: "bm-reassure", children: [_jsxs("div", { children: [_jsx("strong", { children: "Safe & secure" }), _jsx("span", { children: "Your data is private" })] }), _jsxs("div", { children: [_jsx("strong", { children: "Auto updates" }), _jsx("span", { children: "Calendars stay in sync" })] }), _jsxs("div", { children: [_jsx("strong", { children: "Host notified" }), _jsx("span", { children: "Instantly via email" })] })] })] }), _jsxs("article", { className: "bk-success-summary bm-summary", children: [_jsxs("div", { className: "bm-summary-top", children: [_jsxs("div", { className: "bk-success-summary-host", children: [_jsx("div", { className: "bk-host-avatar", children: (booking.attendeeName?.trim()?.[0] || "G").toUpperCase() }), _jsxs("div", { children: [_jsx("strong", { children: booking.attendeeName || booking.hostName || "Guest" }), _jsx("div", { children: booking.hostName ? `Independent strategist · ${booking.hostName}` : "Managed by BunnyCal" })] })] }), _jsxs("div", { className: "bk-success-pill", children: [_jsx("span", { className: "dot" }), " Confirmed"] })] }), _jsxs("h2", { children: [booking.eventTitle, " \u00B7 ", _jsxs("em", { children: [booking.durationMinutes, " min"] })] }), _jsxs("div", { className: "bm-grid", children: [_jsx(InfoItem, { k: "When", v: formatMeetingDateTime(booking.startTime) }), _jsx(InfoItem, { k: "Where", v: "Custom", sub: booking.timezone ?? tz }), _jsx(InfoItem, { k: "You (attendee)", v: booking.attendeeName || "Guest", sub: booking.attendeeEmail || "" }), _jsx(InfoItem, { k: "Meeting link", v: booking.hostName || "Host", sub: booking.conferenceUrl?.trim() || "Preparing meeting link..." }), _jsx(InfoItem, { k: "Booking ID", v: booking.bookingId }), _jsx(InfoItem, { k: "Status", v: String(booking.status ?? "CONFIRMED").toUpperCase() })] })] })] }), _jsxs("section", { className: "bm-actions", children: [_jsxs("div", { children: [_jsx("h3", { children: "Take action" }), _jsx("p", { children: "Choose what you'd like to do." })] }), _jsxs("div", { className: "bm-actions-cta", children: [_jsx("button", { type: "button", onClick: () => {
                                                                setPendingSlot(null);
                                                                setView("reschedule");
                                                            }, disabled: actionsDisabled, className: "bk-success-cta bk-success-cta-primary", children: "Reschedule booking" }), _jsx("button", { type: "button", onClick: () => setConfirmCancelOpen(true), disabled: actionsDisabled, className: "bk-success-cta", children: "Cancel booking" })] })] }), _jsxs("section", { className: "bm-footer-note", children: [_jsxs("div", { children: [_jsx("strong", { children: "Changes are easy." }), _jsx("p", { children: "Your host will be notified automatically." })] }), _jsxs("a", { href: "mailto:help@bunnycal.com", children: ["Need help? ", _jsx("span", { children: "Contact support" })] })] })] })) : view === "reschedule" && booking ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("button", { type: "button", onClick: () => {
                                                        setPendingSlot(null);
                                                        setView("summary");
                                                    }, className: "focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body-sm text-text-secondary hover:bg-surface-sunken", children: [_jsx("span", { "aria-hidden": true, children: "\u2190" }), " Back to your booking"] }), _jsxs("span", { className: "text-body-sm text-text-tertiary", children: ["Currently scheduled \u00B7", " ", _jsx("strong", { className: "text-text-primary", children: formatMeetingDateTime(booking.startTime) })] })] }), _jsx(GuestSlotPicker, { username: resolvedUsername, eventTypeSlug: resolvedEventTypeSlug, today: new Date(), durationMinutes: booking.durationMinutes, selectedSlot: pendingSlot, onSelectSlot: setPendingSlot, onContinue: () => setView("review"), continueLabel: "Review new time" })] })) : view === "review" && booking && pendingSlot ? (_jsxs(Card, { padding: "lg", children: [_jsx("h2", { className: "text-h2 font-medium text-text-primary", children: "Confirm new time" }), _jsxs("div", { className: "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "rounded-xl border border-border-subtle bg-surface-sunken p-4", children: [_jsx("div", { className: "text-eyebrow uppercase tracking-widest text-text-tertiary", children: "Currently" }), _jsx("div", { className: "mt-2 font-mono text-body-sm text-text-secondary line-through", children: formatMeetingDateTime(booking.startTime) })] }), _jsxs("div", { className: "rounded-xl border border-success-border bg-success-surface p-4", children: [_jsx("div", { className: "text-eyebrow uppercase tracking-widest text-success-fg", children: "New time" }), _jsx("div", { className: "mt-2 font-mono text-body-sm text-success-fg", children: formatMeetingDateTime(pendingSlot.start) })] })] }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-3", children: [_jsx(Button, { onClick: onConfirmReschedule, disabled: rescheduleState === "pending" || actionsDisabled, children: rescheduleState === "pending" ? "Confirming..." : "Confirm reschedule" }), _jsx(Button, { variant: "ghost", onClick: () => setView("reschedule"), disabled: rescheduleState === "pending", children: "Back" })] })] })) : !booking && !bookingLoading ? (_jsx(Card, { padding: "lg", children: _jsx("p", { className: "text-sm text-text-secondary", children: "Booking details are unavailable right now. If you still need to cancel or reschedule, request a fresh management link from your confirmation email." }) })) : null })] }) }) }), _jsx(ConfirmDialog, { open: confirmCancelOpen, tone: "danger", pending: cancelState === "pending", title: "Cancel this booking?", description: "This will notify your host and free up the slot. This action can't be undone.", confirmLabel: "Yes, cancel booking", cancelLabel: "Keep booking", onCancel: () => setConfirmCancelOpen(false), onConfirm: async () => {
                    await cancelBooking();
                    setConfirmCancelOpen(false);
                } })] }));
}
function InfoItem({ k, v, sub }) {
    return (_jsxs("div", { className: "bm-item", children: [_jsx("span", { children: k }), _jsx("strong", { children: v }), sub ? _jsx("p", { children: sub }) : null] }));
}
function SummarySkeleton() {
    return (_jsxs(Card, { padding: "lg", className: "bk-confirmed-card", children: [_jsxs("div", { className: "bk-confirmed-top", children: [_jsx(Skeleton, { variant: "block", className: "h-[58px] w-[58px] rounded-[18px]", ariaLabel: "Loading booking" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Skeleton, { variant: "block", className: "h-7 w-2/3 rounded" }), _jsx(Skeleton, { variant: "block", className: "h-4 w-full rounded" })] })] }), _jsx("div", { className: "bk-confirmed-grid", children: _jsx("div", { className: "bk-confirmed-panel bk-confirmed-panel-full space-y-2.5", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { variant: "block", className: "h-4 w-full rounded" }, i))) }) })] }));
}
function TerminalView({ terminalState, booking, resolvedUsername, resolvedEventTypeSlug, brandHref }) {
    const cancelled = terminalState === "CANCELLED";
    const iconStyle = cancelled
        ? {
            background: "linear-gradient(160deg, rgba(252, 226, 226, 0.9), rgba(245, 214, 214, 0.9))",
            color: "#7a1e1e",
        }
        : undefined;
    const title = cancelled ? "Booking cancelled." : "Booking moved.";
    const subtitle = cancelled
        ? "We've notified your host. You can book another time below whenever you're ready."
        : "Your booking is updated. The new time is on your host's calendar.";
    if (!booking) {
        return (_jsxs(Card, { padding: "lg", className: "bk-confirmed-card", children: [_jsxs("div", { className: "bk-confirmed-top", children: [_jsx("div", { className: "bk-confirmed-icon", style: iconStyle, children: cancelled ? "✕" : "✓" }), _jsxs("div", { children: [_jsx("h2", { className: "bk-confirmed-title", children: title }), _jsx("p", { className: "bk-confirmed-sub", children: subtitle })] })] }), _jsxs("div", { className: "bk-confirmed-actions", children: [resolvedUsername && resolvedEventTypeSlug && (_jsx(Link, { to: `/book/${resolvedUsername}/${resolvedEventTypeSlug}`, className: "bk-confirmed-btn bk-confirmed-btn-primary", children: "Book another time" })), _jsx(Link, { to: brandHref, className: "bk-confirmed-btn", children: "Go to BunnyCal" })] })] }));
    }
    return (_jsx(BookingSummaryCard, { bookingId: booking.bookingId, eventName: booking.eventTitle, hostName: booking.hostName, startTime: booking.startTime, durationMinutes: booking.durationMinutes, timezone: booking.timezone ?? undefined, attendeeName: booking.attendeeName, attendeeEmail: booking.attendeeEmail, conferenceUrl: booking.conferenceUrl, status: cancelled ? "CANCELLED" : booking.status, statusLabel: cancelled ? "CANCELLED" : "RESCHEDULED", header: _jsxs("div", { className: "bk-confirmed-top", children: [_jsx("div", { className: "bk-confirmed-icon", style: iconStyle, children: cancelled ? "✕" : "✓" }), _jsxs("div", { children: [_jsx("h2", { className: "bk-confirmed-title", children: title }), _jsx("p", { className: "bk-confirmed-sub", children: subtitle })] })] }), children: _jsxs("div", { className: "bk-confirmed-actions", children: [resolvedUsername && resolvedEventTypeSlug && (_jsx(Link, { to: `/book/${resolvedUsername}/${resolvedEventTypeSlug}`, className: "bk-confirmed-btn bk-confirmed-btn-primary", children: "Book another time" })), _jsx(Link, { to: brandHref, className: "bk-confirmed-btn", children: "Go to BunnyCal" })] }) }));
}
