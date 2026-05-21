import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { opsLogger } from "@/lib/opsLogger";
import { AvailabilitySourcesPage } from "@/pages/availability/AvailabilitySourcesPage";
import { DashboardWorkspaceChrome } from "@/pages/dashboard/DashboardWorkspaceChrome";
import { DashboardIntegrationsSection } from "@/pages/dashboard/sections/DashboardIntegrationsSection";
import { DashboardLinkedAccountsSection } from "@/pages/dashboard/sections/DashboardLinkedAccountsSection";
import { DashboardParticipationSection } from "@/pages/dashboard/sections/DashboardParticipationSection";
import { DashboardEventEditorSection } from "@/pages/dashboard/sections/DashboardEventEditorSection";
import "./dashboard/dashboard.css";
// ── Constants ──────────────────────────────────────────────────────────────────
const MEETINGS_LIMIT = 50;
const MEETINGS_POLL_MS = 15000;
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEK_DAYS_ALL = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
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
function zonedParts(value, timeZone) {
    const date = typeof value === "string" ? new Date(value) : value;
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: Number(get("hour")),
        minute: Number(get("minute")),
    };
}
function dayKeyFromDate(d, timeZone) {
    const p = zonedParts(d, timeZone);
    return `${p.year}-${p.month}-${p.day}`;
}
function formatRuleRange(rule) {
    if (!rule.enabled)
        return "Unavailable";
    return `${to12h(rule.startTime)} - ${to12h(rule.endTime)}`;
}
const CAL_START_MINUTES = 0;
const CAL_END_MINUTES = 24 * 60;
const CAL_PX_PER_MINUTE = 0.7;
function toDayMinutes(value, timeZone) {
    const p = zonedParts(value, timeZone);
    return p.hour * 60 + p.minute;
}
function isRenderableAvailabilityMeeting(meeting) {
    const status = String(meeting.bookingStatus ?? "").toUpperCase();
    const externalState = String(meeting.externalLifecycleState ?? "").toUpperCase();
    if (status === "CANCELLED" || status === "EXPIRED")
        return false;
    if (externalState === "TERMINAL_EXTERNAL_DELETE" || externalState === "EXTERNALLY_CANCELLED")
        return false;
    if (meeting.reconcileSuppressed === true)
        return false;
    return true;
}
function buildPositionedDayEvents(dayMeetings, timeZone) {
    if (dayMeetings.length === 0)
        return [];
    const events = dayMeetings
        .map((meeting, idx) => {
        const startMinutes = Math.max(CAL_START_MINUTES, Math.min(CAL_END_MINUTES, toDayMinutes(meeting.startTime, timeZone)));
        const endMinutes = Math.max(startMinutes + 10, Math.min(CAL_END_MINUTES, toDayMinutes(meeting.endTime, timeZone)));
        return {
            meeting,
            startMinutes,
            endMinutes,
            idx,
        };
    })
        .sort((a, b) => (a.startMinutes - b.startMinutes) || (a.endMinutes - b.endMinutes));
    const result = [];
    const n = events.length;
    let i = 0;
    while (i < n) {
        let clusterEnd = events[i].endMinutes;
        let j = i + 1;
        while (j < n && events[j].startMinutes < clusterEnd) {
            clusterEnd = Math.max(clusterEnd, events[j].endMinutes);
            j += 1;
        }
        const cluster = events.slice(i, j);
        const laneEndTimes = [];
        const laneByEvent = new Map();
        cluster.forEach((event) => {
            let lane = laneEndTimes.findIndex((laneEnd) => laneEnd <= event.startMinutes);
            if (lane === -1) {
                lane = laneEndTimes.length;
                laneEndTimes.push(event.endMinutes);
            }
            else {
                laneEndTimes[lane] = event.endMinutes;
            }
            laneByEvent.set(event.idx, lane);
        });
        const laneCount = Math.max(1, laneEndTimes.length);
        cluster.forEach((event) => {
            const lane = laneByEvent.get(event.idx) ?? 0;
            const tone = event.idx % 4 === 0 ? "meetings" : event.idx % 4 === 1 ? "focus" : event.idx % 4 === 2 ? "external" : "buffer";
            result.push({
                meeting: event.meeting,
                top: (event.startMinutes - CAL_START_MINUTES) * CAL_PX_PER_MINUTE,
                height: Math.max(18, (event.endMinutes - event.startMinutes) * CAL_PX_PER_MINUTE),
                width: 100 / laneCount,
                left: (100 / laneCount) * lane,
                tone,
            });
        });
        i = j;
    }
    return result;
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
        : path === "/dashboard/event-editor"
            ? "event-editor"
            : path === "/dashboard/availability/sources"
                ? "availability-sources"
                : path === "/dashboard/availability"
                    ? "availability"
                    : path === "/dashboard/integrations"
                        ? "integrations"
                        : path === "/dashboard/linked-accounts"
                            ? "linked-accounts"
                            : path === "/dashboard/participation"
                                ? "participation"
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
    const [avatarFailed, setAvatarFailed] = useState(false);
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
    const [rhythmEditorOpen, setRhythmEditorOpen] = useState(false);
    const [availabilityWeekOffset, setAvailabilityWeekOffset] = useState(0);
    const [loadingOverrides, setLoadingOverrides] = useState(true);
    const [submittingOverride, setSubmittingOverride] = useState(false);
    const [overrides, setOverrides] = useState([]);
    const [overridePanelOpen, setOverridePanelOpen] = useState(false);
    const [overrideMode, setOverrideMode] = useState("UNAVAILABLE");
    const [overrideDate, setOverrideDate] = useState("");
    const [overrideStartTime, setOverrideStartTime] = useState("09:00");
    const [overrideEndTime, setOverrideEndTime] = useState("13:00");
    const { calendarStatus, conferencingStatus, calendarCapabilities, conferencingCapabilities, loading: integrationsLoading, error: integrationsError, banner, clearBanner, getCalendarProviderStatus, getConferencingProviderStatus, startConnect, disconnectProvider, pendingAction, refreshStatus, } = useIntegrationState();
    const timezone = getBrowserTimeZone();
    const availabilityScrollRef = useRef(null);
    const availabilityRhythmRef = useRef(null);
    const availabilityOverridesRef = useRef(null);
    const availabilityWeek = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setDate(monday.getDate() + availabilityWeekOffset * 7);
        monday.setHours(0, 0, 0, 0);
        return Array.from({ length: 5 }).map((_, idx) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + idx);
            return {
                date,
                key: dayKeyFromDate(date, timezone),
                label: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
                short: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            };
        });
    }, [availabilityWeekOffset, timezone]);
    const availabilityWeekLabel = useMemo(() => {
        const first = availabilityWeek[0]?.date;
        const last = availabilityWeek[availabilityWeek.length - 1]?.date;
        if (!first || !last)
            return "This week";
        const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${fmt(first)} - ${fmt(last)}`;
    }, [availabilityWeek]);
    const availabilityMeetingsByDay = useMemo(() => {
        const map = new Map();
        for (const day of availabilityWeek)
            map.set(day.key, []);
        meetings.forEach((meeting) => {
            if (!isRenderableAvailabilityMeeting(meeting))
                return;
            const date = new Date(meeting.startTime);
            const key = dayKeyFromDate(date, timezone);
            if (!map.has(key))
                return;
            map.get(key).push(meeting);
        });
        map.forEach((value) => value.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
        return map;
    }, [availabilityWeek, meetings, timezone]);
    const availabilityPositionedByDay = useMemo(() => {
        const map = new Map();
        availabilityWeek.forEach((day) => {
            map.set(day.key, buildPositionedDayEvents(availabilityMeetingsByDay.get(day.key) ?? [], timezone));
        });
        return map;
    }, [availabilityMeetingsByDay, availabilityWeek, timezone]);
    const availabilityWindow = useMemo(() => {
        const enabledRules = WEEK_DAYS_ALL.map((d) => weeklyRules[d]).filter((r) => r.enabled);
        if (enabledRules.length === 0) {
            return { startMinutes: 9 * 60, endMinutes: 17 * 60 };
        }
        const starts = enabledRules.map((r) => {
            const [h, m] = r.startTime.split(":").map(Number);
            return h * 60 + m;
        });
        const ends = enabledRules.map((r) => {
            const [h, m] = r.endTime.split(":").map(Number);
            return h * 60 + m;
        });
        return {
            startMinutes: Math.max(0, Math.min(...starts)),
            endMinutes: Math.min(24 * 60, Math.max(...ends)),
        };
    }, [weeklyRules]);
    const availabilityViewportHeight = useMemo(() => {
        const duration = Math.max(240, availabilityWindow.endMinutes - availabilityWindow.startMinutes);
        return Math.max(420, Math.min(760, Math.round(duration * CAL_PX_PER_MINUTE * 1.35)));
    }, [availabilityWindow.endMinutes, availabilityWindow.startMinutes]);
    useLayoutEffect(() => {
        if (section !== "availability")
            return;
        const node = availabilityScrollRef.current;
        if (!node)
            return;
        const target = Math.max(0, (availabilityWindow.startMinutes - 45) * CAL_PX_PER_MINUTE);
        const apply = () => {
            node.scrollTop = target;
        };
        apply();
        const raf = window.requestAnimationFrame(apply);
        return () => window.cancelAnimationFrame(raf);
    }, [availabilityPositionedByDay, availabilityWeekOffset, availabilityWindow.startMinutes, section]);
    useEffect(() => {
        if (section !== "availability")
            return;
        const params = new URLSearchParams(location.search);
        const panel = params.get("panel");
        if (!panel)
            return;
        if (panel === "overrides") {
            setOverridePanelOpen(true);
            availabilityOverridesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (panel === "rules" || panel === "hours") {
            availabilityRhythmRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [location.search, section]);
    const availabilityInsights = useMemo(() => {
        const weekMeetings = availabilityWeek.flatMap((d) => availabilityMeetingsByDay.get(d.key) ?? []);
        const externalCount = weekMeetings.filter((m) => (m.provider ?? "").toLowerCase() !== "google").length;
        const focusHours = Math.max(0, 20 - weekMeetings.length * 0.6);
        return {
            reclaimed: `${Math.floor(focusHours)}h ${Math.round((focusHours % 1) * 60)}m`,
            conflicts: weekMeetings.filter((m) => String(m.bookingStatus).toUpperCase() === "RESCHEDULED").length,
            buffer: `${Math.max(10, weekMeetings.length * 5)} min`,
            externalCount,
        };
    }, [availabilityMeetingsByDay, availabilityWeek]);
    const connectedProviderCount = useMemo(() => {
        const calendarConnected = Object.keys(calendarStatus).filter((provider) => getCalendarProviderStatus(provider) === "connected").length;
        const conferencingConnected = Object.keys(conferencingStatus).filter((provider) => getConferencingProviderStatus(provider) === "connected").length;
        return calendarConnected + conferencingConnected;
    }, [calendarStatus, conferencingStatus, getCalendarProviderStatus, getConferencingProviderStatus]);
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
        setAvatarFailed(false);
    }, [user?.profileImage]);
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
    return (_jsxs("div", { className: "dash-root", children: [_jsxs(DashboardWorkspaceChrome, { section: section, path: path, brandHref: brandHref, firstName: firstName, meetingsCount: meetingBuckets.upcoming.length || undefined, eventsCount: events.length || undefined, userName: user?.name || user?.email || "User", userEmail: user?.email || "host", userAvatarUrl: user?.profileImage, avatarFailed: avatarFailed, menuOpen: menuOpen, logoutLoading: logoutLoading, onMenuToggle: () => setMenuOpen((p) => !p), onAvatarError: () => setAvatarFailed(true), onMenuClose: () => setMenuOpen(false), onLogout: handleLogout, children: [section === "meetings" && (_jsxs(_Fragment, { children: [_jsx("div", { className: "dash-section", children: _jsxs("div", { className: "next-grid", children: [_jsx("div", { className: "next-card", children: nextMeeting ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Next up" }), _jsx("div", { className: "countdown", children: formatRelativeDay(nextMeeting.startTime) }), _jsxs("div", { className: "next-card-date-line", children: [new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), _jsx("span", { style: { color: "var(--plum-300)" }, children: "\u00B7" }), formatWindow(nextMeeting.startTime, nextMeeting.endTime).time] }), _jsxs("div", { className: "who", style: { marginTop: 18 }, children: [_jsx("div", { className: "av", children: (nextMeeting.guestName || "G")[0]?.toUpperCase() }), _jsxs("div", { children: [_jsx("div", { className: "name", children: nextMeeting.guestName }), _jsx("div", { className: "meta", children: nextMeeting.eventTypeName })] })] })] }), _jsxs("div", { className: "next-meta-row", children: [_jsxs("span", { className: "meta-pill", children: [_jsx("span", { className: "dot" }), nextMeeting.bookingStatus] }), _jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em", color: "var(--plum-500)", textTransform: "none" }, children: nextMeeting.guestEmail }), _jsx("button", { className: "dash-btn-secondary", style: { marginLeft: "auto", fontSize: 12.5, padding: "5px 14px" }, onClick: () => setSelectedMeeting(nextMeeting), children: "Details" })] })] })) : (_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Next up" }), _jsx("div", { className: "countdown", style: { marginTop: 10 }, children: "All clear." }), _jsx("div", { style: { fontSize: 14, color: "var(--plum-500)", marginTop: 10 }, children: "No upcoming meetings scheduled." })] })) }), _jsxs("div", { className: "stats-col", children: [_jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Today" }), _jsx("div", { className: "value", children: todayCount }), _jsx("div", { className: "hint", children: "meetings scheduled" })] }), _jsx("div", { className: "tint", style: { background: "var(--lilac-soft)" } })] }), _jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Upcoming" }), _jsx("div", { className: "value", children: meetingBuckets.upcoming.length }), _jsx("div", { className: "hint", children: "total confirmed" })] }), _jsx("div", { className: "tint", style: { background: "var(--peach-soft)" } })] }), _jsxs("div", { className: "stat-tile", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "Hidden" }), _jsx("div", { className: "value", children: hiddenMeetingIds.length }), hiddenMeetingIds.length > 0 ? (_jsx("button", { onClick: clearHiddenMeetings, style: { fontSize: 12, color: "var(--plum-500)", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--sans)" }, children: "Restore" })) : (_jsx("div", { className: "hint", children: "archived meetings" }))] }), _jsx("div", { className: "tint", style: { background: "var(--butter-soft)" } })] })] })] }) }), _jsxs("div", { className: "dash-status-bar", children: [_jsxs("span", { className: clsx("dbadge", events.length > 0 ? "ok" : "hold"), children: [_jsx("span", { className: "dot" }), events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types"] }), _jsxs("span", { className: clsx("dbadge", connectedProviderCount > 0 ? "synced" : "hold"), children: [_jsx("span", { className: "dot" }), connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} active` : "No integrations connected"] })] }), _jsxs("div", { className: "dash-section", children: [_jsxs("div", { className: "dash-section-head", children: [_jsx("div", { children: _jsxs("h2", { children: ["Your ", _jsx("em", { children: "meetings" })] }) }), _jsxs("div", { className: "dash-tabs", children: [_jsxs("button", { className: clsx("dash-tab", meetingTab === "upcoming" && "active"), onClick: () => setMeetingTab("upcoming"), children: ["Upcoming (", meetingBuckets.upcoming.length, ")"] }), _jsxs("button", { className: clsx("dash-tab", meetingTab === "past" && "active"), onClick: () => setMeetingTab("past"), children: ["Past (", meetingBuckets.past.length, ")"] }), _jsxs("button", { className: clsx("dash-tab", meetingTab === "cancelled" && "active"), onClick: () => setMeetingTab("cancelled"), children: ["Cancelled (", meetingBuckets.cancelled.length, ")"] })] })] }), meetingsError && (_jsxs("div", { className: "dash-alert error", children: [_jsx("span", { children: meetingsError }), user?.id && (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, onClick: () => void loadMeetings(user.id), children: "Retry" }))] })), meetingsLoading ? (_jsx("div", { children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "dash-skel", style: { height: 88, marginBottom: 12 } }, i))) })) : displayedMeetings.length === 0 ? (_jsxs("div", { className: "dash-empty", children: [_jsxs("h3", { children: ["No ", meetingTab, " meetings"] }), _jsx("p", { children: "This view is clear right now." })] })) : (_jsx("div", { className: "meet-list", children: displayedMeetings.map((meeting) => {
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
                                        }) }))] })] })), section === "availability-sources" && (_jsx(AvailabilitySourcesPage, {})), section === "availability" && (_jsxs(_Fragment, { children: [availabilityError && _jsx("div", { className: "dash-alert error", children: availabilityError }), _jsxs("div", { className: "dash-section av-studio", children: [_jsxs("div", { className: "panel av-rhythm-panel", ref: availabilityRhythmRef, children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Weekly rhythm" }), _jsx("div", { className: "sub", children: timezone })] }), _jsxs("div", { className: "av-rhythm-actions", children: [_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => setRhythmEditorOpen((v) => !v), children: rhythmEditorOpen ? "Hide editor" : "Edit" }), _jsx(Button, { onClick: saveWeeklyAvailability, loading: availabilitySaving, size: "sm", children: "Save" })] })] }), _jsx("div", { className: "mini-avail av-rhythm-grid", children: WEEK_DAYS_ALL.map((day, idx) => {
                                                    const lbl = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx];
                                                    const rule = weeklyRules[day];
                                                    const startH = rule.enabled ? parseInt(rule.startTime.split(":")[0], 10) : -1;
                                                    const endH = rule.enabled ? parseInt(rule.endTime.split(":")[0], 10) : -1;
                                                    return (_jsxs("div", { className: clsx("ma-day", !rule.enabled && "off"), children: [_jsx("div", { className: "lbl", children: lbl }), _jsx("div", { className: "av-range", children: formatRuleRange(rule) }), _jsx("div", { className: "ma-bar", children: Array.from({ length: 24 }).map((_, h) => (_jsx("div", { className: clsx("cell", rule.enabled && h >= startH && h < endH && "on") }, h))) }), _jsxs("div", { className: "av-axis", children: [_jsx("span", { children: "12A" }), _jsx("span", { children: "6A" }), _jsx("span", { children: "12P" }), _jsx("span", { children: "6P" })] })] }, day));
                                                }) }), _jsxs("div", { className: "av-tz-note", children: ["All times shown in ", timezone] }), rhythmEditorOpen && (_jsx("div", { className: "av-rhythm-editor", children: WEEK_DAYS_ALL.map((day) => {
                                                    const dayLabel = day.slice(0, 1) + day.slice(1).toLowerCase();
                                                    return (_jsxs("div", { className: "avail-day-row", children: [_jsx("div", { style: { fontWeight: 500, color: "var(--plum-900)", fontSize: 14 }, children: dayLabel }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Start" }), _jsx("input", { type: "time", value: weeklyRules[day].startTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "dash-input" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "End" }), _jsx("input", { type: "time", value: weeklyRules[day].endTime, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } })), disabled: !weeklyRules[day].enabled, className: "dash-input" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--plum-500)", paddingTop: 22, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: weeklyRules[day].enabled, onChange: (e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } })), style: { accentColor: "var(--lilac)", width: 16, height: 16 } }), "Active"] })] }, day));
                                                }) }))] }), _jsxs("div", { className: "panel av-calendar-panel", children: [_jsxs("div", { className: "h", children: [_jsx("div", { children: _jsx("h3", { children: "Your calendar" }) }), _jsxs("div", { className: "av-calendar-controls", children: [_jsx("button", { type: "button", className: "dash-btn-secondary", onClick: () => setAvailabilityWeekOffset((v) => v - 1), children: "\u2190" }), _jsx("button", { type: "button", className: "dash-btn-secondary", onClick: () => setAvailabilityWeekOffset(0), children: "This week" }), _jsx("div", { className: "range", children: availabilityWeekLabel }), _jsx("button", { type: "button", className: "dash-btn-secondary", onClick: () => setAvailabilityWeekOffset((v) => v + 1), children: "\u2192" })] })] }), _jsxs("div", { className: "av-grid-shell", style: { ["--av-viewport-h"]: `${availabilityViewportHeight}px` }, children: [_jsx("div", { className: "av-time-col-head", "aria-hidden": "true" }), _jsx("div", { className: "av-day-head-row", children: availabilityWeek.map((day) => (_jsxs("div", { className: "av-col-head", children: [day.label, " ", _jsx("span", { children: day.short })] }, day.key))) }), _jsx("div", { className: "av-grid-scroll", ref: availabilityScrollRef, children: _jsxs("div", { className: "av-grid-inner", children: [_jsx("div", { className: "av-time-col", "aria-hidden": "true", children: Array.from({ length: 24 }).map((_, h) => (_jsx("div", { className: "av-time-cell", children: new Date(2026, 0, 1, h).toLocaleTimeString([], { hour: "numeric", timeZone: timezone }) }, h))) }), _jsx("div", { className: "av-calendar-grid", children: availabilityWeek.map((day) => (_jsx("div", { className: "av-col", children: _jsxs("div", { className: "av-col-body", children: [_jsx("div", { className: "av-grid-lines", "aria-hidden": "true", children: Array.from({ length: 24 }).map((_, h) => (_jsx("div", { className: "hour" }, h))) }), _jsx("div", { className: "av-active-window", style: {
                                                                                        top: `${availabilityWindow.startMinutes * CAL_PX_PER_MINUTE}px`,
                                                                                        height: `${Math.max(60, (availabilityWindow.endMinutes - availabilityWindow.startMinutes) * CAL_PX_PER_MINUTE)}px`,
                                                                                    }, "aria-hidden": "true" }), (availabilityPositionedByDay.get(day.key) ?? []).map((item) => ((() => {
                                                                                    const compact = item.height < 46;
                                                                                    const tiny = item.height < 30;
                                                                                    return (_jsxs("div", { className: clsx("av-event", item.tone, compact && "compact", tiny && "tiny"), "data-tooltip": `${item.meeting.eventTypeName} • ${item.meeting.guestName}`, "aria-label": `${item.meeting.eventTypeName} with ${item.meeting.guestName}`, style: {
                                                                                            top: `${item.top}px`,
                                                                                            height: `${item.height}px`,
                                                                                            width: `calc(${item.width}% - 4px)`,
                                                                                            left: `calc(${item.left}% + 2px)`,
                                                                                        }, children: [!tiny && (_jsxs("div", { className: "meta", children: [item.meeting.guestName, " \u00B7 ", new Date(item.meeting.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone })] })), _jsx("div", { className: "name", children: item.meeting.eventTypeName })] }, item.meeting.bookingId));
                                                                                })())), (availabilityPositionedByDay.get(day.key) ?? []).length === 0 && (_jsx("div", { className: "av-empty", children: "No meetings" }))] }) }, day.key))) })] }) })] })] }), _jsxs("div", { className: "av-bottom-grid", children: [_jsxs("div", { className: "panel", ref: availabilityOverridesRef, children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Date overrides" }), _jsx("div", { className: "sub", children: "Exceptions for vacations, holidays or custom hours" })] }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => setOverridePanelOpen((v) => !v), "aria-expanded": overridePanelOpen, children: overridePanelOpen ? "Close" : "Add override" })] }), overridePanelOpen && (_jsxs("div", { style: { marginBottom: 20, padding: 20, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 16 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }, role: "group", "aria-label": "Override mode", children: [_jsx("button", { className: clsx("dash-tab", overrideMode === "UNAVAILABLE" && "active"), onClick: () => setOverrideMode("UNAVAILABLE"), children: "Unavailable all day" }), _jsx("button", { className: clsx("dash-tab", overrideMode === "CUSTOM_HOURS" && "active"), onClick: () => setOverrideMode("CUSTOM_HOURS"), children: "Custom hours" })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "repeat(3,1fr)" : "200px", gap: 12 }, children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Date" }), _jsx("input", { type: "date", value: overrideDate, onChange: (e) => setOverrideDate(e.target.value), className: "dash-input" })] }), overrideMode === "CUSTOM_HOURS" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Start" }), _jsx("input", { type: "time", value: overrideStartTime, onChange: (e) => setOverrideStartTime(e.target.value), className: "dash-input" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "End" }), _jsx("input", { type: "time", value: overrideEndTime, onChange: (e) => setOverrideEndTime(e.target.value), className: "dash-input" })] })] }))] }), overrideValidationMessage && (_jsx("p", { style: { marginTop: 10, fontSize: 12.5, color: "#991B1B" }, role: "alert", children: overrideValidationMessage })), _jsx("div", { style: { marginTop: 16, display: "flex", justifyContent: "flex-end" }, children: _jsx(Button, { onClick: createOverride, disabled: !!overrideValidationMessage, loading: submittingOverride, size: "sm", children: "Save override" }) })] })), loadingOverrides ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: Array.from({ length: 2 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 56 } }, i)) })) : overrides.length === 0 ? (_jsxs("div", { className: "dash-empty", style: { padding: "20px 8px" }, children: [_jsx("h3", { children: "No overrides" }), _jsx("p", { children: "Add a date override for schedule exceptions." })] })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: overrides.map((ovr) => {
                                                            const available = isAvailableOverride(ovr);
                                                            return (_jsxs("div", { className: "override-row", children: [_jsxs("div", { children: [_jsx("div", { className: "date", children: humanDate(ovr.date, timezone) }), _jsx("div", { className: "detail", children: available ? `Available ${to12h(ovr.startTime)} - ${to12h(ovr.endTime)}` : "Unavailable all day" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsxs("span", { className: clsx("dbadge", available ? "ok" : "hold"), children: [_jsx("span", { className: "dot" }), available ? "Custom hours" : "Unavailable"] }), _jsx("button", { type: "button", onClick: () => removeOverride(ovr.id), style: { fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)" }, "aria-label": `Delete override for ${humanDate(ovr.date, timezone)}`, children: "Delete" })] })] }, ovr.id));
                                                        }) }))] }), _jsxs("div", { className: "av-insights", children: [_jsxs("div", { className: "panel stat", children: [_jsx("div", { className: "k", children: "Time reclaimed" }), _jsx("div", { className: "v", children: availabilityInsights.reclaimed }), _jsx("div", { className: "d", children: "of focus saved this week" })] }), _jsxs("div", { className: "panel stat", children: [_jsx("div", { className: "k", children: "Conflicts resolved" }), _jsx("div", { className: "v", children: availabilityInsights.conflicts }), _jsx("div", { className: "d", children: "quietly rescheduled in advance" })] }), _jsxs("div", { className: "panel stat", children: [_jsx("div", { className: "k", children: "Buffer added" }), _jsx("div", { className: "v", children: availabilityInsights.buffer }), _jsx("div", { className: "d", children: "between back-to-backs" })] })] })] })] })] })), section === "event-types" && (_jsxs("div", { className: "dash-section", children: [_jsxs("div", { className: "dash-section-head", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Reusable ", _jsx("em", { children: "templates" })] }), _jsx("div", { className: "sub", children: "Public booking links with consistent scheduling behavior." })] }), _jsx(Link, { to: "/onboarding/event", className: "dash-link", children: "Create event \u2192" })] }), eventsError && (_jsxs("div", { className: "dash-alert error", children: [_jsx("span", { children: eventsError }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "5px 12px" }, onClick: () => void loadEventTypes(), children: "Retry" })] })), eventsLoading ? (_jsx("div", { className: "et-list", children: Array.from({ length: 4 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 64 } }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "dash-empty", children: [_jsx("h3", { children: "No event types yet" }), _jsx("p", { children: "Create one event and your reusable booking links will appear here." }), _jsx(Link, { to: "/onboarding/event", className: "dash-btn-primary", style: { marginTop: 20 }, children: "Create event" })] })) : (_jsx("div", { className: "et-list", children: events.map((event, idx) => {
                                    const stripes = ["lilac", "peach", "sage", "blush"];
                                    const stripe = stripes[idx % stripes.length];
                                    const url = bookingUrl(event);
                                    return (_jsxs("div", { className: "et-row", children: [_jsx("div", { className: clsx("stripe", stripe) }), _jsxs("div", { children: [_jsx("div", { className: "name", children: event.name }), _jsxs("div", { className: "slug", children: ["/", event.slug] })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, onClick: () => navigator.clipboard.writeText(url), children: "Copy link" }), _jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, children: "Preview" }), _jsx(Link, { to: "/onboarding/event", className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, children: "Configure" })] })] }, event.id));
                                }) }))] })), section === "integrations" && (_jsx(DashboardIntegrationsSection, { banner: banner, integrationsError: integrationsError, clearBanner: clearBanner, integrationsLoading: integrationsLoading, refreshStatus: refreshStatus, pendingAction: pendingAction, calendarStatus: calendarStatus, conferencingStatus: conferencingStatus, calendarCapabilities: calendarCapabilities, conferencingCapabilities: conferencingCapabilities, getCalendarProviderStatus: getCalendarProviderStatus, getConferencingProviderStatus: getConferencingProviderStatus, onRequestDisconnect: (kind, provider) => setDisconnectTarget({ kind, provider }), onConnectCalendar: connectCalendar, onConnectConferencing: connectConferencing })), section === "event-editor" && (_jsx(DashboardEventEditorSection, { events: events, eventsLoading: eventsLoading, eventsError: eventsError, onReload: loadEventTypes })), section === "linked-accounts" && (_jsx(DashboardLinkedAccountsSection, {})), section === "participation" && (_jsx(DashboardParticipationSection, {})), section === "settings" && (_jsx("div", { className: "dash-section", children: _jsxs("div", { className: "split-grid", children: [_jsxs("div", { className: "panel", children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Event types" }), _jsx("div", { className: "sub", children: "Reusable booking templates and links" })] }) }), _jsx(Link, { to: "/dashboard/event-types", className: "dash-btn-secondary", style: { width: "fit-content" }, children: "Manage \u2192" })] }), _jsxs("div", { className: "panel", children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Integrations" }), _jsx("div", { className: "sub", children: "Calendar and conferencing connections" })] }) }), _jsx(Link, { to: "/dashboard/integrations", className: "dash-btn-secondary", style: { width: "fit-content" }, children: "Manage \u2192" })] })] }) }))] }), selectedMeeting && (_jsxs(Dialog, { open: true, onClose: () => setSelectedMeeting(null), title: `${selectedMeeting.guestName} · ${selectedMeeting.eventTypeName}`, width: "lg", footer: _jsxs("div", { className: "flex flex-wrap gap-2 w-full", children: [buildInvitationActions({
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
