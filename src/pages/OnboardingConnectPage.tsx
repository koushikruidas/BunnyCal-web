import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";

function statusTone(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("active") || normalized.includes("connected")) {
    return { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  }
  if (normalized.includes("error")) {
    return { badge: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" };
  }
  return { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
}

export function OnboardingConnectPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const googleStatus = useMemo(() => status.google ?? "Not connected", [status.google]);
  const googleTone = statusTone(googleStatus);
  const isConnected = /active|connected/i.test(googleStatus);

  const loadStatus = async () => {
    setError(null);
    try {
      const response = await api.getCalendarStatus();
      setStatus(response);
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to load calendar status.");
    }
  };

  const handleGoogleConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const redirectUrl = await api.getCalendarConnectRedirectUrl();
      window.location.href = redirectUrl;
    } catch (e) {
      console.error(e);
      setError("Failed to start Google Calendar connect.");
      setBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.disconnectCalendar("google");
      await loadStatus();
    } catch (e) {
      console.error(e);
      setError("Failed to disconnect Google Calendar.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-5 py-8">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[280px_1fr] gap-5">
        <aside className="rounded-3xl border border-[#dbe4f8] bg-white p-5 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6b7280]">Setup</p>
          <h2 className="mt-2 text-xl font-semibold text-[#0f172a]">Welcome to your workspace</h2>
          <ol className="mt-5 space-y-3 text-sm">
            <li className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-3 py-2 text-[#3730a3]">1. Connect calendar</li>
            <li className="rounded-xl border border-[#e5e7eb] px-3 py-2 text-[#6b7280]">2. Set weekly hours</li>
            <li className="rounded-xl border border-[#e5e7eb] px-3 py-2 text-[#6b7280]">3. Publish first event</li>
          </ol>
        </aside>

        <main className="rounded-3xl border border-[#dbe4f8] bg-white p-6 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Step 1 of 3</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]">Connect your calendar</h1>
              <p className="mt-2 text-[#475569]">Bookings are blocked automatically when your calendar is busy.</p>
            </div>
            {!loading && (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${googleTone.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${googleTone.dot}`} />
                {googleStatus}
              </span>
            )}
          </div>

          {error && <p className="text-sm text-[#dc2626] mt-4">{error}</p>}

          <div className="mt-7 rounded-2xl border border-[#d1d5db] p-4">
            <div className="text-lg font-semibold text-[#0f172a]">Google Calendar</div>
            <div className="text-sm text-[#64748b] mt-1">Sync events and prevent double bookings</div>
            <div className="mt-4 flex gap-2">
              {!isConnected ? (
                <button onClick={handleGoogleConnect} disabled={busy} className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  Connect
                </button>
              ) : (
                <button onClick={disconnectGoogle} disabled={busy} className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#0f172a] disabled:opacity-60">
                  {busy ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
              <button onClick={loadStatus} className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm">Refresh status</button>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Link to="/onboarding/availability" className="rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b]">
              Continue to availability
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
