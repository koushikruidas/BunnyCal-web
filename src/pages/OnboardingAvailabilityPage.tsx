import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import type {
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  DayOfWeek,
} from "@/services/types";
import { useAuth } from "@/state/AuthContext";
import { getBrowserTimeZone } from "@/lib/dateTime";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
type OverrideMode = "UNAVAILABLE" | "CUSTOM_HOURS";

function humanDate(date: string, tz: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
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

export function OnboardingAvailabilityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<AvailabilityOverrideResponse[]>([]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<OverrideMode>("UNAVAILABLE");
  const [overrideDate, setOverrideDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");

  const timezone = user?.timezone || getBrowserTimeZone();

  const validationMessage = useMemo(() => {
    if (!overrideDate) return "Please choose a date.";
    if (mode === "CUSTOM_HOURS") {
      if (!startTime || !endTime) return "Please select start and end time.";
      if (endTime <= startTime) return "End time must be later than start time.";
    }
    return null;
  }, [endTime, mode, overrideDate, startTime]);

  const loadOverrides = async () => {
    setLoadingOverrides(true);
    setError(null);
    try {
      const list = await api.getAvailabilityOverrides();
      setOverrides(list.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      console.error(e);
      setError("Unable to load date overrides.");
    } finally {
      setLoadingOverrides(false);
    }
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const saveWeeklyDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.upsertAvailabilityRules({
        rules: DAYS.map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00" })),
      });
      navigate("/onboarding/event");
    } catch (e) {
      console.error(e);
      setError("Unable to save weekly availability.");
    } finally {
      setSaving(false);
    }
  };

  const createOverride = async () => {
    if (validationMessage) return;
    setSubmittingOverride(true);
    setError(null);

    const payload: AvailabilityOverrideCreateRequest =
      mode === "UNAVAILABLE"
        ? {
            date: overrideDate,
            isAvailable: false,
          }
        : {
            date: overrideDate,
            isAvailable: true,
            startTime,
            endTime,
          };

    try {
      const created = await api.createAvailabilityOverride(payload);
      setOverrides((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setPanelOpen(false);
      setOverrideDate("");
      setStartTime("09:00");
      setEndTime("13:00");
      setMode("UNAVAILABLE");
    } catch (e) {
      console.error(e);
      setError("Unable to create override. Please try again.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const removeOverride = async (id: string) => {
    const existing = overrides;
    setOverrides((prev) => prev.filter((x) => x.id !== id));
    try {
      await api.deleteAvailabilityOverride(id);
    } catch (e) {
      console.error(e);
      setOverrides(existing);
      setError("Unable to remove override.");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8">
      <div className="max-w-4xl mx-auto rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Step 2 of 3</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#0f172a]">Weekly schedule + date overrides</h1>
        <p className="mt-2 text-[#475569]">Use overrides as exceptions to your regular hours.</p>
        {error && <p className="text-sm text-[#dc2626] mt-4">{error}</p>}

        <div className="mt-6 rounded-2xl border border-[#dbe4f8] overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr] bg-[#f8fafc] text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b] px-4 py-2">
            <span>Day</span><span>Start</span><span>End</span>
          </div>
          {DAYS.map((d) => (
            <div key={d} className="grid grid-cols-[1fr_1fr_1fr] px-4 py-3 border-t border-[#eef2f7] text-sm">
              <span className="font-medium text-[#0f172a]">{d.slice(0, 1) + d.slice(1).toLowerCase()}</span>
              <span className="text-[#334155]">9:00 AM</span>
              <span className="text-[#334155]">5:00 PM</span>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-[#e2e8f0] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Date overrides</p>
              <p className="text-xs text-[#64748b] mt-1">Timezone: <strong>{timezone}</strong></p>
            </div>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm"
            >
              {panelOpen ? "Close" : "Add date override"}
            </button>
          </div>

          {panelOpen && (
            <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode("UNAVAILABLE")}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${mode === "UNAVAILABLE" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`}
                >
                  Unavailable all day
                </button>
                <button
                  type="button"
                  onClick={() => setMode("CUSTOM_HOURS")}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${mode === "CUSTOM_HOURS" ? "bg-[#0f172a] text-white border-[#0f172a]" : "bg-white text-[#0f172a] border-[#d1d5db]"}`}
                >
                  Custom hours
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="text-[#334155]">Date</span>
                  <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                </label>

                {mode === "CUSTOM_HOURS" && (
                  <>
                    <label className="text-sm">
                      <span className="text-[#334155]">Start</span>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                    </label>
                    <label className="text-sm">
                      <span className="text-[#334155]">End</span>
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2" />
                    </label>
                  </>
                )}
              </div>

              {validationMessage && <p className="mt-3 text-xs text-[#dc2626]">{validationMessage}</p>}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={createOverride}
                  disabled={!!validationMessage || submittingOverride}
                  className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submittingOverride ? "Saving..." : "Save override"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {loadingOverrides ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[#f1f5f9] animate-pulse" />)}
              </div>
            ) : overrides.length === 0 ? (
              <p className="text-sm text-[#64748b] rounded-xl border border-dashed border-[#cbd5e1] p-4">No date overrides yet.</p>
            ) : (
              overrides.map((ovr) => {
                const available = isAvailableOverride(ovr);
                return (
                  <article key={ovr.id} className="rounded-xl border border-[#e2e8f0] px-3 py-3 sm:px-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">{humanDate(ovr.date, timezone)}</p>
                      <p className="text-sm text-[#475569] mt-0.5">
                        {available
                          ? `Available from ${to12h(ovr.startTime)} to ${to12h(ovr.endTime)}`
                          : "Unavailable all day"}
                      </p>
                    </div>
                    <button onClick={() => removeOverride(ovr.id)} className="text-sm text-[#dc2626]">Delete</button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <button
            onClick={saveWeeklyDefaults}
            disabled={saving}
            className="rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
