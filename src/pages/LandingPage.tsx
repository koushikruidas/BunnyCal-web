import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8faff_0%,#eef2ff_45%,#fdf2f8_100%)] text-[#111827]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <header className="flex items-center justify-between mb-16">
          <div className="font-semibold text-xl">EasySchedule</div>
          <Link to="/sign-in?mode=APP_LOGIN" className="px-4 py-2 rounded-full border border-[#c7d2fe] hover:bg-white transition">Login</Link>
        </header>
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight leading-tight">Scheduling that feels premium, not heavy.</h1>
            <p className="mt-5 text-lg text-[#4b5563]">Create your link in minutes and let invitees book with a fast, trust-first experience.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/sign-in?mode=APP_LOGIN" className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] shadow-[0_10px_30px_rgba(99,102,241,0.25)]">Create your link</Link>
              <Link to="/book/samantha/intro-30" className="px-6 py-3 rounded-xl border border-[#c7d2fe] bg-white">See booking demo</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-xl border border-[#e5e7eb]">
            <div className="text-sm text-[#6b7280] mb-3">How it works</div>
            <ol className="space-y-4 text-[#111827]">
              <li>1. Connect your calendar</li>
              <li>2. Set weekly availability</li>
              <li>3. Share link and get booked</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
