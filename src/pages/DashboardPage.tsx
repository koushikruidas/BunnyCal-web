import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
import type { EventTypeSummaryResponse } from "@/services/types";
import { useAuth } from "@/state/AuthContext";

export function DashboardPage() {
  const { user, logout, logoutLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventTypeSummaryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listEventTypes()
      .then((eventTypes) => {
        setEvents(eventTypes);
      })
      .catch((e) => {
        console.error(e);
        setError("Failed to load dashboard data.");
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[220px_1fr] gap-5">
        <aside className="bg-white rounded-2xl border border-[#e5e7eb] p-4 h-fit">
          <nav className="space-y-2 text-sm">
            <div className="font-medium text-[#111827]">Events</div>
            <div className="text-[#6b7280]">Meetings</div>
            <div className="text-[#6b7280]">Availability</div>
            <div className="text-[#6b7280]">Settings</div>
          </nav>
        </aside>
        <main className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-[#111827]">Event Types{user ? ` · ${user.name || user.email || user.username}` : ""}</h1>
            <div className="flex items-center gap-2">
              <Link to="/onboarding/event" className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7]">Create event</Link>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="px-4 py-2 rounded-xl border border-[#d1d5db] disabled:opacity-60"
              >
                {logoutLoading ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-[#dc2626] mb-4">{error}</p>}

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-[#eef2ff] animate-pulse" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d1d5db] p-10 text-center">
              <div className="text-[#111827] font-medium">Create your first event</div>
              <p className="text-sm text-[#6b7280] mt-1">Once created, your shareable booking link appears here.</p>
              <Link to="/onboarding/event" className="mt-4 inline-block px-4 py-2 rounded-xl border border-[#c7d2fe] bg-[#eef2ff]">Create event</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {events.map((event) => (
                <article key={event.id} className="rounded-xl border border-[#e5e7eb] p-4 bg-white shadow-[0_8px_24px_rgba(99,102,241,0.08)]">
                  <div className="font-medium text-[#111827]">{event.name}</div>
                  <div className="text-sm text-[#6b7280] mt-1">/{event.slug}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(event.link)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-[#eef2ff] border border-[#c7d2fe]"
                    >
                      Copy link
                    </button>
                    <a href={event.link} className="px-3 py-1.5 rounded-lg text-sm border border-[#d1d5db]">Preview</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
