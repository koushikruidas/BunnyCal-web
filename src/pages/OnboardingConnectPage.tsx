import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";

export function OnboardingConnectPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleGoogleConnect = () => {
    window.location.href = api.getGoogleOAuthUrl();
  };

  useEffect(() => {
    api
      .getCalendarStatus()
      .then(setStatus)
      .catch((e: unknown) => {
        console.error(e);
        setError("Failed to load calendar status.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faff] p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm">
        <div className="text-sm text-[#6b7280]">Step 1/3</div>
        <h1 className="text-2xl font-semibold text-[#111827] mt-1">Connect your calendar</h1>
        <p className="text-[#6b7280] mt-1">Bookings are synced in real time to prevent conflicts.</p>
        {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {loading ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#eef2ff] animate-pulse" />) : (
            <>
              <button onClick={handleGoogleConnect} className="rounded-xl border border-[#d1d5db] p-4 text-left hover:bg-[#f9fafb]">
                <div className="font-medium text-[#111827]">Google Calendar</div>
                <div className="text-sm text-[#6b7280] mt-1">{status.google ?? "Not connected"}</div>
              </button>
              <button className="rounded-xl border border-[#d1d5db] p-4 text-left hover:bg-[#f9fafb]">
                <div className="font-medium text-[#111827]">Outlook</div>
                <div className="text-sm text-[#6b7280] mt-1">{status.outlook ?? "Not connected"}</div>
              </button>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Link to="/onboarding/availability" className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7]">Continue</Link>
        </div>
      </div>
    </div>
  );
}
