import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/services";
import type { DraftHostResponse } from "@/services/types";
import { getDraftToken, saveDraftPublicUrl } from "@/modules/draft-host/tokenStore";
import { BunnyMark } from "@/components/BunnyMark";

export function DraftManagePage() {
  const { slug } = useParams<{ slug: string }>();
  const [draft, setDraft] = useState<DraftHostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!slug || slug === "undefined" || slug === "null") {
        setError("Invalid draft link.");
        setLoading(false);
        return;
      }
      const token = getDraftToken(slug);
      if (!token) {
        setError("Missing draft management token on this device.");
        setLoading(false);
        return;
      }

      try {
        const loaded = await api.getDraftHost(slug, token);
        setDraft(loaded);
        setSuccessMessage(null);
        if (loaded.publicUrl) saveDraftPublicUrl(slug, loaded.publicUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to load draft management details.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [slug]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug || !draft) return;
    const token = getDraftToken(slug);
    if (!token) {
      setError("Missing draft management token on this device.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await api.updateDraftHost(slug, token, {
        displayName: draft.displayName ?? "",
        timezone: draft.timezone ?? "",
        eventName: draft.eventName ?? "",
        description: draft.description ?? "",
        location: draft.location ?? "",
        durationMinutes: draft.durationMinutes ?? 30,
        slotIntervalMinutes: draft.slotIntervalMinutes ?? 30,
        holdDurationMinutes: draft.holdDurationMinutes ?? 5,
        rules: draft.rules ?? [],
        overrides: draft.overrides ?? [],
      });
      setDraft(updated);
      if (updated.publicUrl) saveDraftPublicUrl(slug, updated.publicUrl);
      setSuccessMessage("Draft saved successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to update draft.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-[#64748b]">Loading draft...</div>;

  const updateField = <K extends keyof DraftHostResponse>(key: K, value: DraftHostResponse[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (successMessage) setSuccessMessage(null);
    if (error) setError(null);
  };

  const absolutePublicUrl = draft?.publicUrl
    ? (draft.publicUrl.startsWith("http") ? draft.publicUrl : `${window.location.origin}${draft.publicUrl.startsWith("/") ? draft.publicUrl : `/${draft.publicUrl}`}`)
    : "";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BunnyMark size={15} color="#7A6BB0" />
              <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">BunnyCal</p>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0f172a]">Manage scheduling link</h1>
          </div>
          {slug && <Link className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm" to={`/d/${slug}/share`}>Share</Link>}
        </div>

        {error && <p className="mt-3 text-sm text-[#dc2626]">{error}</p>}
        {successMessage && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}
        {!draft ? null : (
          <form onSubmit={onSave} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-sm text-[#475569]">Display name</span><input value={draft.displayName ?? ""} onChange={(e) => updateField("displayName", e.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block"><span className="text-sm text-[#475569]">Timezone</span><input value={draft.timezone ?? ""} onChange={(e) => updateField("timezone", e.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block sm:col-span-2"><span className="text-sm text-[#475569]">Event name</span><input value={draft.eventName ?? ""} onChange={(e) => updateField("eventName", e.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block sm:col-span-2"><span className="text-sm text-[#475569]">Description</span><textarea value={draft.description ?? ""} onChange={(e) => updateField("description", e.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block sm:col-span-2"><span className="text-sm text-[#475569]">Location</span><input value={draft.location ?? ""} onChange={(e) => updateField("location", e.target.value)} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block"><span className="text-sm text-[#475569]">Duration</span><input type="number" value={draft.durationMinutes ?? 30} min={15} step={15} onChange={(e) => updateField("durationMinutes", Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block"><span className="text-sm text-[#475569]">Slot interval</span><input type="number" value={draft.slotIntervalMinutes ?? 30} min={15} step={15} onChange={(e) => updateField("slotIntervalMinutes", Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            <label className="block sm:col-span-2"><span className="text-sm text-[#475569]">Hold duration</span><input type="number" value={draft.holdDurationMinutes ?? 5} min={1} step={1} onChange={(e) => updateField("holdDurationMinutes", Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" /></label>
            {absolutePublicUrl && (
              <div className="sm:col-span-2 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-sm text-[#475569]">Public booking URL</p>
                <p className="mt-1 break-all text-sm text-[#1d4ed8]">{absolutePublicUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(absolutePublicUrl)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Copy link</button>
                  <a href={absolutePublicUrl} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Preview booking page</a>
                  {slug && <Link to={`/d/${slug}/share`} className="rounded-lg bg-[#0f172a] px-3 py-1.5 text-sm font-medium text-white">Share booking link</Link>}
                </div>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save draft"}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
