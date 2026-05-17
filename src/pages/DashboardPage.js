import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
import clsx from "@/lib/clsx";
import { AppShell, Sidebar, MobileNav, Divider } from "@/ui/layout";
import { Button, Dialog, Badge, Skeleton, EmptyState } from "@/ui/controls";
import { useAuth } from "@/state/AuthContext";
import { Avatar } from "@/components/Avatar";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { BookingLifecycleStatus } from "@/constants/bookingStatus";
import { buildInvitationActions, getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { opsLogger } from "@/lib/opsLogger";
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
const DASHBOARD_NAV_ITEMS = [
    { to: "/dashboard", label: "Meetings", icon: _jsx(MeetingsIcon, {}), section: "primary", mobile: true },
    { to: "/dashboard/availability", label: "Availability", icon: _jsx(AvailabilityIcon, {}), section: "primary", mobile: true },
    { to: "/dashboard/event-types", label: "Event Types", icon: _jsx(EventTypesIcon, {}), section: "secondary", mobile: false },
    { to: "/dashboard/integrations", label: "Integrations", icon: _jsx(IntegrationsIcon, {}), section: "secondary", mobile: false },
    { to: "/dashboard/settings", label: "Settings", icon: _jsx(SettingsIcon, {}), section: "secondary", mobile: true },
];
// ── Nav link wrappers (Link for client-side routing + sidebar/mobile token styles) ─
function SidebarLink({ to, active, icon, children }) {
    return (_jsxs(Link, { to: to, "aria-current": active ? "page" : undefined, className: clsx("focus-ring flex items-center gap-2.5 min-h-touch px-3 py-2 rounded-lg text-body-sm transition-colors duration-fast ease-out", active
            ? "bg-accent-surface text-accent-fg font-medium"
            : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary"), children: [icon ? _jsx("span", { className: "shrink-0 text-current", "aria-hidden": "true", children: icon }) : null, _jsx("span", { className: "truncate", children: children })] }));
}
function MobileNavLink({ to, active, icon, children }) {
    return (_jsxs(Link, { to: to, "aria-current": active ? "page" : undefined, className: clsx("focus-ring relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-touch px-2 py-2 text-caption transition-colors duration-fast ease-out", active ? "text-accent-fg font-medium" : "text-text-tertiary hover:text-text-secondary"), children: [_jsx("span", { "aria-hidden": "true", className: clsx("absolute inset-x-6 top-0 h-0.5 rounded-b", active ? "bg-accent-fg" : "bg-transparent") }), icon ? _jsx("span", { "aria-hidden": "true", className: "shrink-0", children: icon }) : null, _jsx("span", { className: "truncate", children: children })] }));
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
    return `${diff} days away`;
}
function statusBadgeTone(status) {
    switch (status) {
        case BookingLifecycleStatus.CONFIRMED: return "success";
        case BookingLifecycleStatus.PENDING: return "warning";
        case BookingLifecycleStatus.CANCELLED: return "danger";
        default: return "neutral";
    }
}
function syncBadgeTone(tone) {
    if (tone === "good")
        return "success";
    if (tone === "bad")
        return "danger";
    if (tone === "warn")
        return "warning";
    return "neutral";
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
    const primaryNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.section === "primary");
    const secondaryNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.section === "secondary");
    const mobileNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.mobile);
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
    const [disconnectTargetProvider, setDisconnectTargetProvider] = useState(null);
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
    const { statusMap, loading: integrationsLoading, error: integrationsError, banner, clearBanner, getProviderStatus, startGoogleConnect, disconnect, pendingAction, refreshStatus } = useIntegrationState();
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
    const connectedProviderCount = ["google", "microsoft", "zoom"].filter((provider) => getProviderStatus(provider) === "connected").length;
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
    const connectFromDashboard = async () => {
        await startGoogleConnect(`${location.pathname}${location.search}${location.hash}`);
    };
    const disconnectProvider = async (provider) => {
        await disconnect(provider);
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
    return (_jsxs(AppShell, { sidebar: _jsxs(Sidebar, { brand: _jsxs(Link, { to: brandHref, className: "no-underline", children: [_jsx("div", { className: "text-body font-semibold text-text-primary", children: "BunnyCal" }), _jsx("div", { className: "text-caption text-text-tertiary mt-0.5", children: "Host workspace" })] }), children: [primaryNavItems.map((item) => (_jsx(SidebarLink, { to: item.to, active: path === item.to, icon: item.icon, children: item.label }, item.to))), _jsx(Divider, { className: "my-1" }), secondaryNavItems.map((item) => (_jsx(SidebarLink, { to: item.to, active: path === item.to, icon: item.icon, children: item.label }, item.to)))] }), mobileNav: _jsx(MobileNav, { children: mobileNavItems.map((item) => (_jsx(MobileNavLink, { to: item.to, active: path === item.to, icon: item.icon, children: item.label }, item.to))) }), mainWidth: "wide", children: [_jsxs("div", { className: "rounded-3xl border border-border-subtle bg-surface p-4 sm:p-6 md:p-7 shadow-floating", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 pb-6 border-b border-border-subtle", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-body-sm text-text-secondary", children: ["Good to see you, ", firstName] }), _jsx("h1", { className: "mt-1 text-h1 text-text-primary", children: section === "event-types"
                                            ? "Event types"
                                            : section === "availability"
                                                ? "Availability"
                                                : section === "integrations"
                                                    ? "Integrations"
                                                    : section === "settings"
                                                        ? "Settings"
                                                        : "Scheduling operations" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/onboarding/event", className: "focus-ring rounded-xl bg-surface-inverse px-4 py-2 text-body-sm font-medium text-text-on-inverse hover:brightness-110", children: "New event" }), _jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setMenuOpen((prev) => !prev), className: "rounded-full focus-ring", "aria-haspopup": "menu", "aria-expanded": menuOpen, "aria-label": "Open user menu", children: _jsx(Avatar, { name: user?.name || user?.email || user?.username || "User", image: user?.profileImage }) }), menuOpen && (_jsxs("div", { role: "menu", className: "absolute right-0 mt-2 w-44 rounded-xl border border-border-subtle bg-surface shadow-floating p-1 z-20", children: [_jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken", children: "Profile" }), _jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken", children: "Settings" }), _jsx("button", { type: "button", role: "menuitem", onClick: handleLogout, disabled: logoutLoading, className: "w-full text-left px-3 py-2 rounded-lg text-sm text-danger-fg hover:bg-danger-surface disabled:opacity-60", children: logoutLoading ? "Signing out..." : "Logout" })] }))] })] })] }), section === "meetings" && (_jsxs("section", { className: "mt-6 space-y-4", "aria-labelledby": "meetings-heading", children: [_jsxs("div", { children: [_jsx("h2", { id: "meetings-heading", className: "text-h2 text-text-primary", children: "Meetings workspace" }), _jsx("p", { className: "mt-1 text-body-sm text-text-secondary", children: "Coordinate upcoming commitments and keep scheduling operations calm." })] }), _jsxs("div", { className: "grid sm:grid-cols-3 gap-3", children: [_jsxs("div", { className: "rounded-2xl border border-border-subtle bg-surface-sunken p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-text-tertiary", children: "Next meeting" }), nextMeeting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-1 font-semibold text-text-primary", children: nextMeeting.guestName }), _jsxs("div", { className: "text-sm text-text-secondary", children: [formatWindow(nextMeeting.startTime, nextMeeting.endTime).date, " \u00B7 ", formatWindow(nextMeeting.startTime, nextMeeting.endTime).time] })] })) : (_jsx("div", { className: "mt-1 text-sm text-text-secondary", children: "No upcoming meeting" }))] }), _jsxs("div", { className: "rounded-2xl border border-border-subtle bg-surface-sunken p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-text-tertiary", children: "Today" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-text-primary", children: todayCount }), _jsx("div", { className: "text-sm text-text-secondary", children: "meetings scheduled" })] }), _jsxs("div", { className: "rounded-2xl border border-border-subtle bg-surface-sunken p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-text-tertiary", children: "Hidden clutter" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-text-primary", children: hiddenMeetingIds.length }), _jsx("button", { onClick: clearHiddenMeetings, className: "mt-2 text-sm text-text-secondary underline disabled:opacity-40", disabled: hiddenMeetingIds.length === 0, children: "Restore hidden meetings" })] })] }), _jsx("div", { className: "rounded-2xl border border-border-subtle bg-surface p-4 sm:px-5", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Badge, { tone: events.length > 0 ? "success" : "warning", size: "sm", children: events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types configured" }), _jsx(Badge, { tone: connectedProviderCount > 0 ? "success" : "warning", size: "sm", children: connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} connected` : "No integrations connected" }), _jsx("p", { className: "text-xs text-text-tertiary", children: "Booking readiness improves when templates and calendar connections are active." })] }) }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "inline-flex rounded-xl border border-border-default p-1 bg-surface", children: [_jsxs("button", { onClick: () => setMeetingTab("upcoming"), className: clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "upcoming" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary"), children: ["Upcoming (", meetingBuckets.upcoming.length, ")"] }), _jsxs("button", { onClick: () => setMeetingTab("past"), className: clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "past" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary"), children: ["Past (", meetingBuckets.past.length, ")"] }), _jsxs("button", { onClick: () => setMeetingTab("cancelled"), className: clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "cancelled" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary"), children: ["Cancelled (", meetingBuckets.cancelled.length, ")"] })] }), _jsx("p", { className: "text-xs text-text-tertiary", children: "Source of truth: effective booking status + external lifecycle" })] }), meetingsError && (_jsxs("div", { className: "rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5 text-sm text-danger-fg flex flex-wrap items-center justify-between gap-2", role: "alert", children: [_jsx("span", { children: meetingsError }), user?.id && (_jsx(Button, { variant: "secondary", size: "sm", onClick: () => void loadMeetings(user.id), children: "Retry" }))] })), meetingsLoading ? (_jsx("div", { className: "grid gap-3", children: Array.from({ length: 5 }).map((_, i) => _jsx(Skeleton, { variant: "block", className: "h-28", ariaLabel: "Loading meeting" }, i)) })) : displayedMeetings.length === 0 ? (_jsx(EmptyState, { title: `No ${meetingTab} meetings`, description: "This view is clear right now." })) : (_jsx("div", { className: "space-y-3", children: displayedMeetings.map((meeting) => {
                                    const when = formatWindow(meeting.startTime, meeting.endTime);
                                    const dayTone = formatRelativeDay(meeting.startTime);
                                    const sync = getSyncState({
                                        provider: meeting.provider,
                                        calendarSyncStatus: meeting.calendarSyncStatus,
                                    });
                                    const lifecycle = getLifecycleState({
                                        externalLifecycleState: meeting.externalLifecycleState,
                                        externalLifecycleReason: meeting.externalLifecycleReason,
                                        reconcileSuppressed: meeting.reconcileSuppressed,
                                        actionRequired: meeting.actionRequired,
                                    });
                                    const terminalExternalDelete = lifecycle?.kind === "TERMINAL_EXTERNAL_DELETE";
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
                                    const actions = buildInvitationActions({
                                        provider: meeting.provider,
                                        providerEventUrl: meeting.providerEventUrl,
                                        conferenceUrl: meeting.conferenceUrl,
                                    });
                                    return (_jsxs("article", { className: clsx("rounded-2xl p-4 bg-surface-sunken", terminalExternalDelete ? "border-2 border-danger-border" : "border border-border-subtle"), children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-text-tertiary", children: dayTone }), _jsxs("h3", { className: "text-body font-semibold text-text-primary truncate", children: [meeting.guestName, " \u00B7 ", meeting.eventTypeName] }), _jsxs("p", { className: "text-body-sm text-text-secondary mt-0.5", children: [when.date, " \u00B7 ", when.time] }), _jsx("p", { className: "text-body-sm text-text-secondary truncate", children: meeting.guestEmail })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [lifecycle && _jsx(Badge, { tone: syncBadgeTone(lifecycle.tone), size: "sm", children: lifecycle.label }), _jsx(Badge, { tone: statusBadgeTone(meeting.bookingStatus), size: "sm", children: terminalExternalDelete ? `Local ${meeting.bookingStatus}` : meeting.bookingStatus }), !terminalExternalDelete && _jsx(Badge, { tone: syncBadgeTone(sync.tone), size: "sm", children: sync.label })] })] }), lifecycle && (_jsx("p", { className: clsx("mt-2 text-xs", terminalExternalDelete ? "text-danger-fg" : "text-text-tertiary"), children: lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && meeting.bookingStatus !== BookingLifecycleStatus.CANCELLED
                                                    ? "External event removed; booking status update may still be processing."
                                                    : lifecycle.detail })), terminalExternalDelete && (_jsxs("p", { className: "mt-1 text-xs text-text-tertiary", children: ["Local booking remains ", meeting.bookingStatus, ". External provider event no longer exists."] })), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [actions.slice(0, 2).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "focus-ring rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken", children: action.label }, action.id))), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => setSelectedMeeting(meeting), children: "More details" }), (meeting.bookingStatus === BookingLifecycleStatus.EXPIRED || meeting.bookingStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => hideMeeting(meeting.bookingId), children: "Hide" }))] })] }, meeting.bookingId));
                                }) }))] })), section === "availability" && (_jsxs("section", { className: "mt-6 space-y-5", "aria-labelledby": "availability-heading", children: [availabilityError && _jsx("p", { className: "text-sm text-danger-fg", role: "alert", children: availabilityError }), _jsxs("div", { className: "rounded-2xl border border-border-subtle p-4 sm:p-5 lg:p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { children: [_jsx("h2", { id: "availability-heading", className: "text-h3 text-text-primary", children: "Weekly availability" }), _jsx("p", { className: "text-body-sm text-text-secondary", children: "Continuously editable schedule for new bookings." })] }), _jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-sunken px-3 py-1.5 text-xs text-text-secondary", children: ["Timezone: ", _jsx("strong", { className: "text-text-primary", children: timezone })] })] }), _jsxs("fieldset", { className: "mt-4 space-y-3", children: [_jsx("legend", { className: "sr-only", children: "Weekly availability rules" }), DAYS.map((day) => {
                                                const dayLabel = day.slice(0, 1) + day.slice(1).toLowerCase();
                                                const dayKey = day.toLowerCase();
                                                const activeInputId = `availability-active-${dayKey}`;
                                                return (_jsxs("div", { className: "rounded-xl border border-border-subtle p-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", children: [_jsx("div", { className: "font-medium text-text-primary sm:w-24 sm:shrink-0", children: dayLabel }), _jsxs("label", { className: "text-sm sm:min-w-40 sm:flex-1", children: [_jsx("span", { className: "text-text-secondary", children: "Start" }), _jsx("input", { type: "time", value: weeklyRules[day].startTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2 disabled:opacity-50" })] }), _jsxs("label", { className: "text-sm sm:min-w-40 sm:flex-1", children: [_jsx("span", { className: "text-text-secondary", children: "End" }), _jsx("input", { type: "time", value: weeklyRules[day].endTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2 disabled:opacity-50" })] }), _jsxs("label", { htmlFor: activeInputId, className: "inline-flex min-h-touch items-center gap-2 text-sm text-text-secondary sm:ml-auto", children: [_jsx("input", { id: activeInputId, type: "checkbox", checked: weeklyRules[day].enabled, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } })), className: "focus-ring h-4 w-4 rounded border-border-default" }), "Active"] })] }, day));
                                            })] }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx(Button, { onClick: saveWeeklyAvailability, loading: availabilitySaving, size: "sm", children: "Save weekly availability" }) })] }), _jsxs("div", { className: "rounded-2xl border border-border-subtle p-4 sm:p-5 lg:p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-h3 text-text-primary", children: "Date overrides" }), _jsx("p", { className: "text-body-sm text-text-secondary", children: "Add exceptions for vacations, holidays, or custom hours." })] }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => setOverridePanelOpen((v) => !v), "aria-expanded": overridePanelOpen, "aria-controls": "availability-override-form", children: overridePanelOpen ? "Close" : "Add override" })] }), overridePanelOpen && (_jsxs("div", { id: "availability-override-form", className: "mt-4 rounded-xl border border-border-subtle bg-surface-sunken p-4", children: [_jsxs("div", { className: "flex flex-wrap gap-2", role: "group", "aria-label": "Override mode", children: [_jsx("button", { type: "button", onClick: () => setOverrideMode("UNAVAILABLE"), "aria-pressed": overrideMode === "UNAVAILABLE", className: clsx("focus-ring min-h-touch rounded-lg px-3 py-1.5 text-sm border", overrideMode === "UNAVAILABLE" ? "bg-surface-inverse text-text-on-inverse border-surface-inverse" : "bg-surface text-text-primary border-border-default"), children: "Unavailable all day" }), _jsx("button", { type: "button", onClick: () => setOverrideMode("CUSTOM_HOURS"), "aria-pressed": overrideMode === "CUSTOM_HOURS", className: clsx("focus-ring min-h-touch rounded-lg px-3 py-1.5 text-sm border", overrideMode === "CUSTOM_HOURS" ? "bg-surface-inverse text-text-on-inverse border-surface-inverse" : "bg-surface text-text-primary border-border-default"), children: "Custom hours" })] }), _jsxs("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Date" }), _jsx("input", { type: "date", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value), className: "focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2" })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Start" }), _jsx("input", { type: "time", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value), className: "focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2" })] }), _jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "End" }), _jsx("input", { type: "time", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value), className: "focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2" })] })] }))] }), overrideValidationMessage && _jsx("p", { className: "mt-2 text-xs text-danger-fg", role: "alert", children: overrideValidationMessage }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx(Button, { onClick: createOverride, disabled: !!overrideValidationMessage, loading: submittingOverride, size: "sm", children: "Save override" }) })] })), _jsx("div", { className: "mt-4 space-y-2", children: loadingOverrides ? (_jsx("div", { className: "space-y-2", children: Array.from({ length: 3 }).map((_, i) => _jsx(Skeleton, { variant: "block", className: "h-14", ariaLabel: "Loading override" }, i)) })) : overrides.length === 0 ? (_jsx(EmptyState, { title: "No overrides configured", description: "Add a date override when you need a one-off schedule exception." })) : (overrides.map((ovr) => {
                                            const available = isAvailableOverride(ovr);
                                            return (_jsxs("article", { className: "rounded-xl border border-border-subtle px-3 py-3 sm:px-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: humanDate(ovr.date, timezone) }), _jsx("p", { className: "text-sm text-text-secondary mt-0.5 break-words", children: available ? `Available from ${to12h(ovr.startTime)} to ${to12h(ovr.endTime)}` : "Unavailable all day" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { tone: available ? "success" : "warning", size: "sm", children: available ? "Custom hours" : "Unavailable" }), _jsx("button", { type: "button", onClick: () => removeOverride(ovr.id), className: "focus-ring min-h-touch rounded-lg px-2 text-sm text-danger-fg", "aria-label": `Delete override for ${humanDate(ovr.date, timezone)}`, children: "Delete" })] })] }, ovr.id));
                                        })) })] })] })), section === "event-types" && (_jsxs("section", { className: "mt-6 space-y-3", "aria-labelledby": "event-types-heading", children: [_jsx("div", { className: "flex items-start justify-between gap-3 flex-wrap", children: _jsxs("div", { children: [_jsx("h2", { id: "event-types-heading", className: "text-h2 text-text-primary", children: "Reusable event templates" }), _jsx("p", { className: "mt-1 text-body-sm text-text-secondary", children: "Manage public booking links with consistent scheduling behavior." })] }) }), eventsError && (_jsxs("div", { className: "mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5 text-sm text-danger-fg flex flex-wrap items-center justify-between gap-2", role: "alert", children: [_jsx("span", { children: eventsError }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => void loadEventTypes(), children: "Retry" })] })), eventsLoading ? (_jsx("div", { className: "grid md:grid-cols-2 gap-3 mt-3", children: Array.from({ length: 4 }).map((_, i) => _jsx(Skeleton, { variant: "block", className: "h-28", ariaLabel: "Loading event type" }, i)) })) : events.length === 0 ? (_jsx("div", { className: "mt-3", children: _jsx(EmptyState, { title: "No event types yet", description: "Create one event and your reusable booking links will appear here.", action: _jsx(Link, { to: "/onboarding/event", className: "focus-ring rounded-xl border border-border-default bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken", children: "Create event" }) }) })) : (_jsx("div", { className: "grid md:grid-cols-2 gap-3 mt-3", children: events.map((event) => {
                                    const url = bookingUrl(event);
                                    return (_jsxs("article", { className: "rounded-2xl border border-border-subtle p-4 bg-surface-sunken overflow-hidden", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "font-semibold text-text-primary", children: event.name }), _jsxs("p", { className: "text-sm text-text-secondary mt-1 break-all", children: ["/", event.slug] })] }), _jsx(Badge, { tone: "neutral", size: "sm", children: "Template" })] }), _jsxs("div", { className: "mt-4 flex gap-2 flex-wrap", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => navigator.clipboard.writeText(url), children: "Copy link" }), _jsx("a", { href: url, className: "focus-ring inline-flex min-h-touch items-center rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken", children: "Preview" }), _jsx(Link, { to: "/onboarding/event", className: "focus-ring inline-flex min-h-touch items-center rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken", children: "Configure" })] })] }, event.id));
                                }) }))] })), section === "integrations" && (_jsxs("section", { className: "mt-6 space-y-4", children: [banner && (_jsx("div", { className: "rounded-xl border border-success-border bg-success-surface px-3 py-2 text-sm text-success-fg", children: _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, className: "underline", children: "Dismiss" })] }) })), integrationsError && _jsx("p", { className: "text-sm text-danger-fg", children: integrationsError }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { variant: "secondary", size: "sm", onClick: () => refreshStatus(true), loading: integrationsLoading, children: integrationsLoading ? "Refreshing..." : "Refresh status" }) }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: [_jsx(IntegrationCard, { provider: "google", title: "Google Calendar", description: "Sync host calendar and prevent double bookings.", status: getProviderStatus("google"), rawStatus: statusMap.google, busy: pendingAction?.provider === "google", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("google") }), _jsx(IntegrationCard, { provider: "microsoft", title: "Microsoft Calendar", description: "Sync Outlook events and maintain scheduling availability.", status: getProviderStatus("microsoft"), rawStatus: statusMap.microsoft, busy: pendingAction?.provider === "microsoft", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("microsoft") }), _jsx(IntegrationCard, { provider: "zoom", title: "Zoom", description: "Manage conferencing integration for scheduled meetings.", status: getProviderStatus("zoom"), rawStatus: statusMap.zoom, busy: pendingAction?.provider === "zoom", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("zoom") })] })] })), section === "settings" && (_jsx("section", { className: "mt-6 space-y-4", children: _jsxs("div", { className: "rounded-2xl border border-border-subtle p-4 sm:p-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Workspace configuration" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Keep configuration surfaces grouped here on mobile so scheduling stays the primary path." })] }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [_jsxs(Link, { to: "/dashboard/event-types", className: "focus-ring rounded-xl border border-border-default bg-surface px-4 py-3 text-left hover:bg-surface-sunken", children: [_jsx("div", { className: "text-sm font-medium text-text-primary", children: "Event types" }), _jsx("div", { className: "mt-1 text-sm text-text-secondary", children: "Manage reusable booking templates and links." })] }), _jsxs(Link, { to: "/dashboard/integrations", className: "focus-ring rounded-xl border border-border-default bg-surface px-4 py-3 text-left hover:bg-surface-sunken", children: [_jsx("div", { className: "text-sm font-medium text-text-primary", children: "Integrations" }), _jsx("div", { className: "mt-1 text-sm text-text-secondary", children: "Review calendar and conferencing connections." })] })] })] }) }))] }), selectedMeeting && (_jsxs(Dialog, { open: true, onClose: () => setSelectedMeeting(null), title: `${selectedMeeting.guestName} · ${selectedMeeting.eventTypeName}`, width: "lg", footer: _jsxs("div", { className: "flex flex-wrap gap-2 w-full", children: [buildInvitationActions({
                            provider: selectedMeeting.provider,
                            providerEventUrl: selectedMeeting.providerEventUrl,
                            conferenceUrl: selectedMeeting.conferenceUrl,
                        }).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken", children: action.label }, action.id))), selectedMeeting.conferenceUrl && (_jsx(Button, { variant: "secondary", size: "sm", onClick: () => navigator.clipboard.writeText(selectedMeeting.conferenceUrl ?? ""), children: "Copy meeting link" })), _jsx("a", { href: `mailto:${encodeURIComponent(selectedMeeting.guestEmail)}`, className: "focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken", children: "Email guest" }), _jsx(Button, { variant: "danger", size: "sm", loading: cancellingMeetingId === selectedMeeting.bookingId, disabled: selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED || cancellingMeetingId === selectedMeeting.bookingId, onClick: () => setCancelTargetMeeting(selectedMeeting), children: selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "Already cancelled" : "Cancel meeting" })] }), children: [_jsxs("div", { className: "grid sm:grid-cols-2 gap-3 text-sm", children: [_jsx(DetailRow, { label: "Guest", value: `${selectedMeeting.guestName} (${selectedMeeting.guestEmail})` }), _jsx(DetailRow, { label: "Status", value: selectedMeeting.bookingStatus }), _jsx(DetailRow, { label: "Start", value: formatMeetingDateTime(selectedMeeting.startTime) }), _jsx(DetailRow, { label: "End", value: formatMeetingDateTime(selectedMeeting.endTime) }), _jsx(DetailRow, { label: "Timezone", value: timezone }), _jsx(DetailRow, { label: "Provider", value: selectedMeeting.provider || "—" }), _jsx(DetailRow, { label: "Calendar sync", value: getSyncState({ provider: selectedMeeting.provider, calendarSyncStatus: selectedMeeting.calendarSyncStatus }).label }), _jsx(DetailRow, { label: "External lifecycle", value: getLifecycleState({
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
                } }), _jsx(ConfirmDialog, { open: Boolean(disconnectTargetProvider), tone: "danger", pending: Boolean(disconnectTargetProvider && pendingAction?.provider === disconnectTargetProvider), title: "Disconnect integration?", description: disconnectTargetProvider ? `Disconnect ${disconnectTargetProvider} from this host workspace.` : "Disconnect this integration.", confirmLabel: "Disconnect", cancelLabel: "Keep connected", onCancel: () => setDisconnectTargetProvider(null), onConfirm: async () => {
                    if (!disconnectTargetProvider)
                        return;
                    await disconnectProvider(disconnectTargetProvider);
                    setDisconnectTargetProvider(null);
                } })] }));
}
function DetailRow({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-border-subtle bg-surface-sunken px-3 py-2", children: [_jsx("div", { className: "text-[11px] uppercase tracking-[0.12em] text-text-tertiary", children: label }), _jsx("div", { className: "mt-1 text-text-primary break-all", children: value })] }));
}
