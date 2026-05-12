import { Link, useParams } from "react-router-dom";

export function DraftClaimPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Draft Claim</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">Claim this scheduling setup</h1>
        <p className="mt-3 text-sm text-[#475569]">Account claim conversion is scheduled for a later phase. You can continue managing this draft link now, or sign in to prepare for conversion.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {slug && <Link to={`/d/${slug}/manage`} className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm">Back to manage</Link>}
          <Link to="/sign-in?mode=APP_LOGIN" className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
