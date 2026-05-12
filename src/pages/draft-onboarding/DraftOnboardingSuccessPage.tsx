import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/urls";

export function DraftOnboardingSuccessPage() {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    const stored = sessionStorage.getItem("createdEventLink");
    return stored ? toAbsoluteUrl(stored) : "";
  }, []);
  const slug = useMemo(() => sessionStorage.getItem("createdDraftSlug") ?? "", []);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-5 py-8">
      <div className="w-full max-w-2xl rounded-3xl border border-[#dbe4f8] bg-white p-7 md:p-10 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 grid place-items-center text-2xl">✓</div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#0f172a]">Your booking link is live</h1>
        <p className="mt-2 text-[#475569]">Share it with clients and start accepting meetings instantly.</p>

        <div className="mt-6 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155] break-all">{link}</div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button disabled={!link} onClick={copy} className="rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-60">
            {copied ? "Copied" : "Copy link"}
          </button>
          <a href={link || "#"} className="rounded-xl border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-medium text-[#0f172a]">Preview booking page</a>
          {slug && <Link to={`/d/${slug}/manage`} className="rounded-xl border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-medium text-[#0f172a]">Manage link</Link>}
        </div>
      </div>
    </div>
  );
}
