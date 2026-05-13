import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
import type {
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  DayOfWeek,
  EventTypeSummaryResponse,
  HostMeetingResponse,
} from "@/services/types";
import { useAuth } from "@/state/AuthContext";
import { Avatar } from "@/components/Avatar";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { BookingLifecycleStatus } from "@/constants/bookingStatus";
import { buildInvitationActions, getSyncState } from "@/lib/meetingActions";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const MEETINGS_LIMIT = 50;
const MEETINGS_POLL_MS = 15000;
const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
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
  return `${diff} days away`;
}

function statusBadge(status: string) {
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

function isAvailableOverride(ovr: AvailabilityOverrideResponse) {
  if (typeof ovr.isAvailable === "boolean") return ovr.isAvailable;
  if (typeof ovr.available === "boolean") return ovr.available;
  return false;
}

function HiddenIdsStorageKey(userId: string) {
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
  const [events, setEvents] = useState<EventTypeSummaryResponse[]>([]);
  const [meetings, setMeetings] = useState<HostMeetingResponse[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [meetingTab, setMeetingTab] = useState<MeetingTab>("upcoming");
  const [selectedMeeting, setSelectedMeeting] = useState<HostMeetingResponse | null>(null);
  const [hiddenMeetingIds, setHiddenMeetingIds] = useState<string[]>([]);
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(null);
  const [hostActionError, setHostActionError] = useState<string | null>(null);
  const [cancelTargetMeeting, setCancelTargetMeeting] = useState<HostMeetingResponse | null>(null);
  const [disconnectTargetProvider, setDisconnectTargetProvider] = useState<"google" | "microsoft" | "zoom" | null>(null);

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
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrides, setOverrides] = useState<AvailabilityOverrideResponse[]>([]);
  const [overridePanelOpen, setOverridePanelOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const { statusMap, loading: integrationsLoading, error: integrationsError, banner, clearBanner, getProviderStatus, startGoogleConnect, disconnect, pendingAction, refreshStatus } = useIntegrationState();

  const timezone = getBrowserTimeZone();

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

  const meetingBuckets = useMemo(() => {
    const now = Date.now();
    const cancelled = visibleMeetings.filter((m) => m.bookingStatus === BookingLifecycleStatus.CANCELLED);
    const upcoming = visibleMeetings.filter((m) => {
      if (m.bookingStatus === BookingLifecycleStatus.CANCELLED || m.bookingStatus === BookingLifecycleStatus.EXPIRED) return false;
      return new Date(m.endTime).getTime() >= now;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const past = visibleMeetings.filter((m) => {
      if (m.bookingStatus === BookingLifecycleStatus.CANCELLED) return false;
      return new Date(m.endTime).getTime() < now || m.bookingStatus === BookingLifecycleStatus.EXPIRED;
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
  const connectFromDashboard = async () => {
    await startGoogleConnect(`${location.pathname}${location.search}${location.hash}`);
  };

  const disconnectProvider = async (provider: "google" | "microsoft" | "zoom") => {
    await disconnect(provider);
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
      ? { date: overrideDate, isAvailable: false }
      : { date: overrideDate, isAvailable: true, startTime: overrideStartTime, endTime: overrideEndTime };

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_45%,#f9fbff_100%)] px-4 py-5 sm:px-5 sm:py-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[220px_1fr] gap-5">
        <aside className="rounded-3xl border border-[#dbe4f8] bg-white p-4 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="px-2 pb-3 border-b border-[#eef2f7]">
            <div className="text-[#0f172a] font-semibold">EasySchedule</div>
            <div className="text-xs text-[#64748b] mt-1">Host workspace</div>
          </div>
          <nav className="pt-3 space-y-1 text-sm">
            <Link to="/dashboard" className={`block rounded-xl px-3 py-2 ${section === "meetings" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`}>Meetings</Link>
            <Link to="/dashboard/availability" className={`block rounded-xl px-3 py-2 ${section === "availability" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`}>Availability</Link>
            <Link to="/dashboard/integrations" className={`block rounded-xl px-3 py-2 ${section === "integrations" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`}>Integrations</Link>
            <Link to="/dashboard/event-types" className={`block rounded-xl px-3 py-2 ${section === "event-types" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`}>Event Types</Link>
            <Link to="/dashboard/settings" className={`block rounded-xl px-3 py-2 ${section === "settings" ? "bg-[#eef2ff] text-[#3730a3] font-medium" : "text-[#64748b]"}`}>Settings</Link>
          </nav>
        </aside>

        <main className="rounded-3xl border border-[#dbe4f8] bg-white p-4 sm:p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <header className="flex items-center justify-between gap-3 pb-5 border-b border-[#eef2f7]">
            <div>
              <p className="text-sm text-[#64748b]">Good to see you, {firstName}</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#0f172a]">
                {section === "event-types" ? "Event types" : section === "availability" ? "Availability" : "Scheduling operations"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/onboarding/event" className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b]">New event</Link>
              <div className="relative">
                <button type="button" onClick={() => setMenuOpen((prev) => !prev)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-2" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Open user menu">
                  <Avatar name={user?.name || user?.email || user?.username || "User"} image={user?.profileImage} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-44 rounded-xl border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.12)] p-1 z-20">
                    <button type="button" role="menuitem" className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]">Profile</button>
                    <button type="button" role="menuitem" className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]">Settings</button>
                    <button type="button" role="menuitem" onClick={handleLogout} disabled={logoutLoading} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-60">
                      {logoutLoading ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {section === "meetings" && (
            <section className="mt-5 space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-[#64748b]">Next meeting</div>
                  {nextMeeting ? (
                    <>
                      <div className="mt-1 font-semibold text-[#0f172a]">{nextMeeting.guestName}</div>
                      <div className="text-sm text-[#64748b]">{formatWindow(nextMeeting.startTime, nextMeeting.endTime).date} · {formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-[#64748b]">No upcoming meeting</div>
                  )}
                </div>
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-[#64748b]">Today</div>
                  <div className="mt-1 text-2xl font-semibold text-[#0f172a]">{todayCount}</div>
                  <div className="text-sm text-[#64748b]">meetings scheduled</div>
                </div>
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-[#64748b]">Hidden clutter</div>
                  <div className="mt-1 text-2xl font-semibold text-[#0f172a]">{hiddenMeetingIds.length}</div>
                  <button onClick={clearHiddenMeetings} className="mt-2 text-sm text-[#334155] underline disabled:opacity-40" disabled={hiddenMeetingIds.length === 0}>Restore hidden meetings</button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-[#d1d5db] p-1 bg-white">
                  <button onClick={() => setMeetingTab("upcoming")} className={`rounded-lg px-3 py-1.5 text-sm ${meetingTab === "upcoming" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`}>Upcoming ({meetingBuckets.upcoming.length})</button>
                  <button onClick={() => setMeetingTab("past")} className={`rounded-lg px-3 py-1.5 text-sm ${meetingTab === "past" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`}>Past ({meetingBuckets.past.length})</button>
                  <button onClick={() => setMeetingTab("cancelled")} className={`rounded-lg px-3 py-1.5 text-sm ${meetingTab === "cancelled" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`}>Cancelled ({meetingBuckets.cancelled.length})</button>
                </div>
                <p className="text-xs text-[#64748b]">Source of truth: booking status + calendarSyncStatus</p>
              </div>

              {meetingsError && <p className="text-sm text-[#dc2626]">{meetingsError}</p>}

              {meetingsLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[#eef2ff] animate-pulse" />)}
                </div>
              ) : displayedMeetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cbd5e1] p-8 text-center">
                  <div className="text-[#0f172a] text-lg font-semibold">No {meetingTab} meetings</div>
                  <p className="text-sm text-[#64748b] mt-1">This view is clear right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedMeetings.map((meeting) => {
                    const when = formatWindow(meeting.startTime, meeting.endTime);
                    const dayTone = formatRelativeDay(meeting.startTime);
                    const sync = getSyncState({
                      provider: meeting.provider,
                      calendarSyncStatus: meeting.calendarSyncStatus,
                    });
                    const syncToneClass = sync.tone === "good"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : sync.tone === "bad"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-amber-100 text-amber-700 border-amber-200";
                    const actions = buildInvitationActions({
                      provider: meeting.provider,
                      providerEventUrl: meeting.providerEventUrl,
                      conferenceUrl: meeting.conferenceUrl,
                    });
                    return (
                      <article key={meeting.bookingId} className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#fcfdff]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.14em] text-[#64748b]">{dayTone}</div>
                            <h3 className="font-semibold text-[#0f172a] truncate">{meeting.guestName} · {meeting.eventTypeName}</h3>
                            <p className="text-sm text-[#64748b] mt-0.5">{when.date} · {when.time}</p>
                            <p className="text-sm text-[#475569] truncate">{meeting.guestEmail}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(meeting.bookingStatus)}`}>{meeting.bookingStatus}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${syncToneClass}`}>{sync.label}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {actions.slice(0, 2).map((action) => (
                            <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">{action.label}</a>
                          ))}
                          <button onClick={() => setSelectedMeeting(meeting)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">More details</button>
                          {(meeting.bookingStatus === BookingLifecycleStatus.EXPIRED || meeting.bookingStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (
                            <button onClick={() => hideMeeting(meeting.bookingId)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#64748b]">Hide</button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {section === "availability" && (
            <section className="mt-5 space-y-5">
              {availabilityError && <p className="text-sm text-[#dc2626]">{availabilityError}</p>}

              <div className="rounded-2xl border border-[#e2e8f0] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0f172a]">Weekly availability</h2>
                    <p className="text-sm text-[#64748b]">Continuously editable schedule for new bookings.</p>
                  </div>
                  <div className="text-xs text-[#64748b]">Timezone: <strong>{timezone}</strong></div>
                </div>

                <div className="mt-4 space-y-3">
                  {DAYS.map((day) => (
                    <div key={day} className="rounded-xl border border-[#e5e7eb] p-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr_auto] gap-2 items-center">
                      <div className="font-medium text-[#0f172a]">{day.slice(0, 1) + day.slice(1).toLowerCase()}</div>
                      <label className="text-sm">
                        <span className="text-[#64748b]">Start</span>
                        <input
                          type="time"
                          value={weeklyRules[day].startTime}
                          onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                          disabled={!weeklyRules[day].enabled}
                          className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-[#64748b]">End</span>
                        <input
                          type="time"
                          value={weeklyRules[day].endTime}
                          onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                          disabled={!weeklyRules[day].enabled}
                          className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 disabled:opacity-50"
                        />
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-[#334155]">
                        <input
                          type="checkbox"
                          checked={weeklyRules[day].enabled}
                          onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                        />
                        Active
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={saveWeeklyAvailability} disabled={availabilitySaving} className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                    {availabilitySaving ? "Saving..." : "Save weekly availability"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172a]">Date overrides</h3>
                    <p className="text-sm text-[#64748b]">Add exceptions for vacations, holidays, or custom hours.</p>
                  </div>
                  <button onClick={() => setOverridePanelOpen((v) => !v)} className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm">
                    {overridePanelOpen ? "Close" : "Add override"}
                  </button>
                </div>

                {overridePanelOpen && (
                  <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setOverrideMode("UNAVAILABLE")} className={`rounded-lg px-3 py-1.5 text-sm border ${overrideMode === "UNAVAILABLE" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`}>Unavailable all day</button>
                      <button type="button" onClick={() => setOverrideMode("CUSTOM_HOURS")} className={`rounded-lg px-3 py-1.5 text-sm border ${overrideMode === "CUSTOM_HOURS" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`}>Custom hours</button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-sm">
                        <span className="text-[#334155]">Date</span>
                        <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                      </label>
                      {overrideMode === "CUSTOM_HOURS" && (
                        <>
                          <label className="text-sm">
                            <span className="text-[#334155]">Start</span>
                            <input type="time" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                          </label>
                          <label className="text-sm">
                            <span className="text-[#334155]">End</span>
                            <input type="time" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                          </label>
                        </>
                      )}
                    </div>
                    {overrideValidationMessage && <p className="mt-2 text-xs text-[#dc2626]">{overrideValidationMessage}</p>}
                    <div className="mt-4 flex justify-end">
                      <button onClick={createOverride} disabled={!!overrideValidationMessage || submittingOverride} className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                        {submittingOverride ? "Saving..." : "Save override"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {loadingOverrides ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[#f1f5f9] animate-pulse" />)}</div>
                  ) : overrides.length === 0 ? (
                    <p className="text-sm text-[#64748b] rounded-xl border border-dashed border-[#cbd5e1] p-4">No overrides configured.</p>
                  ) : (
                    overrides.map((ovr) => {
                      const available = isAvailableOverride(ovr);
                      return (
                        <article key={ovr.id} className="rounded-xl border border-[#e2e8f0] px-3 py-3 sm:px-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#0f172a]">{humanDate(ovr.date, timezone)}</p>
                            <p className="text-sm text-[#475569] mt-0.5">
                              {available ? `Available from ${to12h(ovr.startTime)} to ${to12h(ovr.endTime)}` : "Unavailable all day"}
                            </p>
                          </div>
                          <button onClick={() => removeOverride(ovr.id)} className="text-sm text-[#dc2626]">Delete</button>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {section === "event-types" && (
            <section className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#0f172a]">Reusable event templates</h2>
              </div>

              {eventsError && <p className="text-sm text-[#dc2626] mt-3">{eventsError}</p>}

              {eventsLoading ? (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[#eef2ff] animate-pulse" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-[#cbd5e1] p-10 text-center">
                  <div className="text-[#0f172a] text-lg font-semibold">No event types yet</div>
                  <p className="text-sm text-[#64748b] mt-1">Create one event and your reusable booking links will appear here.</p>
                  <Link to="/onboarding/event" className="mt-4 inline-block rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium">Create event</Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  {events.map((event) => {
                    const url = bookingUrl(event);
                    return (
                      <article key={event.id} className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#fcfdff]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-[#0f172a]">{event.name}</h3>
                            <p className="text-sm text-[#64748b] mt-1">/{event.slug}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Template</span>
                        </div>
                        <div className="mt-4 flex gap-2 flex-wrap">
                          <button onClick={() => navigator.clipboard.writeText(url)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Copy link</button>
                          <a href={url} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Preview</a>
                          <Link to="/onboarding/event" className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Configure</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {section === "integrations" && (
            <section className="mt-5 space-y-4">
              {banner && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <div className="flex items-center justify-between gap-2">
                    <span>{banner}</span>
                    <button onClick={clearBanner} className="text-emerald-700 underline">Dismiss</button>
                  </div>
                </div>
              )}
              {integrationsError && <p className="text-sm text-[#dc2626]">{integrationsError}</p>}
              <div className="flex justify-end">
                <button onClick={() => refreshStatus(true)} className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm">{integrationsLoading ? "Refreshing..." : "Refresh status"}</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <IntegrationCard
                  provider="google"
                  title="Google Calendar"
                  description="Sync host calendar and prevent double bookings."
                  status={getProviderStatus("google")}
                  rawStatus={statusMap.google}
                  busy={pendingAction?.provider === "google"}
                  onConnect={connectFromDashboard}
                  onDisconnect={() => setDisconnectTargetProvider("google")}
                />
                <IntegrationCard
                  provider="microsoft"
                  title="Microsoft Calendar"
                  description="Sync Outlook events and maintain scheduling availability."
                  status={getProviderStatus("microsoft")}
                  rawStatus={statusMap.microsoft}
                  busy={pendingAction?.provider === "microsoft"}
                  onConnect={connectFromDashboard}
                  onDisconnect={() => setDisconnectTargetProvider("microsoft")}
                />
                <IntegrationCard
                  provider="zoom"
                  title="Zoom"
                  description="Manage conferencing integration for scheduled meetings."
                  status={getProviderStatus("zoom")}
                  rawStatus={statusMap.zoom}
                  busy={pendingAction?.provider === "zoom"}
                  onConnect={connectFromDashboard}
                  onDisconnect={() => setDisconnectTargetProvider("zoom")}
                />
              </div>
            </section>
          )}

          {section !== "meetings" && section !== "event-types" && section !== "availability" && section !== "integrations" && (
            <section className="mt-5 rounded-2xl border border-dashed border-[#cbd5e1] p-8">
              <div className="text-[#0f172a] text-lg font-semibold">{section[0].toUpperCase() + section.slice(1)} area</div>
              <p className="text-sm text-[#64748b] mt-1">This section is reserved for operational controls and will be expanded without changing the meetings-first dashboard.</p>
            </section>
          )}
        </main>
      </div>

      {selectedMeeting && (
        <div className="fixed inset-0 z-40 bg-[#0f172a]/45 p-4 sm:p-6 grid place-items-center" onClick={() => setSelectedMeeting(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-[#dbe4f8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b]">Meeting details</p>
                <h3 className="mt-1 text-xl font-semibold text-[#0f172a]">{selectedMeeting.guestName} · {selectedMeeting.eventTypeName}</h3>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1 text-sm">Close</button>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <DetailRow label="Guest" value={`${selectedMeeting.guestName} (${selectedMeeting.guestEmail})`} />
              <DetailRow label="Status" value={selectedMeeting.bookingStatus} />
              <DetailRow label="Start" value={formatMeetingDateTime(selectedMeeting.startTime)} />
              <DetailRow label="End" value={formatMeetingDateTime(selectedMeeting.endTime)} />
              <DetailRow label="Timezone" value={timezone} />
              <DetailRow label="Provider" value={selectedMeeting.provider || "—"} />
              <DetailRow label="Calendar sync" value={getSyncState({ provider: selectedMeeting.provider, calendarSyncStatus: selectedMeeting.calendarSyncStatus }).label} />
              <DetailRow label="External event ID" value={selectedMeeting.externalEventId || "—"} />
            </div>
            {hostActionError && <p className="mt-3 text-sm text-[#dc2626]">{hostActionError}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {buildInvitationActions({
                provider: selectedMeeting.provider,
                providerEventUrl: selectedMeeting.providerEventUrl,
                conferenceUrl: selectedMeeting.conferenceUrl,
              }).map((action) => (
                <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">{action.label}</a>
              ))}
              {selectedMeeting.conferenceUrl && (
                <button onClick={() => navigator.clipboard.writeText(selectedMeeting.conferenceUrl ?? "")} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Copy meeting link</button>
              )}
              <a href={`mailto:${encodeURIComponent(selectedMeeting.guestEmail)}`} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Email guest</a>
              <button
                onClick={() => setCancelTargetMeeting(selectedMeeting)}
                disabled={selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED || cancellingMeetingId === selectedMeeting.bookingId}
                className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#b91c1c] disabled:opacity-60"
              >
                {cancellingMeetingId === selectedMeeting.bookingId ? "Cancelling..." : selectedMeeting.bookingStatus === BookingLifecycleStatus.CANCELLED ? "Already cancelled" : "Cancel meeting"}
              </button>
            </div>
          </div>
        </div>
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
        open={Boolean(disconnectTargetProvider)}
        tone="danger"
        pending={Boolean(disconnectTargetProvider && pendingAction?.provider === disconnectTargetProvider)}
        title="Disconnect integration?"
        description={disconnectTargetProvider ? `Disconnect ${disconnectTargetProvider} from this host workspace.` : "Disconnect this integration."}
        confirmLabel="Disconnect"
        cancelLabel="Keep connected"
        onCancel={() => setDisconnectTargetProvider(null)}
        onConfirm={async () => {
          if (!disconnectTargetProvider) return;
          await disconnectProvider(disconnectTargetProvider);
          setDisconnectTargetProvider(null);
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#fcfdff] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#64748b]">{label}</div>
      <div className="mt-1 text-[#0f172a] break-all">{value}</div>
    </div>
  );
}
