import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { GuestBookingActionPanel } from "@/pages/guest-booking/components/GuestBookingActionPanel";
import { useGuestBookingActions } from "@/modules/guest-booking/useGuestBookingActions";
import { clearGuestManageToken, loadGuestManageToken, saveGuestManageToken } from "@/modules/guest-booking/tokenStore";
import { PageShell } from "@/ui/layout";
import { useAuth } from "@/state/AuthContext";
import { Badge } from "@/ui/controls";
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
            if (import.meta.env.DEV) {
                console.debug("[guest-manage] resolved token context", {
                    bookingId,
                    source: tokenFromUrl ? "url" : "localStorage",
                    username: nextUsername,
                    eventTypeSlug: nextEventTypeSlug,
                });
            }
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
    const { canMutate, terminalState, cancelState, rescheduleState, banner, tokenProblem, minRescheduleDateTime, cancelBooking, rescheduleBooking, } = useGuestBookingActions(actionParams);
    const tokenMissing = (!token || !resolvedUsername || !resolvedEventTypeSlug) && terminalState === "ACTIVE";
    const actionsDisabled = terminalState !== "ACTIVE";
    return (_jsx(PageShell, { width: "comfort", children: _jsxs("main", { className: "mx-auto max-w-2xl rounded-3xl border border-border-subtle bg-surface p-5 shadow-soft md:p-8", "aria-label": "Manage booking", children: [_jsx(Link, { to: brandHref, className: "text-xs uppercase tracking-[0.16em] text-text-tertiary", children: "BunnyCal" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-text-primary", children: "Manage your booking" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "Use this secure page to cancel or reschedule your booking. Actions are retry-safe." }), tokenMissing && (_jsxs("div", { className: "mt-4 rounded-xl border border-danger-border bg-danger-surface p-4", children: [_jsx("p", { className: "text-sm font-medium text-danger-fg", children: "Missing management token" }), _jsx("p", { className: "mt-1 text-sm text-danger-fg", children: "Open this page from your confirmation email so token and booking context can be restored." })] })), tokenProblem && (_jsxs("div", { className: "mt-4 rounded-xl border border-danger-border bg-danger-surface p-4", role: "alert", children: [_jsx("p", { className: "text-sm font-medium text-danger-fg", children: tokenProblem.title }), _jsx("p", { className: "mt-1 text-sm text-danger-fg", children: tokenProblem.message })] })), terminalState === "CANCELLED" && (_jsx("div", { className: "mt-4 rounded-xl border border-success-border bg-success-surface p-4 text-sm text-success-fg", children: "Booking cancelled. This page is now read-only for this booking." })), terminalState === "RESCHEDULED" && (_jsx("div", { className: "mt-4 rounded-xl border border-success-border bg-success-surface p-4 text-sm text-success-fg", children: "Booking reschedule request submitted. This page is now read-only for this booking." })), _jsxs("div", { className: "mt-4 rounded-xl border border-border-subtle bg-surface-sunken p-4 text-sm text-text-secondary", children: [_jsx("div", { className: "mb-3", children: _jsx(Badge, { tone: "neutral", size: "sm", children: "Lifecycle context" }) }), _jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("span", { className: "font-medium text-text-primary", children: "Booking ID" }), _jsx("span", { className: "break-all", children: bookingId || "—" })] }), _jsxs("div", { className: "mt-1.5 flex justify-between gap-3", children: [_jsx("span", { className: "font-medium text-text-primary", children: "Event" }), _jsx("span", { className: "break-all", children: resolvedUsername && resolvedEventTypeSlug ? `@${resolvedUsername}/${resolvedEventTypeSlug}` : "Unavailable" })] })] }), banner && (_jsx("div", { className: `mt-4 rounded-xl border p-3 text-sm ${banner.tone === "good" ? "border-success-border bg-success-surface text-success-fg" : "border-danger-border bg-danger-surface text-danger-fg"}`, role: "status", "aria-live": "polite", children: banner.text })), _jsx(GuestBookingActionPanel, { canMutate: canMutate && !actionsDisabled, minRescheduleDateTime: minRescheduleDateTime, cancelPending: cancelState === "pending", reschedulePending: rescheduleState === "pending", onCancelConfirm: async () => {
                        await cancelBooking();
                    }, onRescheduleSubmit: async (nextStartAt) => {
                        await rescheduleBooking(nextStartAt);
                    } }), _jsx("div", { className: "mt-6 flex flex-wrap gap-2", children: resolvedUsername && resolvedEventTypeSlug && (_jsx(Link, { to: `/book/${resolvedUsername}/${resolvedEventTypeSlug}`, className: "focus-ring rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken", children: "Book another time" })) })] }) }));
}
