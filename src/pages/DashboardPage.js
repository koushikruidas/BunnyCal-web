import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
import clsx from "@/lib/clsx";
import { Button, Dialog } from "@/ui/controls";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { BookingLifecycleStatus } from "@/constants/bookingStatus";
import { buildInvitationActions, getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import { useIntegrationState } from "@/state/IntegrationContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { opsLogger } from "@/lib/opsLogger";
import "./dashboard/dashboard.css";
// ── Icons ─────────────────────────────────────────────────────────────────────
function MeetingsIcon() {
    return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "1", y: "3", width: "14", height: "12", rx: "2" }), _jsx("path", { d: "M1 7h14M5 1v4M11 1v4" })] }));
}
function AvailabilityIcon() {
    return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "8", cy: "8", r: "6" }), _jsx("path", { d: "M8 5v3l2 2" })] }));
}
function EventTypesIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", children: _jsx("path", { d: "M2 4h12M2 8h8M2 12h5" }) }));
}
function IntegrationsIcon() {
    return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "4", cy: "8", r: "2.5" }), _jsx("circle", { cx: "12", cy: "4", r: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2" }), _jsx("path", { d: "M6.5 8h3.5M9.5 4l-3.5 3M9.5 12l-3.5-3" })] }));
}
function SettingsIcon() {
    return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "8", cy: "8", r: "2" }), _jsx("path", { d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" })] }));
}
// ── Nav link ──────────────────────────────────────────────────────────────────
function SidebarLink({ to, active, icon, children, count }) {
    return (_jsxs(Link, { to: to, "aria-current": active ? "page" : undefined, className: clsx("side-link", active && "active"), children: [icon ? _jsx("span", { className: "icon", "aria-hidden": "true", children: icon }) : null, _jsx("span", { children: children }), count != null && _jsx("span", { className: "count", children: count })] }));
}
// ── Constants ──────────────────────────────────────────────────────────────────
const MEETINGS_LIMIT = 50;
const MEETINGS_POLL_MS = 15000;
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const HIDDEN_KEY_PREFIX = "dashboard-hidden-meeting-ids";
function randomKey() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function formatWindow(startTime, endTime) {
    return formatMeetingDateAndTimeRange(startTime, endTime);
}
function formatRelativeDay(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const that = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const diff = Math.round((that.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0)
        return "Today";
    if (diff === 1)
        return "Tomorrow";
    if (diff < 0)
        return "Past";
    return `In ${diff} days`;
}
function humanDate(date, tz) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: tz,
    });
}
function to12h(hhmm) {
    if (!hhmm)
        return "";
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m))
        return hhmm;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function isAvailableOverride(ovr) {
    if (typeof ovr.available === "boolean")
        return ovr.available;
    if (typeof ovr.isAvailable === "boolean")
        return ovr.isAvailable;
    opsLogger.warn({
        category: "api_contract_mismatch",
        message: "Availability override missing availability flag",
        details: { overrideId: ovr.id },
    });
    return false;
}
function HiddenIdsStorageKey(userId) {
    return `${HIDDEN_KEY_PREFIX}:${userId}`;
}
export function DashboardPage() {
    const { user, refreshUser, logout, logoutLoading } = useAuth();
    const brandHref = user ? "/dashboard" : "/";
    const location = useLocation();
    const path = location.pathname;
    const section = path === "/dashboard/event-types"
        ? "event-types"
        : path === "/dashboard/availability"
            ? "availability"
            : path === "/dashboard/integrations"
                ? "integrations"
                : path === "/dashboard/settings"
                    ? "settings"
                    : "meetings";
    const [eventsLoading, setEventsLoading] = useState(true);
    const [meetingsLoading, setMeetingsLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [eventsError, setEventsError] = useState(null);
    const [meetingsError, setMeetingsError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [meetingTab, setMeetingTab] = useState("upcoming");
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [hiddenMeetingIds, setHiddenMeetingIds] = useState([]);
    const [cancellingMeetingId, setCancellingMeetingId] = useState(null);
    const [hostActionError, setHostActionError] = useState(null);
    const [cancelTargetMeeting, setCancelTargetMeeting] = useState(null);
    const [disconnectTarget, setDisconnectTarget] = useState(null);
    const lifecycleRenderedRef = useRef(new Set());
    const lifecycleMismatchRef = useRef(new Set());
    const [weeklyRules, setWeeklyRules] = useState({
        MONDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
        TUESDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
        WEDNESDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
        THURSDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
        FRIDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
        SATURDAY: { enabled: false, startTime: "09:00", endTime: "17:00" },
        SUNDAY: { enabled: false, startTime: "09:00", endTime: "17:00" },
    });
    const [availabilitySaving, setAvailabilitySaving] = useState(false);
    const [availabilityError, setAvailabilityError] = useState(null);
    const [loadingOverrides, setLoadingOverrides] = useState(true);
    const [submittingOverride, setSubmittingOverride] = useState(false);
    const [overrides, setOverrides] = useState([]);
    const [overridePanelOpen, setOverridePanelOpen] = useState(false);
    const [overrideMode, setOverrideMode] = useState("UNAVAILABLE");
    const [overrideDate, setOverrideDate] = useState("");
    const [overrideStartTime, setOverrideStartTime] = useState("09:00");
    const [overrideEndTime, setOverrideEndTime] = useState("13:00");
    const { loading: integrationsLoading, error: integrationsError, banner, clearBanner, getCalendarProviderStatus, getConferencingProviderStatus, getProviderCalendars, startConnect, disconnectProvider, pendingAction, refreshStatus, } = useIntegrationState();
    const timezone = getBrowserTimeZone();
    useEffect(() => {
        if (!user?.id)
            return;
        try {
            const raw = localStorage.getItem(HiddenIdsStorageKey(user.id));
            setHiddenMeetingIds(raw ? JSON.parse(raw) : []);
        }
        catch {
            setHiddenMeetingIds([]);
        }
    }, [user?.id]);
    useEffect(() => {
        if (!user?.id)
            return;
        localStorage.setItem(HiddenIdsStorageKey(user.id), JSON.stringify(hiddenMeetingIds));
    }, [hiddenMeetingIds, user?.id]);
    const loadMeetings = useCallback(async (hostId) => {
        try {
            const meetingList = await api.listHostMeetings(hostId, { upcomingOnly: false, limit: MEETINGS_LIMIT });
            setMeetings(meetingList);
            setMeetingsError(null);
        }
        catch (e) {
            console.error(e);
            setMeetingsError("Failed to load meetings.");
            setMeetings([]);
        }
        finally {
            setMeetingsLoading(false);
        }
    }, []);
    const loadEventTypes = useCallback(async () => {
        setEventsLoading(true);
        setEventsError(null);
        try {
            const eventTypes = await api.listEventTypes();
            setEvents(eventTypes);
        }
        catch (e) {
            console.error(e);
            setEventsError("Failed to load event type configuration.");
            setEvents([]);
        }
        finally {
            setEventsLoading(false);
        }
    }, []);
    const loadOverrides = useCallback(async () => {
        setLoadingOverrides(true);
        setAvailabilityError(null);
        try {
            const list = await api.getAvailabilityOverrides();
            setOverrides(list.sort((a, b) => a.date.localeCompare(b.date)));
        }
        catch (e) {
            console.error(e);
            setAvailabilityError("Unable to load date overrides.");
        }
        finally {
            setLoadingOverrides(false);
        }
    }, []);
    useEffect(() => {
        refreshUser().catch(() => {
            // Protected route already handles missing auth.
        });
        if (!user?.id)
            return;
        setMeetingsLoading(true);
        setMeetingsError(null);
        void loadEventTypes();
        void loadMeetings(user.id);
        void loadOverrides();
    }, [loadEventTypes, loadMeetings, loadOverrides, refreshUser, user?.id]);
    useEffect(() => {
        if (!user?.id)
            return;
        const intervalId = window.setInterval(() => {
            void loadMeetings(user.id);
        }, MEETINGS_POLL_MS);
        const onVisibilityOrFocus = () => {
            if (!document.hidden) {
                void loadMeetings(user.id);
            }
        };
        window.addEventListener("focus", onVisibilityOrFocus);
        document.addEventListener("visibilitychange", onVisibilityOrFocus);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", onVisibilityOrFocus);
            document.removeEventListener("visibilitychange", onVisibilityOrFocus);
        };
    }, [loadMeetings, user?.id]);
    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
    };
    const firstName = useMemo(() => {
        const source = user?.name || user?.username || user?.email || "there";
        return source.split(" ")[0];
    }, [user]);
    const bookingUrl = (event) => {
        if (event.link)
            return toAbsoluteUrl(event.link);
        const username = user?.username || "";
        return toAbsoluteUrl(toPublicBookingPath(username, event.slug));
    };
    const visibleMeetings = useMemo(() => meetings.filter((meeting) => !hiddenMeetingIds.includes(meeting.bookingId)), [meetings, hiddenMeetingIds]);
    const isTerminalExternalDelete = (meeting) => {
        return (meeting.externalLifecycleState ?? "").trim().toUpperCase() === "TERMINAL_EXTERNAL_DELETE";
    };
    const operationalBookingStatus = (meeting) => {
        return isTerminalExternalDelete(meeting) ? BookingLifecycleStatus.CANCELLED : meeting.bookingStatus;
    };
    const meetingBuckets = useMemo(() => {
        const now = Date.now();
        const cancelled = visibleMeetings.filter((m) => operationalBookingStatus(m) === BookingLifecycleStatus.CANCELLED);
        const upcoming = visibleMeetings.filter((m) => {
            const status = operationalBookingStatus(m);
            if (status === BookingLifecycleStatus.CANCELLED || status === BookingLifecycleStatus.EXPIRED)
                return false;
            return new Date(m.endTime).getTime() >= now;
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const past = visibleMeetings.filter((m) => {
            const status = operationalBookingStatus(m);
            if (status === BookingLifecycleStatus.CANCELLED)
                return false;
            return new Date(m.endTime).getTime() < now || status === BookingLifecycleStatus.EXPIRED;
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        return { upcoming, past, cancelled };
    }, [visibleMeetings]);
    const displayedMeetings = meetingTab === "upcoming"
        ? meetingBuckets.upcoming
        : meetingTab === "past"
            ? meetingBuckets.past
            : meetingBuckets.cancelled;
    const nextMeeting = meetingBuckets.upcoming[0] ?? null;
    const todayCount = meetingBuckets.upcoming.filter((m) => formatRelativeDay(m.startTime) === "Today").length;
    const googleCalendarStatus = getCalendarProviderStatus("google");
    const zoomConferencingStatus = getConferencingProviderStatus("zoom");
    const googleCalendars = getProviderCalendars("google");
    const connectedProviderCount = (googleCalendarStatus === "connected" ? 1 : 0) +
        (zoomConferencingStatus === "connected" ? 1 : 0);
    const hideMeeting = (bookingId) => {
        setHiddenMeetingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
        if (selectedMeeting?.bookingId === bookingId)
            setSelectedMeeting(null);
    };
    const cancelMeetingAsHost = async (meeting) => {
        if (cancellingMeetingId)
            return;
        setHostActionError(null);
        setCancellingMeetingId(meeting.bookingId);
        try {
            await api.cancelHostBooking(meeting.bookingId, randomKey());
            setMeetings((prev) => prev.map((item) => (item.bookingId === meeting.bookingId ? { ...item, bookingStatus: BookingLifecycleStatus.CANCELLED } : item)));
            setSelectedMeeting((prev) => (prev && prev.bookingId === meeting.bookingId ? { ...prev, bookingStatus: BookingLifecycleStatus.CANCELLED } : prev));
        }
        catch (e) {
            console.error(e);
            setHostActionError("Unable to cancel meeting right now. Please retry.");
        }
        finally {
            setCancellingMeetingId(null);
        }
    };
    const clearHiddenMeetings = () => setHiddenMeetingIds([]);
    const dashboardReturnPath = `${location.pathname}${location.search}${location.hash}`;
    const connectCalendar = async (provider) => {
        await startConnect("calendar", provider, dashboardReturnPath);
    };
    const connectConferencing = async (provider) => {
        await startConnect("conferencing", provider, dashboardReturnPath);
    };
    const overrideValidationMessage = useMemo(() => {
        if (!overrideDate)
            return "Choose a date.";
        if (overrideMode === "CUSTOM_HOURS") {
            if (!overrideStartTime || !overrideEndTime)
                return "Select start and end time.";
            if (overrideEndTime <= overrideStartTime)
                return "End must be later than start.";
        }
        return null;
    }, [overrideDate, overrideEndTime, overrideMode, overrideStartTime]);
    const saveWeeklyAvailability = async () => {
        setAvailabilitySaving(true);
        setAvailabilityError(null);
        try {
            const rules = DAYS.filter((day) => weeklyRules[day].enabled).map((day) => ({
                dayOfWeek: day,
                startTime: weeklyRules[day].startTime,
                endTime: weeklyRules[day].endTime,
            }));
            await api.upsertAvailabilityRules({ rules });
        }
        catch (e) {
            console.error(e);
            setAvailabilityError("Unable to save weekly availability.");
        }
        finally {
            setAvailabilitySaving(false);
        }
    };
    const createOverride = async () => {
        if (overrideValidationMessage)
            return;
        setSubmittingOverride(true);
        setAvailabilityError(null);
        const payload = overrideMode === "UNAVAILABLE"
            ? { date: overrideDate, available: false, isAvailable: false }
            : { date: overrideDate, available: true, isAvailable: true, startTime: overrideStartTime, endTime: overrideEndTime };
        try {
            const created = await api.createAvailabilityOverride(payload);
            setOverrides((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
            setOverridePanelOpen(false);
            setOverrideDate("");
            setOverrideStartTime("09:00");
            setOverrideEndTime("13:00");
            setOverrideMode("UNAVAILABLE");
        }
        catch (e) {
            console.error(e);
            setAvailabilityError("Unable to create override.");
        }
        finally {
            setSubmittingOverride(false);
        }
    };
    const removeOverride = async (id) => {
        const snapshot = overrides;
        setOverrides((prev) => prev.filter((x) => x.id !== id));
        try {
            await api.deleteAvailabilityOverride(id);
        }
        catch (e) {
            console.error(e);
            setOverrides(snapshot);
            setAvailabilityError("Unable to remove override.");
        }
    };
    return (_jsxs("div", { className: "dash-root", children: [_jsxs("div", { className: "dash", children: [_jsxs("aside", { className: "dash-side", "aria-label": "Workspace navigation", children: [_jsxs(Link, { to: brandHref, className: "dash-side-brand", children: [_jsx("div", { style: {
                                            width: 45, height: 45, borderRadius: 13, flexShrink: 0,
                                            background: "linear-gradient(150deg, var(--lilac-soft), var(--peach-soft))",
                                            border: "1px solid var(--border)",
                                            display: "grid", placeItems: "center",
                                        }, children: _jsx(BunnyMark, { size: 26 }) }), _jsxs("div", { className: "dash-side-brand-text", children: [_jsx("span", { className: "dash-side-brand-name", children: _jsx(BrandWordmark, { style: { fontFamily: "var(--sans)", fontWeight: 600 } }) }), _jsx("span", { className: "dash-side-brand-sub", children: "Host workspace" })] })] }), _jsx("div", { className: "side-section-label", children: "Workspace" }), _jsx(SidebarLink, { to: "/dashboard", active: path === "/dashboard", icon: _jsx(MeetingsIcon, {}), count: meetingBuckets.upcoming.length || undefined, children: "Meetings" }), _jsx(SidebarLink, { to: "/dashboard/availability", active: path === "/dashboard/availability", icon: _jsx(AvailabilityIcon, {}), children: "Availability" }), _jsx("div", { className: "side-section-label", children: "Configuration" }), _jsx(SidebarLink, { to: "/dashboard/event-types", active: path === "/dashboard/event-types", icon: _jsx(EventTypesIcon, {}), count: events.length || undefined, children: "Event Types" }), _jsx(SidebarLink, { to: "/dashboard/integrations", active: path === "/dashboard/integrations", icon: _jsx(IntegrationsIcon, {}), children: "Integrations" }), _jsx(SidebarLink, { to: "/dashboard/settings", active: path === "/dashboard/settings", icon: _jsx(SettingsIcon, {}), children: "Settings" }), _jsx("div", { className: "dash-side-foot", children: _jsxs("div", { style: { position: "relative" }, children: [_jsxs("div", { className: "dash-user", role: "button", tabIndex: 0, onClick: () => setMenuOpen((p) => !p), onKeyDown: (e) => e.key === "Enter" && setMenuOpen((p) => !p), "aria-expanded": menuOpen, "aria-haspopup": "menu", children: [_jsx("div", { className: "av", children: (user?.name || user?.email || "U")[0]?.toUpperCase() }), _jsxs("div", { className: "dash-user-meta", children: [_jsx("span", { className: "name", children: user?.name || user?.email || "User" }), _jsxs("span", { className: "handle", children: ["@", user?.username || "host"] })] })] }), menuOpen && (_jsxs("div", { role: "menu", className: "dash-user-menu", children: [_jsx("button", { type: "button", role: "menuitem", className: "dash-menu-item", onClick: () => setMenuOpen(false), children: "Profile" }), _jsx("button", { type: "button", role: "menuitem", className: "dash-menu-item", onClick: () => setMenuOpen(false), children: "Settings" }), _jsx("button", { type: "button", role: "menuitem", className: "dash-menu-item danger", onClick: handleLogout, disabled: logoutLoading, children: logoutLoading ? "Signing out…" : "Logout" })] }))] }) })] }), _jsxs("main", { className: "dash-main", children: [_jsxs("header", { className: "dash-top", children: [_jsx("div", { children: _jsxs("h1", { children: [section === "meetings" && (_jsxs(_Fragment, { children: ["Good to see you, ", _jsxs("em", { children: [firstName, "."] })] })), section === "availability" && (_jsxs(_Fragment, { children: ["Your ", _jsx("em", { children: "availability." })] })), section === "event-types" && (_jsxs(_Fragment, { children: ["Event ", _jsx("em", { children: "templates." })] })), section === "integrations" && (_jsxs(_Fragment, { children: ["Connected ", _jsx("em", { children: "integrations." })] })), section === "settings" && (_jsxs(_Fragment, { children: [_jsx("em", { children: "Workspace" }), " settings."] }))] }) }), _jsx("div", { className: "dash-top-actions", children: _jsxs(Link, { to: "/onboarding/event", className: "dash-btn-primary", children: [_jsx("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", "aria-hidden": "true", children: _jsx("path", { d: "M8 3v10M3 8h10" }) }), "New event"] }) })] }), section === "meetings" && (_jsxs(_Fragment, { children: [_jsx("div", { className: "dash-section", children: _jsxs("div", { className: "next-grid", children: [_jsx("div", { className: "next-card", children: nextMeeting ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Next up" }), _jsx("div", { className: "countdown", children: formatRelativeDay(nextMeeting.startTime) }), _jsxs("div", { className: "next-card-date-line", children: [new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), _jsx("span", { style: { color: "var(--plum-300)" }, children: "\u00B7" }), formatWindow(nextMeeting.startTime, nextMeeting.endTime).time] }), _jsxs("div", { className: "who", style: { marginTop: 18 }, children: [_jsx("div", { className: "av", children: (nextMeeting.guestName || "G")[0]?.toUpperCase() }), _jsxs("div", { children: [_jsx("div", { className: "name", children: nextMeeting.guestName }), _jsx("div", { className: "meta", children: nextMeeting.eventTypeName })] })] })] }), _jsxs("div", { className: "next-meta-row", children: [_jsxs("span", { className: "meta-pill", children: [_jsx("span", { className: "dot" }), nextMeeting.bookingStatus] }), _jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em", color: "var(--plum-500)", textTransform: "none" }, children: nextMeeting.guestEmail }), _jsx("button", { className: "dash-btn-secondary", style: { marginLeft: "auto", fontSize: 12.5, padding: "5px 14px" }, onClick: () => setSelectedMeeting(nextMeeting), children: "Details" })] })] })) : (_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Next up" }), _jsx("div", { className: "countdown", style: { marginTop: 10 }, children: "All clear." }), _jsx("div", { style: { fontSize: 14, color: "var(--plum-500)", marginTop: 10 }, children: "No upcoming meetings scheduled." })] })) }), _jsxs("div", { className: "stats-col", children: [_jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Today" }), _jsx("div", { className: "value", children: todayCount }), _jsx("div", { className: "hint", children: "meetings scheduled" })] }), _jsx("div", { className: "tint", style: { background: "var(--lilac-soft)" } })] }), _jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Upcoming" }), _jsx("div", { className: "value", children: meetingBuckets.upcoming.length }), _jsx("div", { className: "hint", children: "total confirmed" })] }), _jsx("div", { className: "tint", style: { background: "var(--peach-soft)" } })] }), _jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Hidden" }), _jsx("div", { className: "value", children: hiddenMeetingIds.length }), hiddenMeetingIds.length > 0 ? (_jsx("button", { onClick: clearHiddenMeetings, style: { fontSize: 12, color: "var(--plum-500)", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--sans)" }, children: "Restore" })) : (_jsx("div", { className: "hint", children: "archived meetings" }))] }), _jsx("div", { className: "tint", style: { background: "var(--butter-soft)" } })] })] })] }) }), _jsxs("div", { className: "dash-status-bar", children: [_jsxs("span", { className: clsx("dbadge", events.length > 0 ? "ok" : "hold"), children: [_jsx("span", { className: "dot" }), events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types"] }), _jsxs("span", { className: clsx("dbadge", connectedProviderCount > 0 ? "synced" : "hold"), children: [_jsx("span", { className: "dot" }), connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} active` : "No integrations connected"] })] }), _jsxs("div", { className: "dash-section", children: [_jsxs("div", { className: "dash-section-head", children: [_jsx("div", { children: _jsxs("h2", { children: ["Your ", _jsx("em", { children: "meetings" })] }) }), _jsxs("div", { className: "dash-tabs", children: [_jsxs("button", { className: clsx("dash-tab", meetingTab === "upcoming" && "active"), onClick: () => setMeetingTab("upcoming"), children: ["Upcoming (", meetingBuckets.upcoming.length, ")"] }), _jsxs("button", { className: clsx("dash-tab", meetingTab === "past" && "active"), onClick: () => setMeetingTab("past"), children: ["Past (", meetingBuckets.past.length, ")"] }), _jsxs("button", { className: clsx("dash-tab", meetingTab === "cancelled" && "active"), onClick: () => setMeetingTab("cancelled"), children: ["Cancelled (", meetingBuckets.cancelled.length, ")"] })] })] }), meetingsError && (_jsxs("div", { className: "dash-alert error", children: [_jsx("span", { children: meetingsError }), user?.id && (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, onClick: () => void loadMeetings(user.id), children: "Retry" }))] })), meetingsLoading ? (_jsx("div", { children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "dash-skel", style: { height: 88, marginBottom: 12 } }, i))) })) : displayedMeetings.length === 0 ? (_jsxs("div", { className: "dash-empty", children: [_jsxs("h3", { children: ["No ", meetingTab, " meetings"] }), _jsx("p", { children: "This view is clear right now." })] })) : (_jsx("div", { className: "meet-list", children: displayedMeetings.map((meeting) => {
                                                    const when = formatWindow(meeting.startTime, meeting.endTime);
                                                    const dayTone = formatRelativeDay(meeting.startTime);
                                                    const sync = getSyncState({ provider: meeting.provider, calendarSyncStatus: meeting.calendarSyncStatus });
                                                    const lifecycle = getLifecycleState({
                                                        externalLifecycleState: meeting.externalLifecycleState,
                                                        externalLifecycleReason: meeting.externalLifecycleReason,
                                                        reconcileSuppressed: meeting.reconcileSuppressed,
                                                        actionRequired: meeting.actionRequired,
                                                    });
                                                    const terminalExternalDelete = lifecycle?.kind === "TERMINAL_EXTERNAL_DELETE";
                                                    const opStatus = operationalBookingStatus(meeting);
                                                    const actions = buildInvitationActions({ provider: meeting.provider, providerEventUrl: meeting.providerEventUrl, conferenceUrl: meeting.conferenceUrl });
                                                    if (lifecycle) {
                                                        const lifecycleLogKey = `${meeting.bookingId}:${lifecycle.kind}:host-list`;
                                                        if (!lifecycleRenderedRef.current.has(lifecycleLogKey)) {
                                                            lifecycleRenderedRef.current.add(lifecycleLogKey);
                                                            opsLogger.warn({
                                                                category: lifecycle.kind === "PROVIDER_DISCONNECTED" ? "provider_disconnect_lifecycle_visible" : "external_lifecycle_rendered",
                                                                message: "External lifecycle state rendered in host meeting list",
                                                                details: { view: "host-list", state: lifecycle.kind, bookingStatus: meeting.bookingStatus },
                                                            });
                                                        }
                                                        const isMismatch = lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && meeting.bookingStatus !== BookingLifecycleStatus.CANCELLED;
                                                        if (isMismatch) {
                                                            const mismatchKey = `${meeting.bookingId}:${lifecycle.kind}:host-list`;
                                                            if (!lifecycleMismatchRef.current.has(mismatchKey)) {
                                                                lifecycleMismatchRef.current.add(mismatchKey);
                                                                opsLogger.warn({
                                                                    category: "lifecycle_mismatch_rendered",
                                                                    message: "External lifecycle mismatch rendered in host meeting list",
                                                                    details: { view: "host-list", state: lifecycle.kind, bookingStatus: meeting.bookingStatus },
                                                                });
                                                            }
                                                        }
                                                    }
                                                    return (_jsxs("div", { className: "meet-row", style: terminalExternalDelete ? { borderLeft: "3px solid var(--blush)" } : undefined, children: [_jsxs("div", { className: "when", children: [_jsx("span", { className: "rel", children: dayTone }), _jsx("span", { className: "day", children: new Date(meeting.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }), _jsx("span", { className: "time", children: when.time })] }), _jsxs("div", { className: "who", children: [_jsxs("span", { className: "name", children: [meeting.guestName, " \u00B7 ", meeting.eventTypeName] }), _jsx("span", { className: "ev", children: meeting.guestEmail }), lifecycle && (_jsx("span", { className: "ev", style: { fontSize: 12, color: terminalExternalDelete ? "#991B1B" : "var(--plum-400)" }, children: lifecycle.detail }))] }), _jsxs("div", { className: "badges", children: [_jsxs("span", { className: clsx("dbadge", opStatus === BookingLifecycleStatus.CONFIRMED && "ok", opStatus === BookingLifecycleStatus.PENDING && "hold", opStatus === BookingLifecycleStatus.CANCELLED && "danger"), children: [_jsx("span", { className: "dot" }), terminalExternalDelete ? `Local: ${meeting.bookingStatus}` : opStatus] }), !terminalExternalDelete && (_jsxs("span", { className: clsx("dbadge", sync.tone === "good" && "synced", sync.tone === "warn" && "hold", sync.tone === "bad" && "danger"), children: [_jsx("span", { className: "dot" }), sync.label] }))] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }, children: [actions.slice(0, 1).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, children: action.label }, action.id))), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, onClick: () => setSelectedMeeting(meeting), children: "Details" }), (opStatus === BookingLifecycleStatus.EXPIRED || opStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 11.5, padding: "3px 10px", opacity: 0.65 }, onClick: () => hideMeeting(meeting.bookingId), children: "Hide" }))] })] }, meeting.bookingId));
                                                }) }))] })] })), section === "availability" && (_jsxs(_Fragment, { children: [availabilityError && _jsx("div", { className: "dash-alert error", children: availabilityError }), _jsx("div", { className: "dash-section", children: _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Weekly rhythm" }), _jsx("div", { className: "sub", children: timezone })] }), _jsx(Button, { onClick: saveWeeklyAvailability, loading: availabilitySaving, size: "sm", children: "Save" })] }), _jsx("div", { className: "mini-avail", children: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day, idx) => {
                                                        const lbl = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx];
                                                        const rule = weeklyRules[day];
                                                        const startH = rule.enabled ? parseInt(rule.startTime.split(":")[0], 10) : -1;
                                                        const endH = rule.enabled ? parseInt(rule.endTime.split(":")[0], 10) : -1;
                                                        return (_jsxs("div", { className: "ma-day", children: [_jsx("div", { className: "lbl", children: lbl }), _jsx("div", { className: "ma-bar", children: Array.from({ length: 24 }).map((_, h) => (_jsx("div", { className: clsx("cell", rule.enabled && h >= startH && h < endH && "on") }, h))) })] }, day));
                                                    }) }), _jsx("div", { style: { marginTop: 24 }, children: DAYS.map((day) => {
                                                        const dayLabel = day.slice(0, 1) + day.slice(1).toLowerCase();
                                                        return (_jsxs("div", { className: "avail-day-row", children: [_jsx("div", { style: { fontWeight: 500, color: "var(--plum-900)", fontSize: 14 }, children: dayLabel }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Start" }), _jsx("input", { type: "time", value: weeklyRules[day].startTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "dash-input" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "End" }), _jsx("input", { type: "time", value: weeklyRules[day].endTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "dash-input" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--plum-500)", paddingTop: 22, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: weeklyRules[day].enabled, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } })), style: { accentColor: "var(--lilac)", width: 16, height: 16 } }), "Active"] })] }, day));
                                                    }) })] }) }), _jsx("div", { className: "dash-section", children: _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Date overrides" }), _jsx("div", { className: "sub", children: "Exceptions for vacations, holidays, or custom hours" })] }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => setOverridePanelOpen((v) => !v), "aria-expanded": overridePanelOpen, children: overridePanelOpen ? "Close" : "Add override" })] }), overridePanelOpen && (_jsxs("div", { style: { marginBottom: 20, padding: 20, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 16 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }, role: "group", "aria-label": "Override mode", children: [_jsx("button", { className: clsx("dash-tab", overrideMode === "UNAVAILABLE" && "active"), onClick: () => setOverrideMode("UNAVAILABLE"), children: "Unavailable all day" }), _jsx("button", { className: clsx("dash-tab", overrideMode === "CUSTOM_HOURS" && "active"), onClick: () => setOverrideMode("CUSTOM_HOURS"), children: "Custom hours" })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "repeat(3,1fr)" : "200px", gap: 12 }, children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Date" }), _jsx("input", { type: "date", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value), className: "dash-input" })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Start" }), _jsx("input", { type: "time", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value), className: "dash-input" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "End" }), _jsx("input", { type: "time", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value), className: "dash-input" })] })] }))] }), overrideValidationMessage && (_jsx("p", { style: { marginTop: 10, fontSize: 12.5, color: "#991B1B" }, role: "alert", children: overrideValidationMessage })), _jsx("div", { style: { marginTop: 16, display: "flex", justifyContent: "flex-end" }, children: _jsx(Button, { onClick: createOverride, disabled: !!overrideValidationMessage, loading: submittingOverride, size: "sm", children: "Save override" }) })] })), loadingOverrides ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 56 } }, i)) })) : overrides.length === 0 ? (_jsxs("div", { className: "dash-empty", style: { padding: "28px 16px" }, children: [_jsx("h3", { children: "No overrides" }), _jsx("p", { children: "Add a date override for schedule exceptions." })] })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: overrides.map((ovr) => {
                                                        const available = isAvailableOverride(ovr);
                                                        return (_jsxs("div", { className: "override-row", children: [_jsxs("div", { children: [_jsx("div", { className: "date", children: humanDate(ovr.date, timezone) }), _jsx("div", { className: "detail", children: available ? `Available ${to12h(ovr.startTime)} – ${to12h(ovr.endTime)}` : "Unavailable all day" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsxs("span", { className: clsx("dbadge", available ? "ok" : "hold"), children: [_jsx("span", { className: "dot" }), available ? "Custom hours" : "Unavailable"] }), _jsx("button", { type: "button", onClick: () => removeOverride(ovr.id), style: { fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)" }, "aria-label": `Delete override for ${humanDate(ovr.date, timezone)}`, children: "Delete" })] })] }, ovr.id));
                                                    }) }))] }) })] })), section === "event-types" && (_jsxs("div", { className: "dash-section", children: [_jsxs("div", { className: "dash-section-head", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Reusable ", _jsx("em", { children: "templates" })] }), _jsx("div", { className: "sub", children: "Public booking links with consistent scheduling behavior." })] }), _jsx(Link, { to: "/onboarding/event", className: "dash-link", children: "Create event \u2192" })] }), eventsError && (_jsxs("div", { className: "dash-alert error", children: [_jsx("span", { children: eventsError }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, onClick: () => void loadEventTypes(), children: "Retry" })] })), eventsLoading ? (_jsx("div", { className: "et-list", children: Array.from({ length: 4 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 64 } }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "dash-empty", children: [_jsx("h3", { children: "No event types yet" }), _jsx("p", { children: "Create one event and your reusable booking links will appear here." }), _jsx(Link, { to: "/onboarding/event", className: "dash-btn-primary", style: { marginTop: 20 }, children: "Create event" })] })) : (_jsx("div", { className: "et-list", children: events.map((event, idx) => {
                                            const stripes = ["lilac", "peach", "sage", "blush"];
                                            const stripe = stripes[idx % stripes.length];
                                            const url = bookingUrl(event);
                                            return (_jsxs("div", { className: "et-row", children: [_jsx("div", { className: clsx("stripe", stripe) }), _jsxs("div", { children: [_jsx("div", { className: "name", children: event.name }), _jsxs("div", { className: "slug", children: ["/", event.slug] })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, onClick: () => navigator.clipboard.writeText(url), children: "Copy link" }), _jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, children: "Preview" }), _jsx(Link, { to: "/onboarding/event", className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, children: "Configure" })] })] }, event.id));
                                        }) }))] })), section === "integrations" && (_jsxs("div", { className: "dash-section", children: [banner && (_jsxs("div", { className: "dash-alert success", children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, style: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }, children: "Dismiss" })] })), integrationsError && _jsx("div", { className: "dash-alert error", children: integrationsError }), _jsxs("div", { className: "int-band", children: [_jsxs("div", { className: "int-fabric", children: [_jsxs("h3", { className: "h3", children: ["Calendar ", _jsx("em", { children: "fabric." })] }), _jsxs("div", { className: "stats", style: { gridTemplateColumns: "repeat(2, 1fr)" }, children: [_jsxs("div", { className: "stat", children: [_jsx("div", { className: "lbl", children: "Google" }), _jsx("div", { className: "val", children: googleCalendarStatus === "connected" ? "On" : "Off" }), _jsx("div", { className: "hint", children: googleCalendarStatus === "connected" ? "Calendar synced" : "Disconnected" })] }), _jsxs("div", { className: "stat", children: [_jsx("div", { className: "lbl", children: "Zoom" }), _jsx("div", { className: "val", children: zoomConferencingStatus === "connected" ? "On" : "Off" }), _jsx("div", { className: "hint", children: zoomConferencingStatus === "connected" ? "Conferencing ready" : "Disconnected" })] })] }), _jsxs("div", { className: "logos", children: [googleCalendarStatus === "connected" && (_jsxs("span", { className: "logo-chip", children: [_jsx("span", { className: "glyph", children: "G" }), "Google Calendar"] })), zoomConferencingStatus === "connected" && (_jsxs("span", { className: "logo-chip", children: [_jsx("span", { className: "glyph", children: "Z" }), "Zoom"] })), connectedProviderCount === 0 && (_jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }, children: "No integrations connected yet" }))] }), _jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => refreshStatus(true), disabled: integrationsLoading, children: integrationsLoading ? "Refreshing…" : "Refresh status" }) })] }), _jsxs("div", { className: "int-tiles-col", children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginBottom: 2 }, children: "Calendar" }), _jsxs("div", { className: "int-tile-mini", children: [_jsx("div", { className: "logo", children: "G" }), _jsxs("div", { children: [_jsx("div", { className: "name", children: "Google Calendar" }), _jsx("div", { className: "last", children: "Sync calendar, prevent double bookings" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }, children: [_jsx("div", { className: clsx("dot", googleCalendarStatus === "connected" && "ok", googleCalendarStatus === "syncing" && "idle", (googleCalendarStatus === "disconnected" || googleCalendarStatus === "failed") && "bad"), "aria-label": googleCalendarStatus === "connected" ? "Connected" : "Disconnected" }), googleCalendarStatus === "connected" ? (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 11, padding: "3px 10px" }, onClick: () => setDisconnectTarget({ kind: "calendar", provider: "google" }), disabled: pendingAction?.provider === "google" && pendingAction?.kind === "calendar", children: "Disconnect" })) : (_jsx("button", { className: "dash-btn-primary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 9 }, onClick: () => connectCalendar("google"), disabled: pendingAction?.provider === "google" && pendingAction?.kind === "calendar", children: "Connect" }))] })] }), googleCalendarStatus === "connected" && googleCalendars.length > 0 && (_jsx("div", { className: "int-tile-mini", style: { gridTemplateColumns: "1fr" }, children: _jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginBottom: 8 }, children: "Calendars used for availability" }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: googleCalendars.map((cal) => (_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--plum-700)" }, children: [_jsx("input", { type: "checkbox", defaultChecked: cal.selected ?? cal.primary ?? true, disabled: true, "aria-label": cal.name ?? cal.id }), _jsxs("span", { children: [cal.name ?? cal.id, cal.primary ? " (primary)" : ""] })] }, cal.id))) }), _jsx("div", { style: { fontSize: 11.5, color: "var(--plum-400)", marginTop: 8 }, children: "Selection updates will activate once the backend exposes a calendar selection endpoint." })] }) })), _jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginTop: 12, marginBottom: 2 }, children: "Conferencing" }), _jsxs("div", { className: "int-tile-mini", children: [_jsx("div", { className: "logo", children: "Z" }), _jsxs("div", { children: [_jsx("div", { className: "name", children: "Zoom" }), _jsx("div", { className: "last", children: "Auto-generate meeting links on confirm" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }, children: [_jsx("div", { className: clsx("dot", zoomConferencingStatus === "connected" && "ok", zoomConferencingStatus === "syncing" && "idle", (zoomConferencingStatus === "disconnected" || zoomConferencingStatus === "failed") && "bad"), "aria-label": zoomConferencingStatus === "connected" ? "Connected" : "Disconnected" }), zoomConferencingStatus === "connected" ? (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 11, padding: "3px 10px" }, onClick: () => setDisconnectTarget({ kind: "conferencing", provider: "zoom" }), disabled: pendingAction?.provider === "zoom" && pendingAction?.kind === "conferencing", children: "Disconnect" })) : (_jsx("button", { className: "dash-btn-primary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 9 }, onClick: () => connectConferencing("zoom"), disabled: pendingAction?.provider === "zoom" && pendingAction?.kind === "conferencing", children: "Connect" }))] })] }), _jsx("div", { style: { fontSize: 11.5, color: "var(--plum-400)", padding: "0 4px" }, children: "Meeting links follow each event type's conferencing setting." })] })] })] })), section === "settings" && (_jsx("div", { className: "dash-section", children: _jsxs("div", { className: "split-grid", children: [_jsxs("div", { className: "panel", children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Event types" }), _jsx("div", { className: "sub", children: "Reusable booking templates and links" })] }) }), _jsx(Link, { to: "/dashboard/event-types", className: "dash-btn-secondary", style: { width: "fit-content" }, children: "Manage \u2192" })] }), _jsxs("div", { className: "panel", children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Integrations" }), _jsx("div", { className: "sub", children: "Calendar and conferencing connections" })] }) }), _jsx(Link, { to: "/dashboard/integrations", className: "dash-btn-secondary", style: { width: "fit-content" }, children: "Manage \u2192" })] })] }) }))] })] }), selectedMeeting && (_jsxs(Dialog, { open: true, onClose: () => setSelectedMeeting(null), title: `${selectedMeeting.guestName} · ${selectedMeeting.eventTypeName}`, width: "lg", footer: _jsxs("div", { className: "flex flex-wrap gap-2 w-full", children: [buildInvitationActions({
                            provider: selectedMeeting.provider,
                            providerEventUrl: selectedMeeting.providerEventUrl,
                            conferenceUrl: selectedMeeting.conferenceUrl,
                        }).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken", children: action.label }, action.id))), selectedMeeting.conferenceUrl && (_jsx(Button, { variant: "secondary", size: "sm", onClick: () => navigator.clipboard.writeText(selectedMeeting.conferenceUrl ?? ""), children: "Copy meeting link" })), _jsx("a", { href: `mailto:${encodeURIComponent(selectedMeeting.guestEmail)}`, className: "focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken", children: "Email guest" }), _jsx(Button, { variant: "danger", size: "sm", loading: cancellingMeetingId === selectedMeeting.bookingId, disabled: selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED || cancellingMeetingId === selectedMeeting.bookingId, onClick: () => setCancelTargetMeeting(selectedMeeting), children: selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "Already cancelled" : "Cancel meeting" })] }), children: [_jsxs("div", { className: "grid sm:grid-cols-2 gap-3 text-sm", children: [_jsx(DetailRow, { label: "Guest", value: `${selectedMeeting.guestName} (${selectedMeeting.guestEmail})` }), _jsx(DetailRow, { label: "Status", value: selectedMeeting.bookingStatus }), _jsx(DetailRow, { label: "Start", value: formatMeetingDateTime(selectedMeeting.startTime) }), _jsx(DetailRow, { label: "End", value: formatMeetingDateTime(selectedMeeting.endTime) }), _jsx(DetailRow, { label: "Timezone", value: timezone }), _jsx(DetailRow, { label: "Provider", value: selectedMeeting.provider || "—" }), _jsx(DetailRow, { label: "Meeting link", value: selectedMeeting.conferenceUrl
                                    ? selectedMeeting.conferenceUrl
                                    : selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "—" : "Preparing meeting link…" }), _jsx(DetailRow, { label: "Calendar sync", value: getSyncState({ provider: selectedMeeting.provider, calendarSyncStatus: selectedMeeting.calendarSyncStatus }).label }), _jsx(DetailRow, { label: "External lifecycle", value: getLifecycleState({
                                    externalLifecycleState: selectedMeeting.externalLifecycleState,
                                    externalLifecycleReason: selectedMeeting.externalLifecycleReason,
                                    reconcileSuppressed: selectedMeeting.reconcileSuppressed,
                                    actionRequired: selectedMeeting.actionRequired,
                                })?.label || "—" }), _jsx(DetailRow, { label: "External event ID", value: selectedMeeting.externalEventId || "—" })] }), getLifecycleState({
                        externalLifecycleState: selectedMeeting.externalLifecycleState,
                        externalLifecycleReason: selectedMeeting.externalLifecycleReason,
                        reconcileSuppressed: selectedMeeting.reconcileSuppressed,
                        actionRequired: selectedMeeting.actionRequired,
                    })?.kind === "TERMINAL_EXTERNAL_DELETE" && (_jsxs("div", { className: "rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-fg", children: ["External event removed. Local booking remains ", selectedMeeting.bookingStatus, "."] })), hostActionError && _jsx("p", { className: "text-sm text-danger-fg", children: hostActionError })] })), _jsx(ConfirmDialog, { open: Boolean(cancelTargetMeeting), tone: "danger", pending: Boolean(cancelTargetMeeting && cancellingMeetingId === cancelTargetMeeting.bookingId), title: "Cancel this meeting?", description: cancelTargetMeeting ? `This will cancel the meeting with ${cancelTargetMeeting.guestName}.` : "This will cancel this meeting.", confirmLabel: "Yes, cancel meeting", cancelLabel: "Keep meeting", onCancel: () => setCancelTargetMeeting(null), onConfirm: async () => {
                    if (!cancelTargetMeeting)
                        return;
                    await cancelMeetingAsHost(cancelTargetMeeting);
                    setCancelTargetMeeting(null);
                } }), _jsx(ConfirmDialog, { open: Boolean(disconnectTarget), tone: "danger", pending: Boolean(disconnectTarget && pendingAction?.provider === disconnectTarget.provider && pendingAction?.kind === disconnectTarget.kind), title: "Disconnect integration?", description: disconnectTarget ? `Disconnect ${disconnectTarget.provider} from this host workspace.` : "Disconnect this integration.", confirmLabel: "Disconnect", cancelLabel: "Keep connected", onCancel: () => setDisconnectTarget(null), onConfirm: async () => {
                    if (!disconnectTarget)
                        return;
                    await disconnectProvider(disconnectTarget.kind, disconnectTarget.provider);
                    setDisconnectTarget(null);
                } })] }));
}
function DetailRow({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-border-subtle bg-surface-sunken px-3 py-2", children: [_jsx("div", { className: "text-[11px] uppercase tracking-[0.12em] text-text-tertiary", children: label }), _jsx("div", { className: "mt-1 text-text-primary break-all", children: value })] }));
}
