import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
import clsx from "@/lib/clsx";
import { Button, Dialog } from "@/ui/controls";
import type {
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  DayOfWeek,
  EventTypeSummaryResponse,
  HostMeetingResponse,
} from "@/services/types";
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
const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEK_DAYS_ALL: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const HIDDEN_KEY_PREFIX = "dashboard-hidden-meeting-ids";

type MeetingTab = "upcoming" | "past" | "cancelled";
type OverrideMode = "UNAVAILABLE" | "CUSTOM_HOURS";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatWindow(startTime: string, endTime: string) {
  return formatMeetingDateAndTimeRange(startTime, endTime);
}

function formatRelativeDay(startTime: string) {
  const start = new Date(startTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diff = Math.round((that.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return "Past";
  return `In ${diff} days`;
}

function humanDate(date: string, tz: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
}

function to12h(hhmm?: string | null) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function zonedParts(value: string | Date, timeZone: string) {
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
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function dayKeyFromDate(d: Date, timeZone: string) {
  const p = zonedParts(d, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

function formatRuleRange(rule: { enabled: boolean; startTime: string; endTime: string }) {
  if (!rule.enabled) return "Unavailable";
  return `${to12h(rule.startTime)} - ${to12h(rule.endTime)}`;
}

interface PositionedDayEvent {
  meeting: HostMeetingResponse;
  top: number;
  height: number;
  left: number;
  width: number;
  tone: "meetings" | "focus" | "external" | "buffer";
}

const CAL_START_MINUTES = 0;
const CAL_END_MINUTES = 24 * 60;
const CAL_PX_PER_MINUTE = 0.7;

function toDayMinutes(value: string, timeZone: string) {
  const p = zonedParts(value, timeZone);
  return p.hour * 60 + p.minute;
}

function isRenderableAvailabilityMeeting(meeting: HostMeetingResponse) {
  const status = String(meeting.bookingStatus ?? "").toUpperCase();
  const externalState = String(meeting.externalLifecycleState ?? "").toUpperCase();
  if (status === "CANCELLED" || status === "EXPIRED") return false;
  if (externalState === "TERMINAL_EXTERNAL_DELETE" || externalState === "EXTERNALLY_CANCELLED") return false;
  if (meeting.reconcileSuppressed === true) return false;
  return true;
}

function buildPositionedDayEvents(dayMeetings: HostMeetingResponse[], timeZone: string): PositionedDayEvent[] {
  if (dayMeetings.length === 0) return [];

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

  const result: PositionedDayEvent[] = [];
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

    const laneEndTimes: number[] = [];
    const laneByEvent = new Map<number, number>();
    cluster.forEach((event) => {
      let lane = laneEndTimes.findIndex((laneEnd) => laneEnd <= event.startMinutes);
      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(event.endMinutes);
      } else {
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

function isAvailableOverride(ovr: AvailabilityOverrideResponse) {
  if (typeof ovr.available === "boolean") return ovr.available;
  if (typeof ovr.isAvailable === "boolean") return ovr.isAvailable;
  opsLogger.warn({
    category: "api_contract_mismatch",
    message: "Availability override missing availability flag",
    details: { overrideId: ovr.id },
  });
  return false;
}

function HiddenIdsStorageKey(userId: string) {
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
  const [events, setEvents] = useState<EventTypeSummaryResponse[]>([]);
  const [meetings, setMeetings] = useState<HostMeetingResponse[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [meetingTab, setMeetingTab] = useState<MeetingTab>("upcoming");
  const [selectedMeeting, setSelectedMeeting] = useState<HostMeetingResponse | null>(null);
  const [hiddenMeetingIds, setHiddenMeetingIds] = useState<string[]>([]);
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(null);
  const [hostActionError, setHostActionError] = useState<string | null>(null);
  const [cancelTargetMeeting, setCancelTargetMeeting] = useState<HostMeetingResponse | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<{ kind: "calendar" | "conferencing"; provider: string } | null>(null);
  const lifecycleRenderedRef = useRef<Set<string>>(new Set());
  const lifecycleMismatchRef = useRef<Set<string>>(new Set());

  const [weeklyRules, setWeeklyRules] = useState<Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>>({
    MONDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
    TUESDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
    WEDNESDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
    THURSDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
    FRIDAY: { enabled: true, startTime: "09:00", endTime: "17:00" },
    SATURDAY: { enabled: false, startTime: "09:00", endTime: "17:00" },
    SUNDAY: { enabled: false, startTime: "09:00", endTime: "17:00" },
  });
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [rhythmEditorOpen, setRhythmEditorOpen] = useState(false);
  const [availabilityWeekOffset, setAvailabilityWeekOffset] = useState(0);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrides, setOverrides] = useState<AvailabilityOverrideResponse[]>([]);
  const [overridePanelOpen, setOverridePanelOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const {
    calendarStatus,
    conferencingStatus,
    calendarCapabilities,
    conferencingCapabilities,
    loading: integrationsLoading,
    error: integrationsError,
    banner,
    clearBanner,
    getCalendarProviderStatus,
    getConferencingProviderStatus,
    startConnect,
    disconnectProvider,
    pendingAction,
    refreshStatus,
  } = useIntegrationState();

  const timezone = getBrowserTimeZone();
  const availabilityScrollRef = useRef<HTMLDivElement | null>(null);
  const availabilityRhythmRef = useRef<HTMLDivElement | null>(null);
  const availabilityOverridesRef = useRef<HTMLDivElement | null>(null);
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
    if (!first || !last) return "This week";
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(first)} - ${fmt(last)}`;
  }, [availabilityWeek]);

  const availabilityMeetingsByDay = useMemo(() => {
    const map = new Map<string, HostMeetingResponse[]>();
    for (const day of availabilityWeek) map.set(day.key, []);
    meetings.forEach((meeting) => {
      if (!isRenderableAvailabilityMeeting(meeting)) return;
      const date = new Date(meeting.startTime);
      const key = dayKeyFromDate(date, timezone);
      if (!map.has(key)) return;
      map.get(key)!.push(meeting);
    });
    map.forEach((value) => value.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    return map;
  }, [availabilityWeek, meetings, timezone]);

  const availabilityPositionedByDay = useMemo(() => {
    const map = new Map<string, PositionedDayEvent[]>();
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
    if (section !== "availability") return;
    const node = availabilityScrollRef.current;
    if (!node) return;
    const target = Math.max(0, (availabilityWindow.startMinutes - 45) * CAL_PX_PER_MINUTE);
    const apply = () => {
      node.scrollTop = target;
    };
    apply();
    const raf = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(raf);
  }, [availabilityPositionedByDay, availabilityWeekOffset, availabilityWindow.startMinutes, section]);

  useEffect(() => {
    if (section !== "availability") return;
    const params = new URLSearchParams(location.search);
    const panel = params.get("panel");
    if (!panel) return;

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
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(HiddenIdsStorageKey(user.id));
      setHiddenMeetingIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setHiddenMeetingIds([]);
    }
  }, [user?.id]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.profileImage]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(HiddenIdsStorageKey(user.id), JSON.stringify(hiddenMeetingIds));
  }, [hiddenMeetingIds, user?.id]);

  const loadMeetings = useCallback(async (hostId: string) => {
    try {
      const meetingList = await api.listHostMeetings(hostId, { upcomingOnly: false, limit: MEETINGS_LIMIT });
      setMeetings(meetingList);
      setMeetingsError(null);
    } catch (e) {
      console.error(e);
      setMeetingsError("Failed to load meetings.");
      setMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const loadEventTypes = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const eventTypes = await api.listEventTypes();
      setEvents(eventTypes);
    } catch (e) {
      console.error(e);
      setEventsError("Failed to load event type configuration.");
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadOverrides = useCallback(async () => {
    setLoadingOverrides(true);
    setAvailabilityError(null);
    try {
      const list = await api.getAvailabilityOverrides();
      setOverrides(list.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      console.error(e);
      setAvailabilityError("Unable to load date overrides.");
    } finally {
      setLoadingOverrides(false);
    }
  }, []);

  useEffect(() => {
    refreshUser().catch(() => {
      // Protected route already handles missing auth.
    });
    if (!user?.id) return;

    setMeetingsLoading(true);
    setMeetingsError(null);
    void loadEventTypes();

    void loadMeetings(user.id);
    void loadOverrides();
  }, [loadEventTypes, loadMeetings, loadOverrides, refreshUser, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
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

  const bookingUrl = (event: EventTypeSummaryResponse) => {
    if (event.link) return toAbsoluteUrl(event.link);
    const username = user?.username || "";
    return toAbsoluteUrl(toPublicBookingPath(username, event.slug));
  };

  const visibleMeetings = useMemo(() => meetings.filter((meeting) => !hiddenMeetingIds.includes(meeting.bookingId)), [meetings, hiddenMeetingIds]);

  const isTerminalExternalDelete = (meeting: HostMeetingResponse) => {
    return (meeting.externalLifecycleState ?? "").trim().toUpperCase() === "TERMINAL_EXTERNAL_DELETE";
  };

  const operationalBookingStatus = (meeting: HostMeetingResponse) => {
    return isTerminalExternalDelete(meeting) ? BookingLifecycleStatus.CANCELLED : meeting.bookingStatus;
  };

  const meetingBuckets = useMemo(() => {
    const now = Date.now();
    const cancelled = visibleMeetings.filter((m) => operationalBookingStatus(m) === BookingLifecycleStatus.CANCELLED);
    const upcoming = visibleMeetings.filter((m) => {
      const status = operationalBookingStatus(m);
      if (status === BookingLifecycleStatus.CANCELLED || status === BookingLifecycleStatus.EXPIRED) return false;
      return new Date(m.endTime).getTime() >= now;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const past = visibleMeetings.filter((m) => {
      const status = operationalBookingStatus(m);
      if (status === BookingLifecycleStatus.CANCELLED) return false;
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
  const hideMeeting = (bookingId: string) => {
    setHiddenMeetingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    if (selectedMeeting?.bookingId === bookingId) setSelectedMeeting(null);
  };

  const cancelMeetingAsHost = async (meeting: HostMeetingResponse) => {
    if (cancellingMeetingId) return;

    setHostActionError(null);
    setCancellingMeetingId(meeting.bookingId);
    try {
      await api.cancelHostBooking(meeting.bookingId, randomKey());
      setMeetings((prev) => prev.map((item) => (item.bookingId === meeting.bookingId ? { ...item, bookingStatus: BookingLifecycleStatus.CANCELLED } : item)));
      setSelectedMeeting((prev) => (prev && prev.bookingId === meeting.bookingId ? { ...prev, bookingStatus: BookingLifecycleStatus.CANCELLED } : prev));
    } catch (e) {
      console.error(e);
      setHostActionError("Unable to cancel meeting right now. Please retry.");
    } finally {
      setCancellingMeetingId(null);
    }
  };

  const clearHiddenMeetings = () => setHiddenMeetingIds([]);
  const dashboardReturnPath = `${location.pathname}${location.search}${location.hash}`;
  const connectCalendar = async (provider: string) => {
    await startConnect("calendar", provider, dashboardReturnPath);
  };
  const connectConferencing = async (provider: string) => {
    await startConnect("conferencing", provider, dashboardReturnPath);
  };

  const overrideValidationMessage = useMemo(() => {
    if (!overrideDate) return "Choose a date.";
    if (overrideMode === "CUSTOM_HOURS") {
      if (!overrideStartTime || !overrideEndTime) return "Select start and end time.";
      if (overrideEndTime <= overrideStartTime) return "End must be later than start.";
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
    } catch (e) {
      console.error(e);
      setAvailabilityError("Unable to save weekly availability.");
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const createOverride = async () => {
    if (overrideValidationMessage) return;
    setSubmittingOverride(true);
    setAvailabilityError(null);

    const payload: AvailabilityOverrideCreateRequest = overrideMode === "UNAVAILABLE"
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
    } catch (e) {
      console.error(e);
      setAvailabilityError("Unable to create override.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const removeOverride = async (id: string) => {
    const snapshot = overrides;
    setOverrides((prev) => prev.filter((x) => x.id !== id));
    try {
      await api.deleteAvailabilityOverride(id);
    } catch (e) {
      console.error(e);
      setOverrides(snapshot);
      setAvailabilityError("Unable to remove override.");
    }
  };

  return (
    <div className="dash-root">
      <DashboardWorkspaceChrome
        section={section}
        path={path}
        brandHref={brandHref}
        firstName={firstName}
        meetingsCount={meetingBuckets.upcoming.length || undefined}
        eventsCount={events.length || undefined}
        userName={user?.name || user?.email || "User"}
        userEmail={user?.email || "host"}
        userAvatarUrl={user?.profileImage}
        avatarFailed={avatarFailed}
        menuOpen={menuOpen}
        logoutLoading={logoutLoading}
        onMenuToggle={() => setMenuOpen((p) => !p)}
        onAvatarError={() => setAvatarFailed(true)}
        onMenuClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      >

          {/* ── Meetings ──────────────────────────────────────── */}
          {section === "meetings" && (
            <>
              <div className="dash-section">
                <div className="next-grid">
                  <div className="next-card">
                    {nextMeeting ? (
                      <>
                        <div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "var(--plum-400)" }}>
                            Next up
                          </div>
                          <div className="countdown">
                            {formatRelativeDay(nextMeeting.startTime)}
                          </div>
                          <div className="next-card-date-line">
                            {new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            <span style={{ color: "var(--plum-300)" }}>·</span>
                            {formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}
                          </div>
                          <div className="who" style={{ marginTop: 18 }}>
                            <div className="av">{(nextMeeting.guestName || "G")[0]?.toUpperCase()}</div>
                            <div>
                              <div className="name">{nextMeeting.guestName}</div>
                              <div className="meta">{nextMeeting.eventTypeName}</div>
                            </div>
                          </div>
                        </div>
                        <div className="next-meta-row">
                          <span className="meta-pill">
                            <span className="dot" />
                            {nextMeeting.bookingStatus}
                          </span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em", color: "var(--plum-500)", textTransform: "none" as const }}>
                            {nextMeeting.guestEmail}
                          </span>
                          <button
                            className="dash-btn-secondary"
                            style={{ marginLeft: "auto", fontSize: 12.5, padding: "5px 14px" }}
                            onClick={() => setSelectedMeeting(nextMeeting)}
                          >
                            Details
                          </button>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "var(--plum-400)" }}>
                          Next up
                        </div>
                        <div className="countdown" style={{ marginTop: 10 }}>
                          All clear.
                        </div>
                        <div style={{ fontSize: 14, color: "var(--plum-500)", marginTop: 10 }}>No upcoming meetings scheduled.</div>
                      </div>
                    )}
                  </div>

                  <div className="stats-col">
                    <div className="stat-tile">
                      <div>
                        <div className="label">Today</div>
                        <div className="value">{todayCount}</div>
                        <div className="hint">meetings scheduled</div>
                      </div>
                      <div className="tint" style={{ background: "var(--lilac-soft)" }} />
                    </div>
                    <div className="stat-tile">
                      <div>
                        <div className="label">Upcoming</div>
                        <div className="value">{meetingBuckets.upcoming.length}</div>
                        <div className="hint">total confirmed</div>
                      </div>
                      <div className="tint" style={{ background: "var(--peach-soft)" }} />
                    </div>
                    <div className="stat-tile">
                      <div>
                        <div className="label">Hidden</div>
                        <div className="value">{hiddenMeetingIds.length}</div>
                        {hiddenMeetingIds.length > 0 ? (
                          <button
                            onClick={clearHiddenMeetings}
                            style={{ fontSize: 12, color: "var(--plum-500)", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--sans)" }}
                          >
                            Restore
                          </button>
                        ) : (
                          <div className="hint">archived meetings</div>
                        )}
                      </div>
                      <div className="tint" style={{ background: "var(--butter-soft)" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-status-bar">
                <span className={clsx("dbadge", events.length > 0 ? "ok" : "hold")}>
                  <span className="dot" />
                  {events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types"}
                </span>
                <span className={clsx("dbadge", connectedProviderCount > 0 ? "synced" : "hold")}>
                  <span className="dot" />
                  {connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} active` : "No integrations connected"}
                </span>
              </div>

              <div className="dash-section">
                <div className="dash-section-head">
                  <div>
                    <h2>Your <em>meetings</em></h2>
                  </div>
                  <div className="dash-tabs">
                    <button className={clsx("dash-tab", meetingTab === "upcoming" && "active")} onClick={() => setMeetingTab("upcoming")}>
                      Upcoming ({meetingBuckets.upcoming.length})
                    </button>
                    <button className={clsx("dash-tab", meetingTab === "past" && "active")} onClick={() => setMeetingTab("past")}>
                      Past ({meetingBuckets.past.length})
                    </button>
                    <button className={clsx("dash-tab", meetingTab === "cancelled" && "active")} onClick={() => setMeetingTab("cancelled")}>
                      Cancelled ({meetingBuckets.cancelled.length})
                    </button>
                  </div>
                </div>

                {meetingsError && (
                  <div className="dash-alert error">
                    <span>{meetingsError}</span>
                    {user?.id && (
                      <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void loadMeetings(user.id)}>
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {meetingsLoading ? (
                  <div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="dash-skel" style={{ height: 88, marginBottom: 12 }} />
                    ))}
                  </div>
                ) : displayedMeetings.length === 0 ? (
                  <div className="dash-empty">
                    <h3>No {meetingTab} meetings</h3>
                    <p>This view is clear right now.</p>
                  </div>
                ) : (
                  <div className="meet-list">
                    {displayedMeetings.map((meeting) => {
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

                      return (
                        <div
                          key={meeting.bookingId}
                          className="meet-row"
                          style={terminalExternalDelete ? { borderLeft: "3px solid var(--blush)" } : undefined}
                        >
                          <div className="when">
                            <span className="rel">{dayTone}</span>
                            <span className="day">
                              {new Date(meeting.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <span className="time">{when.time}</span>
                          </div>
                          <div className="who">
                            <span className="name">{meeting.guestName} · {meeting.eventTypeName}</span>
                            <span className="ev">{meeting.guestEmail}</span>
                            {lifecycle && (
                              <span className="ev" style={{ fontSize: 12, color: terminalExternalDelete ? "#991B1B" : "var(--plum-400)" }}>
                                {lifecycle.detail}
                              </span>
                            )}
                          </div>
                          <div className="badges">
                            <span className={clsx("dbadge", opStatus === BookingLifecycleStatus.CONFIRMED && "ok", opStatus === BookingLifecycleStatus.PENDING && "hold", opStatus === BookingLifecycleStatus.CANCELLED && "danger")}>
                              <span className="dot" />
                              {terminalExternalDelete ? `Local: ${meeting.bookingStatus}` : opStatus}
                            </span>
                            {!terminalExternalDelete && (
                              <span className={clsx("dbadge", sync.tone === "good" && "synced", sync.tone === "warn" && "hold", sync.tone === "bad" && "danger")}>
                                <span className="dot" />
                                {sync.label}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            {actions.slice(0, 1).map((action) => (
                              <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }}>{action.label}</a>
                            ))}
                            <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => setSelectedMeeting(meeting)}>
                              Details
                            </button>
                            {(opStatus === BookingLifecycleStatus.EXPIRED || opStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (
                              <button
                                className="dash-btn-secondary"
                                style={{ fontSize: 11.5, padding: "3px 10px", opacity: 0.65 }}
                                onClick={() => hideMeeting(meeting.bookingId)}
                              >
                                Hide
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Availability sources ─────────────────────────── */}
          {section === "availability-sources" && (
            <AvailabilitySourcesPage />
          )}

          {/* ── Availability ──────────────────────────────────── */}
          {section === "availability" && (
            <>
              {availabilityError && <div className="dash-alert error">{availabilityError}</div>}

              <div className="dash-section av-studio">
                <div className="panel av-rhythm-panel" ref={availabilityRhythmRef}>
                  <div className="h">
                    <div>
                      <h3>Weekly rhythm</h3>
                      <div className="sub">{timezone}</div>
                    </div>
                    <div className="av-rhythm-actions">
                      <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => setRhythmEditorOpen((v) => !v)}>
                        {rhythmEditorOpen ? "Hide editor" : "Edit"}
                      </button>
                      <Button onClick={saveWeeklyAvailability} loading={availabilitySaving} size="sm">Save</Button>
                    </div>
                  </div>

                  <div className="mini-avail av-rhythm-grid">
                    {WEEK_DAYS_ALL.map((day, idx) => {
                      const lbl = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx];
                      const rule = weeklyRules[day];
                      const startH = rule.enabled ? parseInt(rule.startTime.split(":")[0], 10) : -1;
                      const endH = rule.enabled ? parseInt(rule.endTime.split(":")[0], 10) : -1;
                      return (
                        <div key={day} className={clsx("ma-day", !rule.enabled && "off")}>
                          <div className="lbl">{lbl}</div>
                          <div className="av-range">{formatRuleRange(rule)}</div>
                          <div className="ma-bar">
                            {Array.from({ length: 24 }).map((_, h) => (
                              <div key={h} className={clsx("cell", rule.enabled && h >= startH && h < endH && "on")} />
                            ))}
                          </div>
                          <div className="av-axis">
                            <span>12A</span><span>6A</span><span>12P</span><span>6P</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="av-tz-note">All times shown in {timezone}</div>

                  {rhythmEditorOpen && (
                    <div className="av-rhythm-editor">
                      {WEEK_DAYS_ALL.map((day) => {
                        const dayLabel = day.slice(0, 1) + day.slice(1).toLowerCase();
                        return (
                          <div key={day} className="avail-day-row">
                            <div style={{ fontWeight: 500, color: "var(--plum-900)", fontSize: 14 }}>{dayLabel}</div>
                            <div className="dash-field">
                              <label>Start</label>
                              <input
                                type="time"
                                value={weeklyRules[day].startTime}
                                onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                                disabled={!weeklyRules[day].enabled}
                                className="dash-input"
                              />
                            </div>
                            <div className="dash-field">
                              <label>End</label>
                              <input
                                type="time"
                                value={weeklyRules[day].endTime}
                                onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                                disabled={!weeklyRules[day].enabled}
                                className="dash-input"
                              />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--plum-500)", paddingTop: 22, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={weeklyRules[day].enabled}
                                onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                                style={{ accentColor: "var(--lilac)", width: 16, height: 16 }}
                              />
                              Active
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="panel av-calendar-panel">
                  <div className="h">
                    <div>
                      <h3>Your calendar</h3>
                    </div>
                    <div className="av-calendar-controls">
                      <button type="button" className="dash-btn-secondary" onClick={() => setAvailabilityWeekOffset((v) => v - 1)}>←</button>
                      <button type="button" className="dash-btn-secondary" onClick={() => setAvailabilityWeekOffset(0)}>This week</button>
                      <div className="range">{availabilityWeekLabel}</div>
                      <button type="button" className="dash-btn-secondary" onClick={() => setAvailabilityWeekOffset((v) => v + 1)}>→</button>
                    </div>
                  </div>
                  <div className="av-grid-shell" style={{ ["--av-viewport-h" as string]: `${availabilityViewportHeight}px` }}>
                    <div className="av-time-col-head" aria-hidden="true" />
                    <div className="av-day-head-row">
                      {availabilityWeek.map((day) => (
                        <div key={day.key} className="av-col-head">{day.label} <span>{day.short}</span></div>
                      ))}
                    </div>

                    <div className="av-grid-scroll" ref={availabilityScrollRef}>
                      <div className="av-grid-inner">
                        <div className="av-time-col" aria-hidden="true">
                          {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="av-time-cell">
                              {new Date(2026, 0, 1, h).toLocaleTimeString([], { hour: "numeric", timeZone: timezone })}
                            </div>
                          ))}
                        </div>
                        <div className="av-calendar-grid">
                          {availabilityWeek.map((day) => (
                            <div key={day.key} className="av-col">
                              <div className="av-col-body">
                                <div className="av-grid-lines" aria-hidden="true">
                                  {Array.from({ length: 24 }).map((_, h) => (
                                    <div key={h} className="hour" />
                                  ))}
                                </div>
                                <div
                                  className="av-active-window"
                                  style={{
                                    top: `${availabilityWindow.startMinutes * CAL_PX_PER_MINUTE}px`,
                                    height: `${Math.max(60, (availabilityWindow.endMinutes - availabilityWindow.startMinutes) * CAL_PX_PER_MINUTE)}px`,
                                  }}
                                  aria-hidden="true"
                                />
                              {(availabilityPositionedByDay.get(day.key) ?? []).map((item) => (
                                (() => {
                                  const compact = item.height < 46;
                                  const tiny = item.height < 30;
                                  return (
                                  <div
                                    key={item.meeting.bookingId}
                                    className={clsx("av-event", item.tone, compact && "compact", tiny && "tiny")}
                                    data-tooltip={`${item.meeting.eventTypeName} • ${item.meeting.guestName}`}
                                    aria-label={`${item.meeting.eventTypeName} with ${item.meeting.guestName}`}
                                    style={{
                                      top: `${item.top}px`,
                                      height: `${item.height}px`,
                                      width: `calc(${item.width}% - 4px)`,
                                      left: `calc(${item.left}% + 2px)`,
                                    }}
                                  >
                                    {!tiny && (
                                      <div className="meta">
                                        {item.meeting.guestName} · {new Date(item.meeting.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone })}
                                      </div>
                                    )}
                                    <div className="name">{item.meeting.eventTypeName}</div>
                                  </div>
                                  );
                                })()
                              ))}
                                {(availabilityPositionedByDay.get(day.key) ?? []).length === 0 && (
                                  <div className="av-empty">No meetings</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="av-bottom-grid">
                  <div className="panel" ref={availabilityOverridesRef}>
                    <div className="h">
                      <div>
                        <h3>Date overrides</h3>
                        <div className="sub">Exceptions for vacations, holidays or custom hours</div>
                      </div>
                      <button
                        className="dash-btn-secondary"
                        style={{ fontSize: 12.5, padding: "6px 14px" }}
                        onClick={() => setOverridePanelOpen((v) => !v)}
                        aria-expanded={overridePanelOpen}
                      >
                        {overridePanelOpen ? "Close" : "Add override"}
                      </button>
                    </div>

                    {overridePanelOpen && (
                      <div style={{ marginBottom: 20, padding: 20, background: "var(--ivory)", border: "1px solid var(--border)", borderRadius: 16 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 }} role="group" aria-label="Override mode">
                          <button className={clsx("dash-tab", overrideMode === "UNAVAILABLE" && "active")} onClick={() => setOverrideMode("UNAVAILABLE")}>
                            Unavailable all day
                          </button>
                          <button className={clsx("dash-tab", overrideMode === "CUSTOM_HOURS" && "active")} onClick={() => setOverrideMode("CUSTOM_HOURS")}>
                            Custom hours
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: overrideMode === "CUSTOM_HOURS" ? "repeat(3,1fr)" : "200px", gap: 12 }}>
                          <div className="dash-field">
                            <label>Date</label>
                            <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="dash-input" />
                          </div>
                          {overrideMode === "CUSTOM_HOURS" && (
                            <>
                              <div className="dash-field">
                                <label>Start</label>
                                <input type="time" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} className="dash-input" />
                              </div>
                              <div className="dash-field">
                                <label>End</label>
                                <input type="time" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} className="dash-input" />
                              </div>
                            </>
                          )}
                        </div>
                        {overrideValidationMessage && (
                          <p style={{ marginTop: 10, fontSize: 12.5, color: "#991B1B" }} role="alert">{overrideValidationMessage}</p>
                        )}
                        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                          <Button onClick={createOverride} disabled={!!overrideValidationMessage} loading={submittingOverride} size="sm">
                            Save override
                          </Button>
                        </div>
                      </div>
                    )}

                    {loadingOverrides ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 56 }} />)}
                      </div>
                    ) : overrides.length === 0 ? (
                      <div className="dash-empty" style={{ padding: "20px 8px" }}>
                        <h3>No overrides</h3>
                        <p>Add a date override for schedule exceptions.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {overrides.map((ovr) => {
                          const available = isAvailableOverride(ovr);
                          return (
                            <div key={ovr.id} className="override-row">
                              <div>
                                <div className="date">{humanDate(ovr.date, timezone)}</div>
                                <div className="detail">
                                  {available ? `Available ${to12h(ovr.startTime)} - ${to12h(ovr.endTime)}` : "Unavailable all day"}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span className={clsx("dbadge", available ? "ok" : "hold")}>
                                  <span className="dot" />
                                  {available ? "Custom hours" : "Unavailable"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeOverride(ovr.id)}
                                  style={{ fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)" }}
                                  aria-label={`Delete override for ${humanDate(ovr.date, timezone)}`}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="av-insights">
                    <div className="panel stat">
                      <div className="k">Time reclaimed</div>
                      <div className="v">{availabilityInsights.reclaimed}</div>
                      <div className="d">of focus saved this week</div>
                    </div>
                    <div className="panel stat">
                      <div className="k">Conflicts resolved</div>
                      <div className="v">{availabilityInsights.conflicts}</div>
                      <div className="d">quietly rescheduled in advance</div>
                    </div>
                    <div className="panel stat">
                      <div className="k">Buffer added</div>
                      <div className="v">{availabilityInsights.buffer}</div>
                      <div className="d">between back-to-backs</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Event types ───────────────────────────────────── */}
          {section === "event-types" && (
            <div className="dash-section">
              <div className="dash-section-head">
                <div>
                  <h2>Reusable <em>templates</em></h2>
                  <div className="sub">Public booking links with consistent scheduling behavior.</div>
                </div>
                <Link to="/onboarding/event" className="dash-link">Create event →</Link>
              </div>

              {eventsError && (
                <div className="dash-alert error">
                  <span>{eventsError}</span>
                  <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void loadEventTypes()}>Retry</button>
                </div>
              )}

              {eventsLoading ? (
                <div className="et-list">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 64 }} />)}
                </div>
              ) : events.length === 0 ? (
                <div className="dash-empty">
                  <h3>No event types yet</h3>
                  <p>Create one event and your reusable booking links will appear here.</p>
                  <Link to="/onboarding/event" className="dash-btn-primary" style={{ marginTop: 20 }}>Create event</Link>
                </div>
              ) : (
                <div className="et-list">
                  {events.map((event, idx) => {
                    const stripes = ["lilac", "peach", "sage", "blush"] as const;
                    const stripe = stripes[idx % stripes.length];
                    const url = bookingUrl(event);
                    return (
                      <div key={event.id} className="et-row">
                        <div className={clsx("stripe", stripe)} />
                        <div>
                          <div className="name">{event.name}</div>
                          <div className="slug">/{event.slug}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                          <button className="dash-btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
                          <a href={url} target="_blank" rel="noreferrer" className="dash-btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}>Preview</a>
                          <Link to="/onboarding/event" className="dash-btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}>Configure</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Integrations ──────────────────────────────────── */}
          {section === "integrations" && (
            <DashboardIntegrationsSection
              banner={banner}
              integrationsError={integrationsError}
              clearBanner={clearBanner}
              integrationsLoading={integrationsLoading}
              refreshStatus={refreshStatus}
              pendingAction={pendingAction}
              calendarStatus={calendarStatus}
              conferencingStatus={conferencingStatus}
              calendarCapabilities={calendarCapabilities}
              conferencingCapabilities={conferencingCapabilities}
              getCalendarProviderStatus={getCalendarProviderStatus}
              getConferencingProviderStatus={getConferencingProviderStatus}
              onRequestDisconnect={(kind, provider) => setDisconnectTarget({ kind, provider })}
              onConnectCalendar={connectCalendar}
              onConnectConferencing={connectConferencing}
            />
          )}

          {section === "event-editor" && (
            <DashboardEventEditorSection
              events={events}
              eventsLoading={eventsLoading}
              eventsError={eventsError}
              onReload={loadEventTypes}
            />
          )}

          {section === "linked-accounts" && (
            <DashboardLinkedAccountsSection />
          )}

          {section === "participation" && (
            <DashboardParticipationSection />
          )}

          {/* ── Settings ──────────────────────────────────────── */}
          {section === "settings" && (
            <div className="dash-section">
              <div className="split-grid">
                <div className="panel">
                  <div className="h">
                    <div>
                      <h3>Event types</h3>
                      <div className="sub">Reusable booking templates and links</div>
                    </div>
                  </div>
                  <Link to="/dashboard/event-types" className="dash-btn-secondary" style={{ width: "fit-content" }}>Manage →</Link>
                </div>
                <div className="panel">
                  <div className="h">
                    <div>
                      <h3>Integrations</h3>
                      <div className="sub">Calendar and conferencing connections</div>
                    </div>
                  </div>
                  <Link to="/dashboard/integrations" className="dash-btn-secondary" style={{ width: "fit-content" }}>Manage →</Link>
                </div>
              </div>
            </div>
          )}
      </DashboardWorkspaceChrome>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      {selectedMeeting && (
        <Dialog
          open
          onClose={() => setSelectedMeeting(null)}
          title={`${selectedMeeting.guestName} · ${selectedMeeting.eventTypeName}`}
          width="lg"
          footer={
            <div className="flex flex-wrap gap-2 w-full">
              {buildInvitationActions({
                provider: selectedMeeting.provider,
                providerEventUrl: selectedMeeting.providerEventUrl,
                conferenceUrl: selectedMeeting.conferenceUrl,
              }).map((action) => (
                <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken">{action.label}</a>
              ))}
              {selectedMeeting.conferenceUrl && (
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(selectedMeeting.conferenceUrl ?? "")}>Copy meeting link</Button>
              )}
              <a href={`mailto:${encodeURIComponent(selectedMeeting.guestEmail)}`} className="focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken">Email guest</a>
              <Button
                variant="danger"
                size="sm"
                loading={cancellingMeetingId === selectedMeeting.bookingId}
                disabled={selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED || cancellingMeetingId === selectedMeeting.bookingId}
                onClick={() => setCancelTargetMeeting(selectedMeeting)}
              >
                {selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "Already cancelled" : "Cancel meeting"}
              </Button>
            </div>
          }
        >
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Guest" value={`${selectedMeeting.guestName} (${selectedMeeting.guestEmail})`} />
            <DetailRow label="Status" value={selectedMeeting.bookingStatus} />
            <DetailRow label="Start" value={formatMeetingDateTime(selectedMeeting.startTime)} />
            <DetailRow label="End" value={formatMeetingDateTime(selectedMeeting.endTime)} />
            <DetailRow label="Timezone" value={timezone} />
            <DetailRow label="Provider" value={selectedMeeting.provider || "—"} />
            <DetailRow
              label="Meeting link"
              value={
                selectedMeeting.conferenceUrl
                  ? selectedMeeting.conferenceUrl
                  : selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "—" : "Preparing meeting link…"
              }
            />
            <DetailRow label="Calendar sync" value={getSyncState({ provider: selectedMeeting.provider, calendarSyncStatus: selectedMeeting.calendarSyncStatus }).label} />
            <DetailRow
              label="External lifecycle"
              value={
                getLifecycleState({
                  externalLifecycleState: selectedMeeting.externalLifecycleState,
                  externalLifecycleReason: selectedMeeting.externalLifecycleReason,
                  reconcileSuppressed: selectedMeeting.reconcileSuppressed,
                  actionRequired: selectedMeeting.actionRequired,
                })?.label || "—"
              }
            />
            <DetailRow label="External event ID" value={selectedMeeting.externalEventId || "—"} />
          </div>
          {getLifecycleState({
            externalLifecycleState: selectedMeeting.externalLifecycleState,
            externalLifecycleReason: selectedMeeting.externalLifecycleReason,
            reconcileSuppressed: selectedMeeting.reconcileSuppressed,
            actionRequired: selectedMeeting.actionRequired,
          })?.kind === "TERMINAL_EXTERNAL_DELETE" && (
            <div className="rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-fg">
              External event removed. Local booking remains {selectedMeeting.bookingStatus}.
            </div>
          )}
          {hostActionError && <p className="text-sm text-danger-fg">{hostActionError}</p>}
        </Dialog>
      )}

      <ConfirmDialog
        open={Boolean(cancelTargetMeeting)}
        tone="danger"
        pending={Boolean(cancelTargetMeeting && cancellingMeetingId === cancelTargetMeeting.bookingId)}
        title="Cancel this meeting?"
        description={cancelTargetMeeting ? `This will cancel the meeting with ${cancelTargetMeeting.guestName}.` : "This will cancel this meeting."}
        confirmLabel="Yes, cancel meeting"
        cancelLabel="Keep meeting"
        onCancel={() => setCancelTargetMeeting(null)}
        onConfirm={async () => {
          if (!cancelTargetMeeting) return;
          await cancelMeetingAsHost(cancelTargetMeeting);
          setCancelTargetMeeting(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        tone="danger"
        pending={Boolean(disconnectTarget && pendingAction?.provider === disconnectTarget.provider && pendingAction?.kind === disconnectTarget.kind)}
        title="Disconnect integration?"
        description={disconnectTarget ? `Disconnect ${disconnectTarget.provider} from this host workspace.` : "Disconnect this integration."}
        confirmLabel="Disconnect"
        cancelLabel="Keep connected"
        onCancel={() => setDisconnectTarget(null)}
        onConfirm={async () => {
          if (!disconnectTarget) return;
          await disconnectProvider(disconnectTarget.kind, disconnectTarget.provider);
          setDisconnectTarget(null);
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{label}</div>
      <div className="mt-1 text-text-primary break-all">{value}</div>
    </div>
  );
}
