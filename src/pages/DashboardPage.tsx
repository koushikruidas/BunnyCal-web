import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services";
import clsx from "@/lib/clsx";
import { AppShell, Sidebar, MobileNav, Divider } from "@/ui/layout";
import { Button, Dialog, Badge, Skeleton, EmptyState } from "@/ui/controls";
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
import { buildInvitationActions, getLifecycleState, getSyncState } from "@/lib/meetingActions";
import { formatMeetingDateAndTimeRange, formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useIntegrationState } from "@/state/IntegrationContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { opsLogger } from "@/lib/opsLogger";

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

type DashboardNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  section: "primary" | "secondary";
  mobile: boolean;
};

const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { to: "/dashboard", label: "Meetings", icon: <MeetingsIcon />, section: "primary", mobile: true },
  { to: "/dashboard/availability", label: "Availability", icon: <AvailabilityIcon />, section: "primary", mobile: true },
  { to: "/dashboard/event-types", label: "Event Types", icon: <EventTypesIcon />, section: "secondary", mobile: false },
  { to: "/dashboard/integrations", label: "Integrations", icon: <IntegrationsIcon />, section: "secondary", mobile: false },
  { to: "/dashboard/settings", label: "Settings", icon: <SettingsIcon />, section: "secondary", mobile: true },
];

// ── Nav link wrappers (Link for client-side routing + sidebar/mobile token styles) ─

