import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { BunnyMark } from "@/components/BunnyMark";
import { opsLogger } from "@/lib/opsLogger";
import "./dashboard/dashboard.css";

// ── Icons ─────────────────────────────────────────────────────────────────────

function MeetingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="12" rx="2" />
      <path d="M1 7h14M5 1v4M11 1v4" />
    </svg>
  );
}
function AvailabilityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}
function EventTypesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h8M2 12h5" />
    </svg>
  );
}
function IntegrationsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="8" r="2.5" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6.5 8h3.5M9.5 4l-3.5 3M9.5 12l-3.5-3" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  );
}

// ── Nav link ──────────────────────────────────────────────────────────────────

function SidebarLink({ to, active, icon, children, count }: { to: string; active: boolean; icon?: ReactNode; children: ReactNode; count?: number }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={clsx("side-link", active && "active")}
    >
      {icon ? <span className="icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
      {count != null && <span className="count">{count}</span>}
    </Link>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

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
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrides, setOverrides] = useState<AvailabilityOverrideResponse[]>([]);
  const [overridePanelOpen, setOverridePanelOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const { loading: integrationsLoading, error: integrationsError, banner, clearBanner, getProviderStatus, startGoogleConnect, disconnect, pendingAction, refreshStatus } = useIntegrationState();

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
  const connectedProviderCount = ["google", "microsoft", "zoom"].filter(
    (provider) => getProviderStatus(provider as "google" | "microsoft" | "zoom") === "connected",
  ).length;

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
      <div className="dash">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="dash-side" aria-label="Workspace navigation">
          <div className="dash-side-brand">
            <BunnyMark size={22} />
            <div className="dash-side-brand-text">
              <span className="dash-side-brand-name">
                bunny<span style={{ fontFamily: "var(--sans)", fontWeight: 500 }}>Cal</span>
              </span>
              <span className="dash-side-brand-sub">Host workspace</span>
            </div>
          </div>

          <div className="side-section-label">Workspace</div>
          <SidebarLink to="/dashboard" active={path === "/dashboard"} icon={<MeetingsIcon />} count={meetingBuckets.upcoming.length || undefined}>
            Meetings
          </SidebarLink>
          <SidebarLink to="/dashboard/availability" active={path === "/dashboard/availability"} icon={<AvailabilityIcon />}>
            Availability
          </SidebarLink>

          <div className="side-section-label">Configuration</div>
          <SidebarLink to="/dashboard/event-types" active={path === "/dashboard/event-types"} icon={<EventTypesIcon />} count={events.length || undefined}>
            Event Types
          </SidebarLink>
          <SidebarLink to="/dashboard/integrations" active={path === "/dashboard/integrations"} icon={<IntegrationsIcon />}>
            Integrations
          </SidebarLink>
          <SidebarLink to="/dashboard/settings" active={path === "/dashboard/settings"} icon={<SettingsIcon />}>
            Settings
          </SidebarLink>

          <div className="dash-side-foot">
            <div style={{ position: "relative" }}>
              <div
                className="dash-user"
                role="button"
                tabIndex={0}
                onClick={() => setMenuOpen((p) => !p)}
                onKeyDown={(e) => e.key === "Enter" && setMenuOpen((p) => !p)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <div className="av">{(user?.name || user?.email || "U")[0]?.toUpperCase()}</div>
                <div className="dash-user-meta">
                  <span className="name">{user?.name || user?.email || "User"}</span>
                  <span className="handle">@{user?.username || "host"}</span>
                </div>
              </div>
              {menuOpen && (
                <div role="menu" className="dash-user-menu">
                  <button type="button" role="menuitem" className="dash-menu-item" onClick={() => setMenuOpen(false)}>Profile</button>
                  <button type="button" role="menuitem" className="dash-menu-item" onClick={() => setMenuOpen(false)}>Settings</button>
                  <button type="button" role="menuitem" className="dash-menu-item danger" onClick={handleLogout} disabled={logoutLoading}>
                    {logoutLoading ? "Signing out…" : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main canvas ─────────────────────────────────────── */}
        <main className="dash-main">
          <header className="dash-top">
            <div>
              <h1>
                {section === "meetings" && (<>Good to see you, <em>{firstName}.</em></>)}
                {section === "availability" && (<>Your <em>availability.</em></>)}
                {section === "event-types" && (<>Event <em>templates.</em></>)}
                {section === "integrations" && (<>Connected <em>integrations.</em></>)}
                {section === "settings" && (<><em>Workspace</em> settings.</>)}
              </h1>
            </div>
            <div className="dash-top-actions">
              <Link to="/onboarding/event" className="dash-btn-primary">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
                New event
              </Link>
            </div>
          </header>

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
                            Next up · {formatRelativeDay(nextMeeting.startTime)}
                          </div>
                          <div className="countdown">
                            {new Date(nextMeeting.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            <small>{formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}</small>
                          </div>
                          <div className="who" style={{ marginTop: 16 }}>
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
                        <div className="countdown" style={{ fontSize: "clamp(42px, 4.5vw, 68px)", marginTop: 12 }}>
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

          {/* ── Availability ──────────────────────────────────── */}
          {section === "availability" && (
            <>
              {availabilityError && <div className="dash-alert error">{availabilityError}</div>}

              <div className="dash-section">
                <div className="panel">
                  <div className="h">
                    <div>
                      <h3>Weekly rhythm</h3>
                      <div className="sub">{timezone}</div>
                    </div>
                    <Button onClick={saveWeeklyAvailability} loading={availabilitySaving} size="sm">Save</Button>
                  </div>

                  <div className="mini-avail">
                    {(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as DayOfWeek[]).map((day, idx) => {
                      const lbl = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx];
                      const rule = weeklyRules[day];
                      const startH = rule.enabled ? parseInt(rule.startTime.split(":")[0], 10) : -1;
                      const endH = rule.enabled ? parseInt(rule.endTime.split(":")[0], 10) : -1;
                      return (
                        <div key={day} className="ma-day">
                          <div className="lbl">{lbl}</div>
                          <div className="ma-bar">
                            {Array.from({ length: 24 }).map((_, h) => (
                              <div key={h} className={clsx("cell", rule.enabled && h >= startH && h < endH && "on")} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 24 }}>
                    {DAYS.map((day) => {
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
                </div>
              </div>

              <div className="dash-section">
                <div className="panel">
                  <div className="h">
                    <div>
                      <h3>Date overrides</h3>
                      <div className="sub">Exceptions for vacations, holidays, or custom hours</div>
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
                      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 56 }} />)}
                    </div>
                  ) : overrides.length === 0 ? (
                    <div className="dash-empty" style={{ padding: "28px 16px" }}>
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
                                {available ? `Available ${to12h(ovr.startTime)} – ${to12h(ovr.endTime)}` : "Unavailable all day"}
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
            <div className="dash-section">
              {banner && (
                <div className="dash-alert success">
                  <span>{banner}</span>
                  <button onClick={clearBanner} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }}>Dismiss</button>
                </div>
              )}
              {integrationsError && <div className="dash-alert error">{integrationsError}</div>}

              <div className="int-band">
                <div className="int-fabric">
                  <h3 className="h3">Calendar <em>fabric.</em></h3>
                  <div className="stats">
                    {(["google", "microsoft", "zoom"] as const).map((provider) => {
                      const status = getProviderStatus(provider);
                      const names = { google: "Google", microsoft: "Microsoft", zoom: "Zoom" };
                      return (
                        <div key={provider} className="stat">
                          <div className="lbl">{names[provider]}</div>
                          <div className="val">{status === "connected" ? "On" : "Off"}</div>
                          <div className="hint">{status === "connected" ? "Connected" : "Disconnected"}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="logos">
                    {(["google", "microsoft", "zoom"] as const)
                      .filter((p) => getProviderStatus(p) === "connected")
                      .map((provider) => {
                        const names = { google: "Google Calendar", microsoft: "Microsoft Calendar", zoom: "Zoom" };
                        return (
                          <span key={provider} className="logo-chip">
                            <span className="glyph">{provider[0].toUpperCase()}</span>
                            {names[provider]}
                          </span>
                        );
                      })}
                    {connectedProviderCount === 0 && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }}>
                        No integrations connected yet
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => refreshStatus(true)} disabled={integrationsLoading}>
                      {integrationsLoading ? "Refreshing…" : "Refresh status"}
                    </button>
                  </div>
                </div>

                <div className="int-tiles-col">
                  {(["google", "microsoft", "zoom"] as const).map((provider) => {
                    const status = getProviderStatus(provider);
                    const names = { google: "Google Calendar", microsoft: "Microsoft Calendar", zoom: "Zoom" };
                    const descs = { google: "Sync calendar, prevent double bookings", microsoft: "Sync Outlook events and availability", zoom: "Manage conferencing for meetings" };
                    return (
                      <div key={provider} className="int-tile-mini">
                        <div className="logo">{provider[0].toUpperCase()}</div>
                        <div>
                          <div className="name">{names[provider]}</div>
                          <div className="last">{descs[provider]}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                          <div className={clsx("dot", status === "connected" ? "ok" : "idle")} />
                          {status === "connected" ? (
                            <button className="dash-btn-secondary" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setDisconnectTargetProvider(provider)} disabled={pendingAction?.provider === provider}>
                              Disconnect
                            </button>
                          ) : (
                            <button className="dash-btn-primary" style={{ fontSize: 11, padding: "5px 12px", borderRadius: 9 }} onClick={connectFromDashboard} disabled={pendingAction?.provider === provider}>
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
        </main>
      </div>

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
    <div className="rounded-xl border border-border-subtle bg-surface-sunken px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{label}</div>
      <div className="mt-1 text-text-primary break-all">{value}</div>
    </div>
  );
}
