import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/services";
import { getDraftPublicUrl, getDraftToken, saveDraftPublicUrl } from "@/modules/draft-host/tokenStore";

export function DraftSharePage() {
  const { slug } = useParams<{ slug: string }>();
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!slug || slug === "undefined" || slug === "null") {
        setError("Invalid draft link.");
        return;
      }
      const cached = getDraftPublicUrl(slug);
      if (cached) setPublicUrl(cached);

      const token = getDraftToken(slug);
      if (!token) return;

      try {
        const draft = await api.getDraftHost(slug, token);
        if (draft.publicUrl) {
          setPublicUrl(draft.publicUrl);
          saveDraftPublicUrl(slug, draft.publicUrl);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to refresh share details.");
      }
    };
    void run();
  }, [slug]);

  const absolute = publicUrl.startsWith("http") ? publicUrl : `${window.location.origin}${publicUrl.startsWith("/") ? publicUrl : `/${publicUrl}`}`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Draft Share</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">Share scheduling link</h1>
        {error && <p className="mt-3 text-sm text-[#dc2626]">{error}</p>}

        <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <p className="text-sm text-[#475569]">Public booking URL</p>
          <p className="mt-1 break-all text-sm text-[#1d4ed8]">{absolute || "Unavailable"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={!absolute} onClick={() => navigator.clipboard.writeText(absolute)} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm disabled:opacity-50">Copy link</button>
            <a href={absolute || "#"} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Open link</a>
          </div>
        </div>

        {slug && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/d/${slug}/manage`} className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm">Back to manage</Link>
            <Link to={`/d/${slug}/claim`} className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white">Claim account</Link>
          </div>
        )}
      </div>
    </div>
  );
}