function SidebarLink({ to, active, icon, children }: { to: string; active: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "focus-ring flex items-center gap-2.5 min-h-touch px-3 py-2 rounded-lg text-body-sm transition-colors duration-fast ease-out",
        active
          ? "bg-accent-surface text-accent-fg font-medium"
          : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
      )}
    >
      {icon ? <span className="shrink-0 text-current" aria-hidden="true">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function MobileNavLink({ to, active, icon, children }: { to: string; active: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "focus-ring relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-touch px-2 py-2 text-caption transition-colors duration-fast ease-out",
        active ? "text-accent-fg font-medium" : "text-text-tertiary hover:text-text-secondary",
      )}
    >
      <span aria-hidden="true" className={clsx("absolute inset-x-6 top-0 h-0.5 rounded-b", active ? "bg-accent-fg" : "bg-transparent")} />
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
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

type MeetingBadgeTone = "neutral" | "success" | "warning" | "danger";

function statusBadgeTone(status: string): MeetingBadgeTone {
  switch (status) {
    case BookingLifecycleStatus.CONFIRMED: return "success";
    case BookingLifecycleStatus.PENDING: return "warning";
    case BookingLifecycleStatus.CANCELLED: return "danger";
    default: return "neutral";
  }
}

function syncBadgeTone(tone: "good" | "warn" | "bad" | "neutral"): MeetingBadgeTone {
  if (tone === "good") return "success";
  if (tone === "bad") return "danger";
  if (tone === "warn") return "warning";
  return "neutral";
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
  const primaryNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.section === "primary");
  const secondaryNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.section === "secondary");
  const mobileNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.mobile);

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
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <div>
              <div className="text-body font-semibold text-text-primary">EasySchedule</div>
              <div className="text-caption text-text-tertiary mt-0.5">Host workspace</div>
            </div>
          }
        >
          {primaryNavItems.map((item) => (
            <SidebarLink key={item.to} to={item.to} active={path === item.to} icon={item.icon}>
              {item.label}
            </SidebarLink>
          ))}
          <Divider className="my-1" />
          {secondaryNavItems.map((item) => (
            <SidebarLink key={item.to} to={item.to} active={path === item.to} icon={item.icon}>
              {item.label}
            </SidebarLink>
          ))}
        </Sidebar>
      }
      mobileNav={
        <MobileNav>
          {mobileNavItems.map((item) => (
            <MobileNavLink key={item.to} to={item.to} active={path === item.to} icon={item.icon}>
              {item.label}
            </MobileNavLink>
          ))}
        </MobileNav>
      }
      mainWidth="wide"
    >
      <div className="rounded-3xl border border-border-subtle bg-surface p-4 sm:p-6 md:p-7 shadow-floating">
        <header className="flex items-center justify-between gap-3 pb-6 border-b border-border-subtle">
          <div>
            <p className="text-body-sm text-text-secondary">Good to see you, {firstName}</p>
            <h1 className="mt-1 text-h1 text-text-primary">
              {section === "event-types"
                ? "Event types"
                : section === "availability"
                  ? "Availability"
                  : section === "integrations"
                    ? "Integrations"
                    : section === "settings"
                      ? "Settings"
                      : "Scheduling operations"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/onboarding/event" className="focus-ring rounded-xl bg-surface-inverse px-4 py-2 text-body-sm font-medium text-text-on-inverse hover:brightness-110">New event</Link>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((prev) => !prev)} className="rounded-full focus-ring" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Open user menu">
                <Avatar name={user?.name || user?.email || user?.username || "User"} image={user?.profileImage} />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-44 rounded-xl border border-border-subtle bg-surface shadow-floating p-1 z-20">
                  <button type="button" role="menuitem" className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">Profile</button>
                  <button type="button" role="menuitem" className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">Settings</button>
                  <button type="button" role="menuitem" onClick={handleLogout} disabled={logoutLoading} className="w-full text-left px-3 py-2 rounded-lg text-sm text-danger-fg hover:bg-danger-surface disabled:opacity-60">
                    {logoutLoading ? "Signing out..." : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

          {section === "meetings" && (
            <section className="mt-6 space-y-4" aria-labelledby="meetings-heading">
              <div>
                <h2 id="meetings-heading" className="text-h2 text-text-primary">Meetings workspace</h2>
                <p className="mt-1 text-body-sm text-text-secondary">Coordinate upcoming commitments and keep scheduling operations calm.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Next meeting</div>
                  {nextMeeting ? (
                    <>
                      <div className="mt-1 font-semibold text-text-primary">{nextMeeting.guestName}</div>
                      <div className="text-sm text-text-secondary">{formatWindow(nextMeeting.startTime, nextMeeting.endTime).date} · {formatWindow(nextMeeting.startTime, nextMeeting.endTime).time}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-text-secondary">No upcoming meeting</div>
                  )}
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Today</div>
                  <div className="mt-1 text-2xl font-semibold text-text-primary">{todayCount}</div>
                  <div className="text-sm text-text-secondary">meetings scheduled</div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Hidden clutter</div>
                  <div className="mt-1 text-2xl font-semibold text-text-primary">{hiddenMeetingIds.length}</div>
                  <button onClick={clearHiddenMeetings} className="mt-2 text-sm text-text-secondary underline disabled:opacity-40" disabled={hiddenMeetingIds.length === 0}>Restore hidden meetings</button>
                </div>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-surface p-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={events.length > 0 ? "success" : "warning"} size="sm">
                    {events.length > 0 ? `${events.length} event type${events.length > 1 ? "s" : ""} ready` : "No event types configured"}
                  </Badge>
                  <Badge tone={connectedProviderCount > 0 ? "success" : "warning"} size="sm">
                    {connectedProviderCount > 0 ? `${connectedProviderCount} integration${connectedProviderCount > 1 ? "s" : ""} connected` : "No integrations connected"}
                  </Badge>
                  <p className="text-xs text-text-tertiary">
                    Booking readiness improves when templates and calendar connections are active.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-border-default p-1 bg-surface">
                  <button onClick={() => setMeetingTab("upcoming")} className={clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "upcoming" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary")}>Upcoming ({meetingBuckets.upcoming.length})</button>
                  <button onClick={() => setMeetingTab("past")} className={clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "past" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary")}>Past ({meetingBuckets.past.length})</button>
                  <button onClick={() => setMeetingTab("cancelled")} className={clsx("rounded-lg px-3 py-1.5 text-sm", meetingTab === "cancelled" ? "bg-surface-inverse text-text-on-inverse" : "text-text-secondary")}>Cancelled ({meetingBuckets.cancelled.length})</button>
                </div>
                <p className="text-xs text-text-tertiary">Source of truth: effective booking status + external lifecycle</p>
              </div>

              {meetingsError && (
                <div className="rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5 text-sm text-danger-fg flex flex-wrap items-center justify-between gap-2" role="alert">
                  <span>{meetingsError}</span>
                  {user?.id && (
                    <Button variant="secondary" size="sm" onClick={() => void loadMeetings(user.id)}>
                      Retry
                    </Button>
                  )}
                </div>
              )}

              {meetingsLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="block" className="h-28" ariaLabel="Loading meeting" />)}
                </div>
              ) : displayedMeetings.length === 0 ? (
                <EmptyState
                  title={`No ${meetingTab} meetings`}
                  description="This view is clear right now."
                />
              ) : (
                <div className="space-y-3">
                  {displayedMeetings.map((meeting) => {
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
                    return (
                      <article key={meeting.bookingId} className={clsx("rounded-2xl p-4 bg-surface-sunken", terminalExternalDelete ? "border-2 border-danger-border" : "border border-border-subtle")}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{dayTone}</div>
                            <h3 className="text-body font-semibold text-text-primary truncate">{meeting.guestName} · {meeting.eventTypeName}</h3>
                            <p className="text-body-sm text-text-secondary mt-0.5">{when.date} · {when.time}</p>
                            <p className="text-body-sm text-text-secondary truncate">{meeting.guestEmail}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {lifecycle && <Badge tone={syncBadgeTone(lifecycle.tone)} size="sm">{lifecycle.label}</Badge>}
                            <Badge tone={statusBadgeTone(meeting.bookingStatus)} size="sm">{terminalExternalDelete ? `Local ${meeting.bookingStatus}` : meeting.bookingStatus}</Badge>
                            {!terminalExternalDelete && <Badge tone={syncBadgeTone(sync.tone)} size="sm">{sync.label}</Badge>}
                          </div>
                        </div>
                        {lifecycle && (
                          <p className={clsx("mt-2 text-xs", terminalExternalDelete ? "text-danger-fg" : "text-text-tertiary")}>
                            {lifecycle.kind === "TERMINAL_EXTERNAL_DELETE" && meeting.bookingStatus !== BookingLifecycleStatus.CANCELLED
                              ? "External event removed; booking status update may still be processing."
                              : lifecycle.detail}
                          </p>
                        )}
                        {terminalExternalDelete && (
                          <p className="mt-1 text-xs text-text-tertiary">
                            Local booking remains {meeting.bookingStatus}. External provider event no longer exists.
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {actions.slice(0, 2).map((action) => (
                            <a key={action.id} href={action.url} target="_blank" rel="noreferrer" className="focus-ring rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken">{action.label}</a>
                          ))}
                          <Button variant="secondary" size="sm" onClick={() => setSelectedMeeting(meeting)}>More details</Button>
                          {(meeting.bookingStatus === BookingLifecycleStatus.EXPIRED || meeting.bookingStatus === BookingLifecycleStatus.CANCELLED || dayTone === "Past") && (
                            <Button variant="ghost" size="sm" onClick={() => hideMeeting(meeting.bookingId)}>Hide</Button>
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
            <section className="mt-6 space-y-5" aria-labelledby="availability-heading">
              {availabilityError && <p className="text-sm text-danger-fg" role="alert">{availabilityError}</p>}

              <div className="rounded-2xl border border-border-subtle p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h2 id="availability-heading" className="text-h3 text-text-primary">Weekly availability</h2>
                    <p className="text-body-sm text-text-secondary">Continuously editable schedule for new bookings.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-sunken px-3 py-1.5 text-xs text-text-secondary">
                    Timezone: <strong className="text-text-primary">{timezone}</strong>
                  </div>
                </div>

                <fieldset className="mt-4 space-y-3">
                  <legend className="sr-only">Weekly availability rules</legend>
                  {DAYS.map((day) => {
                    const dayLabel = day.slice(0, 1) + day.slice(1).toLowerCase();
                    const dayKey = day.toLowerCase();
                    const activeInputId = `availability-active-${dayKey}`;
                    return (
                      <div key={day} className="rounded-xl border border-border-subtle p-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="font-medium text-text-primary sm:w-24 sm:shrink-0">{dayLabel}</div>
                        <label className="text-sm sm:min-w-40 sm:flex-1">
                          <span className="text-text-secondary">Start</span>
                          <input
                            type="time"
                            value={weeklyRules[day].startTime}
                            onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                            disabled={!weeklyRules[day].enabled}
                            className="focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2 disabled:opacity-50"
                          />
                        </label>
                        <label className="text-sm sm:min-w-40 sm:flex-1">
                          <span className="text-text-secondary">End</span>
                          <input
                            type="time"
                            value={weeklyRules[day].endTime}
                            onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                            disabled={!weeklyRules[day].enabled}
                            className="focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2 disabled:opacity-50"
                          />
                        </label>
                        <label htmlFor={activeInputId} className="inline-flex min-h-touch items-center gap-2 text-sm text-text-secondary sm:ml-auto">
                          <input
                            id={activeInputId}
                            type="checkbox"
                            checked={weeklyRules[day].enabled}
                            onChange={(e) => setWeeklyRules((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                            className="focus-ring h-4 w-4 rounded border-border-default"
                          />
                          Active
                        </label>
                      </div>
                    );
                  })}
                </fieldset>

                <div className="mt-4 flex justify-end">
                  <Button onClick={saveWeeklyAvailability} loading={availabilitySaving} size="sm">
                    Save weekly availability
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border-subtle p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-h3 text-text-primary">Date overrides</h3>
                    <p className="text-body-sm text-text-secondary">Add exceptions for vacations, holidays, or custom hours.</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setOverridePanelOpen((v) => !v)}
                    aria-expanded={overridePanelOpen}
                    aria-controls="availability-override-form"
                  >
                    {overridePanelOpen ? "Close" : "Add override"}
                  </Button>
                </div>

                {overridePanelOpen && (
                  <div id="availability-override-form" className="mt-4 rounded-xl border border-border-subtle bg-surface-sunken p-4">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Override mode">
                      <button
                        type="button"
                        onClick={() => setOverrideMode("UNAVAILABLE")}
                        aria-pressed={overrideMode === "UNAVAILABLE"}
                        className={clsx("focus-ring min-h-touch rounded-lg px-3 py-1.5 text-sm border", overrideMode === "UNAVAILABLE" ? "bg-surface-inverse text-text-on-inverse border-surface-inverse" : "bg-surface text-text-primary border-border-default")}
                      >
                        Unavailable all day
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideMode("CUSTOM_HOURS")}
                        aria-pressed={overrideMode === "CUSTOM_HOURS"}
                        className={clsx("focus-ring min-h-touch rounded-lg px-3 py-1.5 text-sm border", overrideMode === "CUSTOM_HOURS" ? "bg-surface-inverse text-text-on-inverse border-surface-inverse" : "bg-surface text-text-primary border-border-default")}
                      >
                        Custom hours
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-sm">
                        <span className="text-text-secondary">Date</span>
                        <input
                          type="date"
                          value={overrideDate}
                          onChange={(e) => setOverrideDate(e.target.value)}
                          className="focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2"
                        />
                      </label>
                      {overrideMode === "CUSTOM_HOURS" && (
                        <>
                          <label className="text-sm">
                            <span className="text-text-secondary">Start</span>
                            <input
                              type="time"
                              value={overrideStartTime}
                              onChange={(e) => setOverrideStartTime(e.target.value)}
                              className="focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2"
                            />
                          </label>
                          <label className="text-sm">
                            <span className="text-text-secondary">End</span>
                            <input
                              type="time"
                              value={overrideEndTime}
                              onChange={(e) => setOverrideEndTime(e.target.value)}
                              className="focus-ring mt-1 w-full rounded-lg border border-border-default bg-surface px-3 py-2"
                            />
                          </label>
                        </>
                      )}
                    </div>
                    {overrideValidationMessage && <p className="mt-2 text-xs text-danger-fg" role="alert">{overrideValidationMessage}</p>}
                    <div className="mt-4 flex justify-end">
                      <Button onClick={createOverride} disabled={!!overrideValidationMessage} loading={submittingOverride} size="sm">
                        Save override
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {loadingOverrides ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="block" className="h-14" ariaLabel="Loading override" />)}</div>
                  ) : overrides.length === 0 ? (
                    <EmptyState
                      title="No overrides configured"
                      description="Add a date override when you need a one-off schedule exception."
                    />
                  ) : (
                    overrides.map((ovr) => {
                      const available = isAvailableOverride(ovr);
                      return (
                        <article key={ovr.id} className="rounded-xl border border-border-subtle px-3 py-3 sm:px-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary">{humanDate(ovr.date, timezone)}</p>
                            <p className="text-sm text-text-secondary mt-0.5 break-words">
                              {available ? `Available from ${to12h(ovr.startTime)} to ${to12h(ovr.endTime)}` : "Unavailable all day"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={available ? "success" : "warning"} size="sm">
                              {available ? "Custom hours" : "Unavailable"}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => removeOverride(ovr.id)}
                              className="focus-ring min-h-touch rounded-lg px-2 text-sm text-danger-fg"
                              aria-label={`Delete override for ${humanDate(ovr.date, timezone)}`}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {section === "event-types" && (
            <section className="mt-6 space-y-3" aria-labelledby="event-types-heading">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 id="event-types-heading" className="text-h2 text-text-primary">Reusable event templates</h2>
                  <p className="mt-1 text-body-sm text-text-secondary">Manage public booking links with consistent scheduling behavior.</p>
                </div>
              </div>

              {eventsError && (
                <div className="mt-3 rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5 text-sm text-danger-fg flex flex-wrap items-center justify-between gap-2" role="alert">
                  <span>{eventsError}</span>
                  <Button variant="secondary" size="sm" onClick={() => void loadEventTypes()}>
                    Retry
                  </Button>
                </div>
              )}

              {eventsLoading ? (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="block" className="h-28" ariaLabel="Loading event type" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="No event types yet"
                    description="Create one event and your reusable booking links will appear here."
                    action={<Link to="/onboarding/event" className="focus-ring rounded-xl border border-border-default bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken">Create event</Link>}
                  />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  {events.map((event) => {
                    const url = bookingUrl(event);
                    return (
                      <article key={event.id} className="rounded-2xl border border-border-subtle p-4 bg-surface-sunken overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-text-primary">{event.name}</h3>
                            <p className="text-sm text-text-secondary mt-1 break-all">/{event.slug}</p>
                          </div>
                          <Badge tone="neutral" size="sm">Template</Badge>
                        </div>
                        <div className="mt-4 flex gap-2 flex-wrap">
                          <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(url)}>Copy link</Button>
                          <a href={url} className="focus-ring inline-flex min-h-touch items-center rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken">Preview</a>
                          <Link to="/onboarding/event" className="focus-ring inline-flex min-h-touch items-center rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken">Configure</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {section === "integrations" && (
            <section className="mt-6 space-y-4">
              {banner && (
                <div className="rounded-xl border border-success-border bg-success-surface px-3 py-2 text-sm text-success-fg">
                  <div className="flex items-center justify-between gap-2">
                    <span>{banner}</span>
                    <button onClick={clearBanner} className="underline">Dismiss</button>
                  </div>
                </div>
              )}
              {integrationsError && <p className="text-sm text-danger-fg">{integrationsError}</p>}
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => refreshStatus(true)} loading={integrationsLoading}>{integrationsLoading ? "Refreshing..." : "Refresh status"}</Button>
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

          {section === "settings" && (
            <section className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border-subtle p-4 sm:p-5">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Workspace configuration</h2>
                  <p className="text-sm text-text-secondary">Keep configuration surfaces grouped here on mobile so scheduling stays the primary path.</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/dashboard/event-types"
                    className="focus-ring rounded-xl border border-border-default bg-surface px-4 py-3 text-left hover:bg-surface-sunken"
                  >
                    <div className="text-sm font-medium text-text-primary">Event types</div>
                    <div className="mt-1 text-sm text-text-secondary">Manage reusable booking templates and links.</div>
                  </Link>
                  <Link
                    to="/dashboard/integrations"
                    className="focus-ring rounded-xl border border-border-default bg-surface px-4 py-3 text-left hover:bg-surface-sunken"
                  >
                    <div className="text-sm font-medium text-text-primary">Integrations</div>
                    <div className="mt-1 text-sm text-text-secondary">Review calendar and conferencing connections.</div>
                  </Link>
                </div>
              </div>
            </section>
          )}

      </div>

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
    </AppShell>
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
