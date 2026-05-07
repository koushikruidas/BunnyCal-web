import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import type { DayOfWeek } from "@/services/types";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export function OnboardingAvailabilityPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.upsertAvailabilityRules({
        rules: DAYS.map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00" })),
      });
      navigate("/onboarding/event");
    } catch (e) {
      console.error(e);
      setError("Unable to save availability rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm">
        <div className="text-sm text-[#6b7280]">Step 2/3</div>
        <h1 className="text-2xl font-semibold text-[#111827] mt-1">Set availability</h1>
        <p className="text-[#6b7280] mt-1">Default template: weekdays, 9:00 AM to 5:00 PM.</p>
        {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}
        <div className="mt-6 grid grid-cols-5 gap-2">
          {DAYS.map((d) => (
            <div key={d} className="rounded-xl border border-[#d1d5db] p-3 text-center text-sm bg-[#eef2ff]">{d.slice(0, 3)}</div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7] disabled:opacity-60">
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
