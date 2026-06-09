import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import clsx from "@/lib/clsx";
import { Button, Dialog } from "@/ui/controls";
import type {
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  DayOfWeek,
  EventTypeSummaryResponse,
  MeetingSummaryResponse,
  SessionRegistrationPageResponse,
  SessionSummaryResponse,
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
import { DashboardTeamsSection } from "@/pages/dashboard/sections/DashboardTeamsSection";
import { DashboardEventEditorSection } from "@/pages/dashboard/sections/DashboardEventEditorSection";
import { getEventTypeDisplayName } from "@/features/event-types/eventTypeCatalog";
import {
  getDashboardTab,
  mergeDashboardItems,
  toSessionDashboardItem,
  type DashboardMeetingCard,
} from "@/features/dashboard/dashboardItems";
import { BunnyMascot } from "@/components/BunnyMascot";
import { beginGlobalActivity, waitForNextPaint } from "@/lib/networkActivity";
import "./dashboard/dashboard.css";

// ── Constants ──────────────────────────────────────────────────────────────────

const MEETINGS_LIMIT = 50;
const SESSIONS_LIMIT = 100;
const MEETINGS_POLL_MS = 30000;
const EVENT_TYPES_QUERY_KEY = ["event-types"] as const;
const AVAILABILITY_OVERRIDES_QUERY_KEY = ["availability-overrides"] as const;
const MEETINGS_QUERY_KEY = ["meetings", "me", { upcomingOnly: false, limit: MEETINGS_LIMIT }] as const;
const SESSIONS_QUERY_KEY = ["sessions", "me", { limit: SESSIONS_LIMIT }] as const;
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

function sameSessionCard(a: DashboardMeetingCard, b: DashboardMeetingCard) {
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    a.source === b.source &&
    a.title === b.title &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.status === b.status &&
    a.joinUrl === b.joinUrl &&
    (a.occupancy?.confirmed ?? 0) === (b.occupancy?.confirmed ?? 0) &&
    (a.occupancy?.pending ?? 0) === (b.occupancy?.pending ?? 0) &&
    (a.occupancy?.capacity ?? 0) === (b.occupancy?.capacity ?? 0) &&
    a.past === b.past
  );
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
  meeting: MeetingSummaryResponse;
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

function isRenderableAvailabilityMeeting(meeting: MeetingSummaryResponse) {
  const status = String(meeting.bookingStatus ?? "").toUpperCase();
  const externalState = String(meeting.externalLifecycleState ?? "").toUpperCase();
  if (status === "CANCELLED" || status === "EXPIRED") return false;
  if (externalState === "TERMINAL_EXTERNAL_DELETE" || externalState === "EXTERNALLY_CANCELLED") return false;
  if (meeting.reconcileSuppressed === true) return false;
  return true;
}

function buildPositionedDayEvents(dayMeetings: MeetingSummaryResponse[], timeZone: string): PositionedDayEvent[] {
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

function getEventTypesQueryOptions() {
  return {
    queryKey: EVENT_TYPES_QUERY_KEY,
    queryFn: () => api.listEventTypes(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    retry: false as const,
  };
}

function getAvailabilityOverridesQueryOptions() {
  return {
    queryKey: AVAILABILITY_OVERRIDES_QUERY_KEY,
    queryFn: async () => {
      const list = await api.getAvailabilityOverrides();
      return list.sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    retry: false as const,
  };
}

function getMeetingsQueryOptions() {
  return {
    queryKey: MEETINGS_QUERY_KEY,
    queryFn: () => api.listMyMeetings({ upcomingOnly: false, limit: MEETINGS_LIMIT }),
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    refetchInterval: MEETINGS_POLL_MS,
    retry: false as const,
  };
}

export function DashboardPage() {
  const { user, logout, logoutLoading } = useAuth();
  const queryClient = useQueryClient();
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
          : path === "/dashboard/teams"
            ? "teams"
        : path === "/dashboard/settings"
          ? "settings"
          : "meetings";
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [meetingTab, setMeetingTab] = useState<MeetingTab>("upcoming");
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingSummaryResponse | null>(null);
  const [selectedSession, setSelectedSession] = useState<DashboardMeetingCard | null>(null);
  const [hiddenMeetingIds, setHiddenMeetingIds] = useState<string[]>([]);
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [hostActionError, setHostActionError] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [cancelTargetMeeting, setCancelTargetMeeting] = useState<MeetingSummaryResponse | null>(null);
  const [cancelTargetSession, setCancelTargetSession] = useState<DashboardMeetingCard | null>(null);
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
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overridePanelOpen, setOverridePanelOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const {
    calendarStatus,
    calendarConnections,
    conferencingRuntime,
    conferencingStatus,
    calendarCapabilities,
    conferencingCapabilities,
    loading: integrationsLoading,
    error: integrationsError,
    banner,
    clearBanner,
    getCalendarProviderStatus,
    getConferencingProviderStatus,
    isManuallyRefreshing,
    manualRefreshStatus,
    startConnect,
    disconnectProvider,
    pendingAction,
  } = useIntegrationState();

  const eventTypesQuery = useQuery({
    ...getEventTypesQueryOptions(),
    enabled: Boolean(user?.id),
  });
  const availabilityOverridesQuery = useQuery({
    ...getAvailabilityOverridesQueryOptions(),
    enabled: Boolean(user?.id),
  });
  const meetingsQuery = useQuery({
    ...getMeetingsQueryOptions(),
    enabled: Boolean(user?.id),
  });
  const sessionsQuery = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.listMySessions({ limit: SESSIONS_LIMIT });
      return response.items ?? [];
    },
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    refetchInterval: MEETINGS_POLL_MS,
    retry: false as const,
    enabled: Boolean(user?.id),
  });
  const events = eventTypesQuery.data ?? [];
  const overrides = availabilityOverridesQuery.data ?? [];
  const meetings = meetingsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const eventsLoading = eventTypesQuery.isPending && !eventTypesQuery.data;
  const loadingOverrides = availabilityOverridesQuery.isPending && !availabilityOverridesQuery.data;
  const meetingsLoading = meetingsQuery.isPending && !meetingsQuery.data;
  const sessionsLoading = sessionsQuery.isPending && !sessionsQuery.data;
  const eventsError = eventTypesQuery.isError && !eventTypesQuery.data
    ? "Failed to load event type configuration."
    : null;
  const availabilityReadError = availabilityOverridesQuery.isError && !availabilityOverridesQuery.data
    ? "Unable to load date overrides."
    : null;
  const meetingsError = meetingsQuery.isError && !meetingsQuery.data
    ? "Failed to load meetings."
    : null;
  const sessionsError = sessionsQuery.isError && !sessionsQuery.data
    ? "Failed to load group sessions."
    : null;
  const availabilitySurfaceError = availabilityError ?? availabilityReadError;
  const combinedListError = meetingsError ?? sessionsError;

  const timezone = getBrowserTimeZone();
  const availabilityScrollRef = useRef<HTMLDivElement | null>(null);
  const availabilityRhythmRef = useRef<HTMLDivElement | null>(null);
  const availabilityOverridesRef = useRef<HTMLDivElement | null>(null);
  const copyEventTimeoutRef = useRef<number | null>(null);
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
    const map = new Map<string, MeetingSummaryResponse[]>();
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

  const handleCopyEventLink = useCallback(async (eventId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedEventId(eventId);
      if (copyEventTimeoutRef.current) {
        window.clearTimeout(copyEventTimeoutRef.current);
      }
      copyEventTimeoutRef.current = window.setTimeout(() => setCopiedEventId(null), 1800);
    } catch {
      setCopiedEventId(null);
    }
  }, []);

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

  const reloadEventTypes = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: EVENT_TYPES_QUERY_KEY });
  }, [queryClient]);

  const reloadAvailabilityOverrides = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: AVAILABILITY_OVERRIDES_QUERY_KEY });
  }, [queryClient]);
  const reloadMeetings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["meetings", "me"] });
    await queryClient.invalidateQueries({ queryKey: ["sessions", "me"] });
  }, [queryClient]);

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
  const dashboardItems = useMemo(() => mergeDashboardItems(visibleMeetings, sessions), [sessions, visibleMeetings]);
  const visibleDashboardItems = useMemo(
    () => dashboardItems.filter((item) => item.source === "session" || !hiddenMeetingIds.includes(item.id)),
    [dashboardItems, hiddenMeetingIds],
  );

  useEffect(() => {
    if (!selectedMeeting) return;
    const next = meetings.find((meeting) => meeting.bookingId === selectedMeeting.bookingId);
    if (next) {
      setSelectedMeeting(next);
    }
  }, [meetings, selectedMeeting]);

  useEffect(() => {
    if (!selectedSession) return;
    const next = sessions.find((session) => session.sessionId === selectedSession.id);
    if (!next) return;
    const nextCard = toSessionDashboardItem(next);
    setSelectedSession((prev) => {
      if (!prev || prev.id !== nextCard.id) return prev;
      return sameSessionCard(prev, nextCard) ? prev : nextCard;
    });
  }, [sessions, selectedSession]);

  const selectedSessionRegistrationsQuery = useQuery({
    queryKey: ["session-registrations", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return { items: [], hasMore: false } as SessionRegistrationPageResponse;
      return api.listSessionRegistrations(selectedSession.id, { limit: 100 });
    },
    enabled: Boolean(selectedSession?.id && selectedSession?.source === "session"),
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    retry: false as const,
  });

  const isTerminalExternalDelete = (meeting: MeetingSummaryResponse) => {
    return (meeting.externalLifecycleState ?? "").trim().toUpperCase() === "TERMINAL_EXTERNAL_DELETE";
  };

  const operationalBookingStatus = (meeting: MeetingSummaryResponse) => {
    return isTerminalExternalDelete(meeting) ? BookingLifecycleStatus.CANCELLED : meeting.bookingStatus;
  };

  const dashboardBuckets = useMemo(() => {
    const upcoming = visibleDashboardItems
      .filter((item) => getDashboardTab(item) === "upcoming")
      .sort((a, b) => a.sortKey - b.sortKey);
    const past = visibleDashboardItems
      .filter((item) => getDashboardTab(item) === "past")
      .sort((a, b) => b.sortKey - a.sortKey);
    const cancelled = visibleDashboardItems
      .filter((item) => getDashboardTab(item) === "cancelled")
      .sort((a, b) => a.sortKey - b.sortKey);
    return { upcoming, past, cancelled };
  }, [visibleDashboardItems]);

  const displayedItems = meetingTab === "upcoming"
    ? dashboardBuckets.upcoming
    : meetingTab === "past"
      ? dashboardBuckets.past
      : dashboardBuckets.cancelled;

  const nextMeeting = dashboardBuckets.upcoming[0] ?? null;
  const todayCount = dashboardBuckets.upcoming.filter((m) => formatRelativeDay(m.startTime) === "Today").length;
  const hideMeeting = (bookingId: string) => {
    setHiddenMeetingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    if (selectedMeeting?.bookingId === bookingId) setSelectedMeeting(null);
  };

  const cancelMeetingAsHost = async (meeting: MeetingSummaryResponse) => {
    if (cancellingMeetingId) return;

    setHostActionError(null);
    setCancellingMeetingId(meeting.bookingId);
    const snapshot = queryClient.getQueryData<MeetingSummaryResponse[]>(MEETINGS_QUERY_KEY) ?? [];
    const applyCancelled = (items: MeetingSummaryResponse[]) =>
      items.map((item) => (item.bookingId === meeting.bookingId ? { ...item, bookingStatus: BookingLifecycleStatus.CANCELLED } : item));
    try {
      queryClient.setQueryData<MeetingSummaryResponse[]>(MEETINGS_QUERY_KEY, (prev = []) => applyCancelled(prev));
      setSelectedMeeting((prev) => (prev && prev.bookingId === meeting.bookingId ? { ...prev, bookingStatus: BookingLifecycleStatus.CANCELLED } : prev));
      await api.cancelHostBooking(meeting.bookingId, randomKey());
      await queryClient.invalidateQueries({ queryKey: ["meetings", "me"] });
    } catch (e) {
      console.error(e);
      queryClient.setQueryData(MEETINGS_QUERY_KEY, snapshot);
      setSelectedMeeting((prev) => {
        if (!prev || prev.bookingId !== meeting.bookingId) return prev;
        const restored = snapshot.find((item) => item.bookingId === meeting.bookingId);
        return restored ?? prev;
      });
      setHostActionError("Unable to cancel meeting right now. Please retry.");
    } finally {
      setCancellingMeetingId(null);
    }
  };

  const cancelSessionAsHost = async (session: DashboardMeetingCard) => {
    if (cancellingSessionId) return;

    setSessionActionError(null);
    setCancellingSessionId(session.id);
    const snapshot = queryClient.getQueryData<SessionSummaryResponse[]>(SESSIONS_QUERY_KEY) ?? [];
    const applyCancelled = (items: SessionSummaryResponse[]) =>
      items.map((item) => (item.sessionId === session.id ? { ...item, status: "CANCELLED" } : item));
    try {
      queryClient.setQueryData<SessionSummaryResponse[]>(SESSIONS_QUERY_KEY, (prev = []) => applyCancelled(prev));
      setSelectedSession((prev) => (prev && prev.id === session.id ? { ...prev, status: "CANCELLED" } : prev));
      await api.cancelSession(session.id, randomKey());
      await queryClient.invalidateQueries({ queryKey: ["sessions", "me"] });
    } catch (e) {
      console.error(e);
      queryClient.setQueryData(SESSIONS_QUERY_KEY, snapshot);
      setSelectedSession((prev) => {
        if (!prev || prev.id !== session.id) return prev;
        const restored = snapshot.find((item) => item.sessionId === session.id);
        return restored ? toSessionDashboardItem(restored) : prev;
      });
      setSessionActionError("Unable to cancel session right now. Please retry.");
    } finally {
      setCancellingSessionId(null);
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
      queryClient.setQueryData<AvailabilityOverrideResponse[]>(AVAILABILITY_OVERRIDES_QUERY_KEY, (prev = []) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date))
      );
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
    const snapshot = queryClient.getQueryData<AvailabilityOverrideResponse[]>(AVAILABILITY_OVERRIDES_QUERY_KEY) ?? [];
    queryClient.setQueryData<AvailabilityOverrideResponse[]>(AVAILABILITY_OVERRIDES_QUERY_KEY, (prev = []) =>
      prev.filter((x) => x.id !== id)
    );
    try {
      await api.deleteAvailabilityOverride(id);
    } catch (e) {
      console.error(e);
      queryClient.setQueryData(AVAILABILITY_OVERRIDES_QUERY_KEY, snapshot);
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
        meetingsCount={dashboardBuckets.upcoming.length || undefined}
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
              <div className="mt-grid">
                <section className="allclear" aria-label="Next up">
                  <div className="allclear-copy">
                    {nextMeeting ? (
                      nextMeeting.source === "session" ? (
                        <>
                          <span className="eyebrow">Next up</span>
                          <h2>{nextMeeting.title}</h2>
                          <p>
                            {new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            {" · "}
                            {formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}
                            {" · "}
                            {nextMeeting.occupancy?.confirmed ?? 0} / {nextMeeting.occupancy?.capacity ?? 0} confirmed
                            {" · "}
                            {nextMeeting.occupancy?.pending ?? 0} pending
                          </p>
                          <div className="allclear-actions">
                            {nextMeeting.joinUrl && (
                              <a href={nextMeeting.joinUrl} target="_blank" rel="noreferrer" className="dash-btn-primary" style={{ borderRadius: 999, fontSize: 12.5, padding: "7px 14px", textDecoration: "none" }}>
                                Join Meeting
                              </a>
                            )}
                            <button className="dash-btn-secondary" style={{ borderRadius: 999, fontSize: 12.5, padding: "7px 14px" }} onClick={() => setSelectedSession(nextMeeting)}>
                              View Attendees
                            </button>
                            <span className={clsx("mt-chip", nextMeeting.status === "FULL" ? "ok" : "hold")} style={{ marginLeft: 2 }}>
                              <span className="d" />
                              {nextMeeting.status === "FULL" ? "FULL" : nextMeeting.status}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="eyebrow">Next up</span>
                          <h2>{formatRelativeDay(nextMeeting.startTime)}.</h2>
                          <p>
                            {new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            {" · "}
                            {formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}
                            {" · "}
                            {nextMeeting.booking!.guestName}
                          </p>
                          <div className="allclear-actions">
                            <button className="dash-btn-primary" style={{ borderRadius: 999, fontSize: 12.5, padding: "7px 14px" }} onClick={() => setSelectedMeeting(nextMeeting.booking!)}>
                              Details
                            </button>
                            <span className="mt-chip ok" style={{ marginLeft: 2 }}>
                              <span className="d" />
                              {nextMeeting.booking!.bookingStatus}
                            </span>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <span className="eyebrow">Next up</span>
                        <h2>All clear.</h2>
                        <p>No upcoming meetings scheduled. Your calendar is yours.</p>
                        <div className="allclear-actions">
                          <Link to="/onboarding/event" className="dash-btn-primary" style={{ borderRadius: 999, fontSize: 12.5, padding: "7px 14px", textDecoration: "none" }}>
                            Share your booking link
                          </Link>
                          <Link to="/dashboard/availability" className="dash-btn-secondary" style={{ borderRadius: 999, fontSize: 12.5, padding: "7px 14px", textDecoration: "none" }}>
                            Set availability
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-bunny-nook" aria-hidden="true">
                    <span className="bunny-tag"><span className="zsleep">z z</span> resting easy</span>
                    <BunnyMascot />
                  </div>
                </section>

                <div className="mt-stats">
                  <div className="stat">
                    <span className="chip-sq today" />
                    <span className="lbl">Today</span>
                    <span className="num">{todayCount}</span>
                    <span className="sub">meetings scheduled</span>
                  </div>
                  <div className="stat">
                    <span className="chip-sq upcoming" />
                    <span className="lbl">Upcoming</span>
                    <span className="num">{dashboardBuckets.upcoming.length}</span>
                    <span className="sub">total confirmed</span>
                  </div>
                  <div className="stat">
                    <span className="chip-sq hidden" />
                    <span className="lbl">Hidden</span>
                    <span className="num">{hiddenMeetingIds.length}</span>
                    {hiddenMeetingIds.length > 0 ? (
                      <button
                        onClick={clearHiddenMeetings}
                        style={{ fontSize: 12, color: "var(--plum-500)", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--sans)", width: "fit-content" }}
                      >
                        Restore
                      </button>
                    ) : (
                      <span className="sub">archived meetings</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-chips">
                <span className={clsx("mt-chip", events.length > 0 ? "ok" : "warn")}>
                  <span className="d" />
                  {events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types"}
                </span>
                <span className={clsx("mt-chip", connectedProviderCount > 0 ? "ok" : "warn")}>
                  <span className="d" />
                  {connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} active` : "No integrations connected"}
                </span>
              </div>

              <section className="mt-list">
                <div className="mt-list-head">
                  <h3>Your <em>meetings</em></h3>
                  <div className="mt-tabs">
                    <button className={clsx("mt-tab", meetingTab === "upcoming" && "active")} onClick={() => setMeetingTab("upcoming")}>
                      Upcoming ({dashboardBuckets.upcoming.length})
                    </button>
                    <button className={clsx("mt-tab", meetingTab === "past" && "active")} onClick={() => setMeetingTab("past")}>
                      Past ({dashboardBuckets.past.length})
                    </button>
                    <button className={clsx("mt-tab", meetingTab === "cancelled" && "active")} onClick={() => setMeetingTab("cancelled")}>
                      Cancelled ({dashboardBuckets.cancelled.length})
                    </button>
                  </div>
                </div>

                {combinedListError && (
                  <div className="dash-alert error">
                    <span>{combinedListError}</span>
                    {user?.id && (
                      <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void reloadMeetings()}>
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {meetingsLoading && sessionsLoading && displayedItems.length === 0 ? (
                  <div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="dash-skel" style={{ height: 88, marginBottom: 12 }} />
                    ))}
                  </div>
                ) : displayedItems.length === 0 ? (
                  <div className="mt-empty">
                    <div className="seed" />
                    <h4>No {meetingTab} items</h4>
                    <p>This view is clear right now. New bookings and group sessions will land here automatically.</p>
                  </div>
                ) : (
                  <div className="meet-list">
                    {displayedItems.map((item) => {
                      if (item.source === "session" && item.session) {
                        const when = formatWindow(item.startTime, item.endTime);
                        const dayTone = formatRelativeDay(item.startTime);
                        const occupancy = item.occupancy ?? { confirmed: 0, pending: 0, capacity: 0 };
                        const isFull = occupancy.capacity > 0 && occupancy.confirmed >= occupancy.capacity;
                        const statusLabel = item.status === "FULL" || isFull ? "FULL" : item.status;
                        const canCancelSession = item.status !== "CANCELLED" && item.status !== "COMPLETED";
                        return (
                          <div key={item.id} className="meet-row">
                            <div className="when">
                              <span className="rel">{dayTone}</span>
                              <span className="day">
                                {new Date(item.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                              <span className="time">{when.time}</span>
                            </div>
                            <div className="who">
                              <span className="name">{item.title}</span>
                              <span className="ev">{occupancy.confirmed} / {occupancy.capacity} confirmed</span>
                              <span className="ev">{occupancy.pending} pending</span>
                            </div>
                            <div className="badges">
                              <span className={clsx("dbadge", statusLabel === "FULL" && "ok", statusLabel === "OPEN" && "hold", statusLabel === "CANCELLED" && "danger", statusLabel === "COMPLETED" && "synced")}>
                                <span className="dot" />
                                {statusLabel}
                              </span>
                              {item.session.sync?.syncStatus && (
                                <span className={clsx("dbadge", "hold")}>
                                  <span className="dot" />
                                  {item.session.sync.syncStatus}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                              {item.joinUrl && (
                                <a href={item.joinUrl} target="_blank" rel="noreferrer" className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }}>
                                  Join Meeting
                                </a>
                              )}
                              <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => {
                                setSelectedMeeting(null);
                                setSessionActionError(null);
                                setSelectedSession(item);
                              }}>
                                View Attendees
                              </button>
                              {canCancelSession && (
                                <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => setCancelTargetSession(item)}>
                                  Cancel Session
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const meeting = item.booking!;
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
                      const actions = buildInvitationActions({ provider: meeting.provider, providerEventUrl: meeting.providerEventUrl, conferenceJoinUrl: meeting.conferenceDetails?.joinUrl ?? null });

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
                            <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => {
                              setSelectedSession(null);
                              setSelectedMeeting(meeting);
                            }}>
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
              </section>
            </>
          )}

          {/* ── Availability sources ─────────────────────────── */}
          {section === "availability-sources" && (
            <AvailabilitySourcesPage />
          )}

          {/* ── Availability ──────────────────────────────────── */}
          {section === "availability" && (
            <>
              {availabilitySurfaceError && (
                <div className="dash-alert error">
                  <span>{availabilitySurfaceError}</span>
                  {!availabilityError && availabilityReadError && (
                    <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void reloadAvailabilityOverrides()}>
                      Retry
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <Link to="/dashboard/availability/sources" className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px", textDecoration: "none" }}>
                  View sources &amp; blockers →
                </Link>
              </div>

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
            <div className="dash-section et-surface">
              <section className="et-hero">
                <div className="et-hero-copy">
                  <span className="eyebrow">Reusable templates</span>
                  <h2>Event links that stay <em>consistent.</em></h2>
                  <p>Every template is a public booking link with its own scheduling rules. Share one, and BunnyCal keeps the flow in order.</p>
                  <div className="et-hero-meta">
                    <div className="et-stat"><span className="n">{events.length}</span><span className="l">templates</span></div>
                    <div className="et-stat"><span className="n">{events.length}</span><span className="l">active</span></div>
                    <div className="et-stat"><span className="n">0</span><span className="l">hidden</span></div>
                  </div>
                </div>
                <div className="et-bunny-stage" aria-hidden="true">
                  <BunnyMascot />
                </div>
              </section>

              <div className="et-listhead">
                <div>
                  <span className="eyebrow">Your templates</span>
                  <h3>Reusable <em>templates</em></h3>
                  <p>Public booking links with consistent scheduling behavior.</p>
                </div>
                <Link to="/onboarding/event" className="create">Create event →</Link>
              </div>

              {eventsError && (
                <div className="dash-alert error">
                  <span>{eventsError}</span>
                  <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void reloadEventTypes()}>Retry</button>
                </div>
              )}

              {eventsLoading ? (
                <div className="et-list">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 64 }} />)}
                </div>
              ) : events.length === 0 ? (
                <div className="mt-empty">
                  <div className="seed" />
                  <h4>No event types yet</h4>
                  <p>Create one event and your reusable booking links will appear here.</p>
                  <Link to="/onboarding/event" className="dash-btn-primary" style={{ marginTop: 18 }}>Create event</Link>
                </div>
              ) : (
                <div className="et-list">
                  {events.map((event, idx) => {
                    const tones = ["c-lilac", "c-peach", "c-sage", "c-blush", "c-butter", "c-sky"] as const;
                    const tone = tones[idx % tones.length];
                    const url = bookingUrl(event);
                    return (
                      <article key={event.id} className={clsx("et-card", tone)}>
                        <span className="et-glyph">{event.name.trim().slice(0, 1).toUpperCase()}</span>
                        <div className="et-meta">
                          <span className="et-kind-badge">{getEventTypeDisplayName(event.kind ?? "ONE_ON_ONE")}</span>
                          <span className="nm">{event.name}</span>
                          <span className="et-slug"><span className="host">bunnycal.io</span><span className="path">/{event.slug}</span></span>
                        </div>
                        <div className="et-actions">
                          <button
                            className={clsx("et-btn", "copy", copiedEventId === event.id && "copied")}
                            onClick={() => void handleCopyEventLink(event.id, url)}
                          >
                            {copiedEventId === event.id ? "Copied" : "Copy link"}
                          </button>
                          <a href={url} target="_blank" rel="noreferrer" className="et-btn">Preview</a>
                          <Link to="/onboarding/event" className="et-btn config">Configure</Link>
                          {String(event.kind ?? "").toUpperCase() === "ROUND_ROBIN" && (
                            <Link
                              to={`/dashboard/event-editor?expandParticipants=${event.id}`}
                              className="et-btn"
                            >
                              Participants
                            </Link>
                          )}
                        </div>
                      </article>
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
              refreshStatus={manualRefreshStatus}
              integrationsRefreshing={isManuallyRefreshing}
              pendingAction={pendingAction}
              calendarStatus={calendarStatus}
              calendarConnections={calendarConnections}
              conferencingRuntime={conferencingRuntime}
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
              onReload={reloadEventTypes}
            />
          )}

          {section === "linked-accounts" && (
            <DashboardLinkedAccountsSection />
          )}

          {section === "participation" && (
            <DashboardParticipationSection />
          )}

          {section === "teams" && (
            <DashboardTeamsSection />
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
                conferenceJoinUrl: selectedMeeting.conferenceDetails?.joinUrl ?? null,
              }).map((action) => (
                <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken">{action.label}</a>
              ))}
              {selectedMeeting.bookingStatus !== BookingLifecycleStatus.CANCELLED && selectedMeeting.conferenceDetails?.joinUrl && (
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(selectedMeeting.conferenceDetails?.joinUrl ?? "")}>Copy meeting link</Button>
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
                selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED
                  ? "—"
                  : selectedMeeting.conferenceDetails?.joinUrl
                    ? selectedMeeting.conferenceDetails.joinUrl
                    : "Preparing meeting link…"
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

      {selectedSession && (
        <Dialog
          open
          onClose={() => {
            setSessionActionError(null);
            setSelectedSession(null);
          }}
          title={selectedSession.title}
          description={`${formatMeetingDateTime(selectedSession.startTime)} · ${selectedSession.occupancy?.confirmed ?? 0} / ${selectedSession.occupancy?.capacity ?? 0} confirmed`}
          width="lg"
          footer={
            <div className="flex flex-wrap gap-2 w-full">
              {selectedSession.joinUrl && (
                <a
                  href={selectedSession.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex items-center rounded-xl border border-border-default bg-surface px-3 py-1.5 text-body-sm text-text-primary hover:bg-surface-sunken"
                >
                  Join Meeting
                </a>
              )}
              {selectedSession.status !== "CANCELLED" && selectedSession.status !== "COMPLETED" && (
                <Button variant="danger" size="sm" onClick={() => setCancelTargetSession(selectedSession)}>
                  Cancel Session
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => {
                setSessionActionError(null);
                setSelectedSession(null);
              }}>
                Close
              </Button>
            </div>
          }
        >
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Status" value={selectedSession.status} />
            <DetailRow
              label="Occupancy"
              value={`${selectedSession.occupancy?.confirmed ?? 0} / ${selectedSession.occupancy?.capacity ?? 0} confirmed`}
            />
            <DetailRow label="Pending" value={`${selectedSession.occupancy?.pending ?? 0} pending`} />
            <DetailRow label="Start" value={formatMeetingDateTime(selectedSession.startTime)} />
            <DetailRow label="End" value={formatMeetingDateTime(selectedSession.endTime)} />
            <DetailRow label="Source" value="Session" />
          </div>
          {sessionActionError && <p className="text-sm text-danger-fg mt-3">{sessionActionError}</p>}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken p-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Attendees</div>
            {selectedSessionRegistrationsQuery.isPending ? (
              <div className="mt-3 grid gap-2">
                {Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="dash-skel" style={{ height: 44 }} />)}
              </div>
            ) : (selectedSessionRegistrationsQuery.data?.items ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">No attendees yet.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {(selectedSessionRegistrationsQuery.data?.items ?? []).map((registration) => (
                  <div key={registration.registrationId} className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
                    <div className="font-medium text-text-primary">{registration.guestName}</div>
                    <div className="text-sm text-text-secondary">{registration.guestEmail}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{registration.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
        open={Boolean(cancelTargetSession)}
        tone="danger"
        pending={Boolean(cancelTargetSession && cancellingSessionId === cancelTargetSession.id)}
        title="Cancel Group Session?"
        description="This will cancel the session for all attendees and send cancellation notifications."
        confirmLabel="Yes, cancel session"
        cancelLabel="Keep session"
        onCancel={() => setCancelTargetSession(null)}
        onConfirm={async () => {
          if (!cancelTargetSession) return;
          await cancelSessionAsHost(cancelTargetSession);
          setCancelTargetSession(null);
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
          const endGlobalActivity = beginGlobalActivity("immediate");
          try {
            await disconnectProvider(disconnectTarget.kind, disconnectTarget.provider);
            setDisconnectTarget(null);
            await waitForNextPaint();
          } finally {
            endGlobalActivity();
          }
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
