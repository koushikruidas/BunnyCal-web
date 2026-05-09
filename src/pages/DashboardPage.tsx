import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
import type { EventTypeSummaryResponse, HostMeetingResponse } from "@/services/types";
import { useAuth } from "@/state/AuthContext";
import { Avatar } from "@/components/Avatar";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
import { BookingLifecycleStatus } from "@/constants/bookingStatus";

const MEETINGS_LIMIT = 50;

function formatWindow(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const date = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(start);
  const time = `${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start)} - ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end)}`;
  return { date, time };
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

export function DashboardPage() {
  const { user, refreshUser, logout, logoutLoading } = useAuth();
  const [eventsLoading, setEventsLoading] = useState(true);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [events, setEvents] = useState<EventTypeSummaryResponse[]>([]);
  const [meetings, setMeetings] = useState<HostMeetingResponse[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

    api.listHostMeetings(user.id, { upcomingOnly: true, limit: MEETINGS_LIMIT })
      .then(setMeetings)
      .catch((e) => {
        console.error(e);
        setMeetingsError("Failed to load upcoming meetings.");
        setMeetings([]);
      })
      .finally(() => setMeetingsLoading(false));
  }, [refreshUser, user?.id]);

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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_45%,#f9fbff_100%)] px-5 py-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[220px_1fr] gap-5">
        <aside className="rounded-3xl border border-[#dbe4f8] bg-white p-4 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="px-2 pb-3 border-b border-[#eef2f7]">
            <div className="text-[#0f172a] font-semibold">EasySchedule</div>
            <div className="text-xs text-[#64748b] mt-1">Host workspace</div>
          </div>
          <nav className="pt-3 space-y-1 text-sm">
            <div className="rounded-xl bg-[#eef2ff] text-[#3730a3] px-3 py-2 font-medium">Event types</div>
            <div className="rounded-xl px-3 py-2 text-[#64748b]">Meetings</div>
            <div className="rounded-xl px-3 py-2 text-[#64748b]">Availability</div>
            <div className="rounded-xl px-3 py-2 text-[#64748b]">Integrations</div>
            <div className="rounded-xl px-3 py-2 text-[#64748b]">Settings</div>
          </nav>
        </aside>

        <main className="rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <header className="flex items-center justify-between gap-3 pb-5 border-b border-[#eef2f7]">
            <div>
              <p className="text-sm text-[#64748b]">Good to see you, {firstName}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">Scheduling operations</h1>
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

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#0f172a]">Upcoming meetings</h2>
              <p className="text-xs text-[#64748b]">Source: booking lifecycle state</p>
            </div>

            {meetingsError && <p className="text-sm text-[#dc2626] mt-3">{meetingsError}</p>}

            {meetingsLoading ? (
              <div className="grid gap-3 mt-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-[#eef2ff] animate-pulse" />)}
              </div>
            ) : meetings.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-[#cbd5e1] p-8 text-center">
                <div className="text-[#0f172a] text-lg font-semibold">No upcoming meetings</div>
                <p className="text-sm text-[#64748b] mt-1">New bookings will appear here once guests schedule time.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {meetings.map((meeting) => {
                  const when = formatWindow(meeting.startTime, meeting.endTime);
                  return (
                    <article key={meeting.bookingId} className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#fcfdff]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#0f172a]">{meeting.eventTypeName}</h3>
                          <p className="text-sm text-[#64748b] mt-1">{when.date} · {when.time}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(meeting.bookingStatus)}`}>
                          {meeting.bookingStatus}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#334155]">
                        <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e5e7eb]">{meeting.guestName} · {meeting.guestEmail}</span>
                        {meeting.provider && <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e5e7eb]">Provider: {meeting.provider}</span>}
                        <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e5e7eb]">
                          Calendar sync: {meeting.externalEventId ? "Synced" : "Syncing"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#0f172a]">Event types configuration</h2>
              <Link to="/onboarding/event" className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b]">New event</Link>
            </div>

            {eventsError && <p className="text-sm text-[#dc2626] mt-3">{eventsError}</p>}

            {eventsLoading ? (
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[#eef2ff] animate-pulse" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-[#cbd5e1] p-10 text-center">
                <div className="text-[#0f172a] text-lg font-semibold">No event types yet</div>
                <p className="text-sm text-[#64748b] mt-1">Create one event and your shareable links will appear here.</p>
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
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Config</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(url)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Copy link</button>
                        <a href={url} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Preview</a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
