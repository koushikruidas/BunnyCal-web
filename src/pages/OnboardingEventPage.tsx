import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function OnboardingEventPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Intro Call");
  const [location, setLocation] = useState("Google Meet");
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => slugify(name || "event"), [name]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await api.createEventType({
        name,
        description: "",
        location,
        durationMinutes: duration,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        slotIntervalMinutes: duration,
        minNoticeMinutes: 60,
        maxAdvanceDays: 60,
        holdDurationMinutes: 5,
        slug,
      });
      sessionStorage.setItem("createdEventLink", created.link);
      navigate("/onboarding/success");
    } catch (e) {
      console.error(e);
      setError("Unable to create event type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm">
          <div className="text-sm text-[#6b7280]">Step 3/3</div>
          <h1 className="text-2xl font-semibold text-[#111827] mt-1">Create first event type</h1>
          {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}
          <div className="mt-5 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5" placeholder="Event name" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border rounded-xl px-3 py-2.5" placeholder="Location" />
            <label className="text-sm text-[#6b7280]">Duration: {duration} min</label>
            <input type="range" min={15} max={60} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
          </div>
          <button onClick={create} disabled={saving} className="mt-6 px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7] disabled:opacity-60">
            {saving ? "Creating..." : "Create event"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm">
          <div className="text-sm text-[#6b7280]">Live preview</div>
          <div className="mt-3 rounded-xl border border-[#e5e7eb] p-4 bg-[#f9fafb]">
            <h3 className="font-semibold text-[#111827]">{name}</h3>
            <p className="text-sm text-[#6b7280] mt-1">{duration} min · {location}</p>
            <p className="text-xs text-[#9ca3af] mt-3">/book/yourname/{slug}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
