import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
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
function statusBadge(status) {
    switch (status) {
        case BookingLifecycleStatus.CONFIRMED:
            return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case BookingLifecycleStatus.PENDING:
            return "bg-amber-100 text-amber-700 border-amber-200";
        case BookingLifecycleStatus.CANCELLED:
            return "bg-rose-100 text-rose-700 border-rose-200";
        case BookingLifecycleStatus.EXPIRED:
            return "bg-slate-200 text-slate-700 border-slate-300";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}
function toneBadge(tone) {
    if (tone === "good")
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (tone === "bad")
        return "bg-rose-100 text-rose-700 border-rose-200";
    if (tone === "neutral")
        return "bg-slate-100 text-slate-700 border-slate-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
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
        setEventsLoading(true);
        setMeetingsLoading(true);
        setEventsError(null);
        setMeetingsError(null);
        api.listEventTypes()
            .then(setEvents)
            .catch((e) => {
            console.error(e);
            setEventsError("Failed to load event type configuration.");
            setEvents([]);
        })
            .finally(() => setEventsLoading(false));
        void loadMeetings(user.id);
        void loadOverrides();
    }, [loadMeetings, loadOverrides, refreshUser, user?.id]);
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
    return (_jsxs("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_45%,#f9fbff_100%)] px-4 py-5 sm:px-5 sm:py-6", children: [_jsxs("div", { className: "max-w-6xl mx-auto grid lg:grid-cols-[220px_1fr] gap-5", children: [_jsxs("aside", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-4 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("div", { className: "px-2 pb-3 border-b border-[#eef2f7]", children: [_jsx("div", { className: "text-[#0f172a] font-semibold", children: "EasySchedule" }), _jsx("div", { className: "text-xs text-[#64748b] mt-1", children: "Host workspace" })] }), _jsxs("nav", { className: "pt-3 space-y-1 text-sm", children: [_jsx(Link, { to: "/dashboard", className: `block rounded-xl px-3 py-2 ${section === "meetings" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`, children: "Meetings" }), _jsx(Link, { to: "/dashboard/availability", className: `block rounded-xl px-3 py-2 ${section === "availability" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`, children: "Availability" }), _jsx(Link, { to: "/dashboard/integrations", className: `block rounded-xl px-3 py-2 ${section === "integrations" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`, children: "Integrations" }), _jsx(Link, { to: "/dashboard/event-types", className: `block rounded-xl px-3 py-2 ${section === "event-types" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`, children: "Event Types" }), _jsx(Link, { to: "/dashboard/settings", className: `block rounded-xl px-3 py-2 ${section === "settings" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`, children: "Settings" })] })] }), _jsxs("main", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-4 sm:p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 pb-5 border-b border-[#eef2f7]", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-[#64748b]", children: ["Good to see you, ", firstName] }), _jsx("h1", { className: "mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#0f172a]", children: section === "event-types" ? "Event types" : section === "availability" ? "Availability" : "Scheduling operations" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/onboarding/event", className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b]", children: "New event" }), _jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setMenuOpen((prev) => !prev), className: "rounded-full focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-2", "aria-haspopup": "menu", "aria-expanded": menuOpen, "aria-label": "Open user menu", children: _jsx(Avatar, { name: user?.name || user?.email || user?.username || "User", image: user?.profileImage }) }), menuOpen && (_jsxs("div", { role: "menu", className: "absolute right-0 mt-2 w-44 rounded-xl border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.12)] p-1 z-20", children: [_jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]", children: "Profile" }), _jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]", children: "Settings" }), _jsx("button", { type: "button", role: "menuitem", onClick: handleLogout, disabled: logoutLoading, className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-60", children: logoutLoading ? "Signing out..." : "Logout" })] }))] })] })] }), section === "meetings" && (_jsxs("section", { className: "mt-5 space-y-4", children: [_jsxs("div", { className: "grid sm:grid-cols-3 gap-3", children: [_jsxs("div", { className: "rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-[#64748b]", children: "Next meeting" }), nextMeeting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-1 font-semibold text-[#0f172a]", children: nextMeeting.guestName }), _jsxs("div", { className: "text-sm text-[#64748b]", children: [formatWindow(nextMeeting.startTime, nextMeeting.endTime).date, " \u00B7 ", formatWindow(nextMeeting.startTime, nextMeeting.endTime).time] })] })) : (_jsx("div", { className: "mt-1 text-sm text-[#64748b]", children: "No upcoming meeting" }))] }), _jsxs("div", { className: "rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-[#64748b]", children: "Today" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-[#0f172a]", children: todayCount }), _jsx("div", { className: "text-sm text-[#64748b]", children: "meetings scheduled" })] }), _jsxs("div", { className: "rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-[#64748b]", children: "Hidden clutter" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-[#0f172a]", children: hiddenMeetingIds.length }), _jsx("button", { onClick: clearHiddenMeetings, className: "mt-2 text-sm text-[#334155] underline disabled:opacity-40", disabled: hiddenMeetingIds.length === 0, children: "Restore hidden meetings" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "inline-flex rounded-xl border border-[#d1d5db] p-1 bg-white", children: [_jsxs("button", { onClick: () => setMeetingTab("upcoming"), className: `rounded-lg px-3 py-1.5 text-sm ${meetingTab === "upcoming" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`, children: ["Upcoming (", meetingBuckets.upcoming.length, ")"] }), _jsxs("button", { onClick: () => setMeetingTab("past"), className: `rounded-lg px-3 py-1.5 text-sm ${meetingTab === "past" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`, children: ["Past (", meetingBuckets.past.length, ")"] }), _jsxs("button", { onClick: () => setMeetingTab("cancelled"), className: `rounded-lg px-3 py-1.5 text-sm ${meetingTab === "cancelled" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`, children: ["Cancelled (", meetingBuckets.cancelled.length, ")"] })] }), _jsx("p", { className: "text-xs text-[#64748b]", children: "Source of truth: effective booking status + external lifecycle" })] }), meetingsError && _jsx("p", { className: "text-sm text-[#dc2626]", children: meetingsError }), meetingsLoading ? (_jsx("div", { className: "grid gap-3", children: Array.from({ length: 5 }).map((_, i) => _jsx("div", { className: "h-28 rounded-2xl bg-[#eef2ff] animate-pulse" }, i)) })) : displayedMeetings.length === 0 ? (_jsxs("div", { className: "rounded-2xl border border-dashed border-[#cbd5e1] p-8 text-center", children: [_jsxs("div", { className: "text-[#0f172a] text-lg font-semibold", children: ["No ", meetingTab, " meetings"] }), _jsx("p", { className: "text-sm text-[#64748b] mt-1", children: "This view is clear right now." })] })) : (_jsx("div", { className: "space-y-3", children: displayedMeetings.map((meeting) => {
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
                                            const syncToneClass = toneBadge(sync.tone);
                                            const lifecycleToneClass = lifecycle ? toneBadge(lifecycle.tone) : "";
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
                                            return (_jsxs("article", { className: `rounded-2xl p-4 bg-[#fcfdff] ${terminalExternalDelete ? "border-2 border-rose-300" : "border border-[#e2e8f0]"}`, children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-[#64748b]", children: dayTone }), _jsxs("h3", { className: "font-semibold text-[#0f172a] truncate", children: [meeting.guestName, " \u00B7 ", meeting.eventTypeName] }), _jsxs("p", { className: "text-sm text-[#64748b] mt-0.5", children: [when.date, " \u00B7 ", when.time] }), _jsx("p", { className: "text-sm text-[#475569] truncate", children: meeting.guestEmail })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [lifecycle && _jsx("span", { className: `rounded-full border px-2.5 py-1 text-xs font-medium ${lifecycleToneClass}`, children: lifecycle.label }), _jsx("span", { className: `rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(meeting.bookingStatus)}`, children: terminalExternalDelete ? `Local ${meeting.bookingStatus}` : meeting.bookingStatus }), !terminalExternalDelete && _jsx("span", { className: `rounded-full border px-2.5 py-1 text-xs font-medium ${syncToneClass}`, children: sync.label })] })] }), lifecycle && (_jsx("p", { className: `mt-2 text-xs ${terminalExternalDelete ? "text-rose-700" : "text-[#64748b]"}`, children: lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && meeting.bookingStatus !== BookingLifecycleStatus.CANCELLED
                                                            ? "External event removed; booking status update may still be processing."
                                                            : lifecycle.detail })), terminalExternalDelete && (_jsxs("p", { className: "mt-1 text-xs text-[#64748b]", children: ["Local booking remains ", meeting.bookingStatus, ". External provider event no longer exists."] })), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [actions.slice(0, 2).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: action.label }, action.id))), _jsx("button", { onClick: () => setSelectedMeeting(meeting), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "More details" }), (meeting.bookingStatus === BookingLifecycleStatus.EXPIRED || meeting.bookingStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (_jsx("button", { onClick: () => hideMeeting(meeting.bookingId), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#64748b]", children: "Hide" }))] })] }, meeting.bookingId));
                                        }) }))] })), section === "availability" && (_jsxs("section", { className: "mt-5 space-y-5", children: [availabilityError && _jsx("p", { className: "text-sm text-[#dc2626]", children: availabilityError }), _jsxs("div", { className: "rounded-2xl border border-[#e2e8f0] p-4 sm:p-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-[#0f172a]", children: "Weekly availability" }), _jsx("p", { className: "text-sm text-[#64748b]", children: "Continuously editable schedule for new bookings." })] }), _jsxs("div", { className: "text-xs text-[#64748b]", children: ["Timezone: ", _jsx("strong", { children: timezone })] })] }), _jsx("div", { className: "mt-4 space-y-3", children: DAYS.map((day) => (_jsxs("div", { className: "rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center", children: [_jsx("div", { className: "font-medium text-[#0f172a]", children: day.slice(0, 1) + day.slice(1).toLowerCase() }), _jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-[#64748b]", children: "Start" }), _jsx("input", { type: "time", value: weeklyRules[day].startTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" })] }), _jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-[#64748b]", children: "End" }), _jsx("input", { type: "time", value: weeklyRules[day].endTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50" })] }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm text-[#334155]", children: [_jsx("input", { type: "checkbox", checked: weeklyRules[day].enabled, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } })) }), "Active"] })] }, day))) }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { onClick: saveWeeklyAvailability, disabled: availabilitySaving, className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60", children: availabilitySaving ? "Saving..." : "Save weekly availability" }) })] }), _jsxs("div", { className: "rounded-2xl border border-[#e2e8f0] p-4 sm:p-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-[#0f172a]", children: "Date overrides" }), _jsx("p", { className: "text-sm text-[#64748b]", children: "Add exceptions for vacations, holidays, or custom hours." })] }), _jsx("button", { onClick: () => setOverridePanelOpen((v) => !v), className: "rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm", children: overridePanelOpen ? "Close" : "Add override" })] }), overridePanelOpen && (_jsxs("div", { className: "mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => setOverrideMode("UNAVAILABLE"), className: `rounded-lg px-3 py-1.5 text-sm border ${overrideMode === "UNAVAILABLE" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`, children: "Unavailable all day" }), _jsx("button", { type: "button", onClick: () => setOverrideMode("CUSTOM_HOURS"), className: `rounded-lg px-3 py-1.5 text-sm border ${overrideMode === "CUSTOM_HOURS" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`, children: "Custom hours" })] }), _jsxs("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-[#334155]", children: "Date" }), _jsx("input", { type: "date", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value), className: "mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-[#334155]", children: "Start" }), _jsx("input", { type: "time", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value), className: "mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" })] }), _jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "text-[#334155]", children: "End" }), _jsx("input", { type: "time", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value), className: "mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" })] })] }))] }), overrideValidationMessage && _jsx("p", { className: "mt-2 text-xs text-[#dc2626]", children: overrideValidationMessage }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { onClick: createOverride, disabled: !!overrideValidationMessage || submittingOverride, className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60", children: submittingOverride ? "Saving..." : "Save override" }) })] })), _jsx("div", { className: "mt-4 space-y-2", children: loadingOverrides ? (_jsx("div", { className: "space-y-2", children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "h-14 rounded-xl bg-[#f1f5f9] animate-pulse" }, i)) })) : overrides.length === 0 ? (_jsx("p", { className: "text-sm text-[#64748b] rounded-xl border border-dashed border-[#cbd5e1] p-4", children: "No overrides configured." })) : (overrides.map((ovr) => {
                                                    const available = isAvailableOverride(ovr);
                                                    return (_jsxs("article", { className: "rounded-xl border border-[#e2e8f0] px-3 py-3 sm:px-4 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-[#0f172a]", children: humanDate(ovr.date, timezone) }), _jsx("p", { className: "text-sm text-[#475569] mt-0.5", children: available ? `Available from ${to12h(ovr.startTime)} to ${to12h(ovr.endTime)}` : "Unavailable all day" })] }), _jsx("button", { onClick: () => removeOverride(ovr.id), className: "text-sm text-[#dc2626]", children: "Delete" })] }, ovr.id));
                                                })) })] })] })), section === "event-types" && (_jsxs("section", { className: "mt-5", children: [_jsx("div", { className: "flex items-center justify-between gap-3", children: _jsx("h2", { className: "text-xl font-semibold text-[#0f172a]", children: "Reusable event templates" }) }), eventsError && _jsx("p", { className: "text-sm text-[#dc2626] mt-3", children: eventsError }), eventsLoading ? (_jsx("div", { className: "grid md:grid-cols-2 gap-3 mt-3", children: Array.from({ length: 4 }).map((_, i) => _jsx("div", { className: "h-28 rounded-2xl bg-[#eef2ff] animate-pulse" }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "mt-3 rounded-2xl border border-dashed border-[#cbd5e1] p-10 text-center", children: [_jsx("div", { className: "text-[#0f172a] text-lg font-semibold", children: "No event types yet" }), _jsx("p", { className: "text-sm text-[#64748b] mt-1", children: "Create one event and your reusable booking links will appear here." }), _jsx(Link, { to: "/onboarding/event", className: "mt-4 inline-block rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium", children: "Create event" })] })) : (_jsx("div", { className: "grid md:grid-cols-2 gap-3 mt-3", children: events.map((event) => {
                                            const url = bookingUrl(event);
                                            return (_jsxs("article", { className: "rounded-2xl border border-[#e2e8f0] p-4 bg-[#fcfdff]", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-[#0f172a]", children: event.name }), _jsxs("p", { className: "text-sm text-[#64748b] mt-1", children: ["/", event.slug] })] }), _jsx("span", { className: "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700", children: "Template" })] }), _jsxs("div", { className: "mt-4 flex gap-2 flex-wrap", children: [_jsx("button", { onClick: () => navigator.clipboard.writeText(url), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Copy link" }), _jsx("a", { href: url, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Preview" }), _jsx(Link, { to: "/onboarding/event", className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Configure" })] })] }, event.id));
                                        }) }))] })), section === "integrations" && (_jsxs("section", { className: "mt-5 space-y-4", children: [banner && (_jsx("div", { className: "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, className: "text-emerald-700 underline", children: "Dismiss" })] }) })), integrationsError && _jsx("p", { className: "text-sm text-[#dc2626]", children: integrationsError }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: () => refreshStatus(true), className: "rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm", children: integrationsLoading ? "Refreshing..." : "Refresh status" }) }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: [_jsx(IntegrationCard, { provider: "google", title: "Google Calendar", description: "Sync host calendar and prevent double bookings.", status: getProviderStatus("google"), rawStatus: statusMap.google, busy: pendingAction?.provider === "google", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("google") }), _jsx(IntegrationCard, { provider: "microsoft", title: "Microsoft Calendar", description: "Sync Outlook events and maintain scheduling availability.", status: getProviderStatus("microsoft"), rawStatus: statusMap.microsoft, busy: pendingAction?.provider === "microsoft", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("microsoft") }), _jsx(IntegrationCard, { provider: "zoom", title: "Zoom", description: "Manage conferencing integration for scheduled meetings.", status: getProviderStatus("zoom"), rawStatus: statusMap.zoom, busy: pendingAction?.provider === "zoom", onConnect: connectFromDashboard, onDisconnect: () => setDisconnectTargetProvider("zoom") })] })] })), section !== "meetings" && section !== "event-types" && section !== "availability" && section !== "integrations" && (_jsxs("section", { className: "mt-5 rounded-2xl border border-dashed border-[#cbd5e1] p-8", children: [_jsxs("div", { className: "text-[#0f172a] text-lg font-semibold", children: [section[0].toUpperCase() + section.slice(1), " area"] }), _jsx("p", { className: "text-sm text-[#64748b] mt-1", children: "This section is reserved for operational controls and will be expanded without changing the meetings-first dashboard." })] }))] })] }), selectedMeeting && (_jsx("div", { className: "fixed inset-0 z-40 bg-[#0f172a]/45 p-4 sm:p-6 grid place-items-center", onClick: () => setSelectedMeeting(null), children: _jsxs("div", { className: "w-full max-w-2xl rounded-2xl border border-[#dbe4f8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.14em] text-[#64748b]", children: "Meeting details" }), _jsxs("h3", { className: "mt-1 text-xl font-semibold text-[#0f172a]", children: [selectedMeeting.guestName, " \u00B7 ", selectedMeeting.eventTypeName] })] }), _jsx("button", { onClick: () => setSelectedMeeting(null), className: "rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1 text-sm", children: "Close" })] }), _jsxs("div", { className: "mt-4 grid sm:grid-cols-2 gap-3 text-sm", children: [_jsx(DetailRow, { label: "Guest", value: `${selectedMeeting.guestName} (${selectedMeeting.guestEmail})` }), _jsx(DetailRow, { label: "Status", value: selectedMeeting.bookingStatus }), _jsx(DetailRow, { label: "Start", value: formatMeetingDateTime(selectedMeeting.startTime) }), _jsx(DetailRow, { label: "End", value: formatMeetingDateTime(selectedMeeting.endTime) }), _jsx(DetailRow, { label: "Timezone", value: timezone }), _jsx(DetailRow, { label: "Provider", value: selectedMeeting.provider || "—" }), _jsx(DetailRow, { label: "Calendar sync", value: getSyncState({ provider: selectedMeeting.provider, calendarSyncStatus: selectedMeeting.calendarSyncStatus }).label }), _jsx(DetailRow, { label: "External lifecycle", value: getLifecycleState({
                                        externalLifecycleState: selectedMeeting.externalLifecycleState,
                                        externalLifecycleReason: selectedMeeting.externalLifecycleReason,
                                        reconcileSuppressed: selectedMeeting.reconcileSuppressed,
                                        actionRequired: selectedMeeting.actionRequired,
                                    })?.label || "—" }), _jsx(DetailRow, { label: "External event ID", value: selectedMeeting.externalEventId || "—" })] }), getLifecycleState({
                            externalLifecycleState: selectedMeeting.externalLifecycleState,
                            externalLifecycleReason: selectedMeeting.externalLifecycleReason,
                            reconcileSuppressed: selectedMeeting.reconcileSuppressed,
                            actionRequired: selectedMeeting.actionRequired,
                        })?.kind === "TERMINAL_EXTERNAL_DELETE" && (_jsxs("div", { className: "mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: ["External event removed. Local booking remains ", selectedMeeting.bookingStatus, "."] })), hostActionError && _jsx("p", { className: "mt-3 text-sm text-[#dc2626]", children: hostActionError }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [buildInvitationActions({
                                    provider: selectedMeeting.provider,
                                    providerEventUrl: selectedMeeting.providerEventUrl,
                                    conferenceUrl: selectedMeeting.conferenceUrl,
                                }).map((action) => (_jsx("a", { href: action.url, target: "_blank", rel: "noreferrer", className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: action.label }, action.id))), selectedMeeting.conferenceUrl && (_jsx("button", { onClick: () => navigator.clipboard.writeText(selectedMeeting.conferenceUrl ?? ""), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Copy meeting link" })), _jsx("a", { href: `mailto:${encodeURIComponent(selectedMeeting.guestEmail)}`, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Email guest" }), _jsx("button", { onClick: () => setCancelTargetMeeting(selectedMeeting), disabled: selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED || cancellingMeetingId === selectedMeeting.bookingId, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#b91c1c] disabled:opacity-60", children: cancellingMeetingId === selectedMeeting.bookingId ? "Cancelling..." : selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "Already cancelled" : "Cancel meeting" })] })] }) })), _jsx(ConfirmDialog, { open: Boolean(cancelTargetMeeting), tone: "danger", pending: Boolean(cancelTargetMeeting && cancellingMeetingId === cancelTargetMeeting.bookingId), title: "Cancel this meeting?", description: cancelTargetMeeting ? `This will cancel the meeting with ${cancelTargetMeeting.guestName}.` : "This will cancel this meeting.", confirmLabel: "Yes, cancel meeting", cancelLabel: "Keep meeting", onCancel: () => setCancelTargetMeeting(null), onConfirm: async () => {
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
    return (_jsxs("div", { className: "rounded-xl border border-[#e2e8f0] bg-[#fcfdff] px-3 py-2", children: [_jsx("div", { className: "text-[11px] uppercase tracking-[0.12em] text-[#64748b]", children: label }), _jsx("div", { className: "mt-1 text-[#0f172a] break-all", children: value })] }));
}
