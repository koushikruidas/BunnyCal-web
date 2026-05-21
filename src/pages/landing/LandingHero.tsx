import { Link } from "react-router-dom";
import { MiniCalendar } from "./MiniCalendar";
import { SlotStrip } from "./SlotStrip";

const LOGO_NAMES = ["Mira Studio", "Northwind", "Foundry Press", "Slow Co.", "Linnea"];

interface LandingHeroProps {
  onCreateLink: () => void;
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.4" stroke="var(--lp-plum-500)" strokeWidth="1.3"/>
      <path d="M8 4.5V8l2.4 1.4" stroke="var(--lp-plum-500)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

export function LandingHero({ onCreateLink }: LandingHeroProps) {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-container">
        <div className="lp-hero-grid">

          {/* ── Copy column — anchored high, lets headline dominate ── */}
          <div className="lp-hero-copy lp-fade-up">
            {/* Eyebrow sits flush left — no indent */}
            <span className="lp-eyebrow" style={{ color: "var(--lp-plum-400)" }}>
              BunnyCal · scheduling, gently
            </span>

            {/* Headline: display size, no margin tricks — raw weight is the anchor */}
            <h1
              className="lp-display lp-fade-up lp-fade-up-1"
              style={{ marginTop: 24, marginBottom: 0 }}
            >
              A calmer way<br />
              <em>to be booked.</em>
            </h1>

            {/* Lede: constrained width creates narrow editorial column within the wide grid */}
            <p
              className="lp-lede lp-fade-up lp-fade-up-2"
              style={{ marginTop: 30, maxWidth: "44ch" }}
            >
              One link. Held slots. Confirmed in seconds. The quiet calendar layer
              for hosts who care how a meeting begins.
            </p>

            {/* CTA row: slightly inset from the lede edge — breaks alignment uniformity */}
            <div
              className="lp-hero-cta-row lp-fade-up lp-fade-up-3"
              style={{ marginTop: 40, paddingLeft: 1 }}
            >
              <button onClick={onCreateLink} className="lp-btn lp-btn-primary lp-btn-lg">
                Create your link
                <ArrowIcon />
              </button>
              <Link to="/book/samantha/intro-30" className="lp-btn lp-btn-ghost lp-btn-lg">
                See a live booking →
              </Link>
            </div>

            {/* Trust: further left than the CTA — creates cascading stagger */}
            <div
              className="lp-hero-trust lp-fade-up lp-fade-up-4"
              style={{ marginTop: 44 }}
            >
              <div className="lp-hero-avatars" aria-hidden="true">
                <div /><div /><div /><div /><div />
              </div>
              <div>
                <strong style={{ color: "var(--lp-plum-700)", fontWeight: 580 }}>12,400 hosts</strong>
                <span className="lp-divider-dot" />
                booked calmly this month
              </div>
            </div>
          </div>

          {/* ── Preview column — dropped below copy top, bleeds right ── */}
          <div className="lp-preview-stack lp-fade-up lp-fade-up-5" aria-hidden="true">
            <div className="lp-preview-halo" />

            {/* Brand mark: dramatically off the card corner */}
            <div className="lp-preview-bunny">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z" stroke="#2B1F3D" strokeWidth="1.3"/>
                <circle cx="10" cy="16.4" r=".7" fill="#2B1F3D"/>
                <circle cx="14" cy="16.4" r=".7" fill="#2B1F3D"/>
              </svg>
            </div>

            {/* Main booking card */}
            <div className="lp-preview-card lp-preview-main">
              <div style={{ padding: "22px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{
                    fontFamily: "var(--lp-mono)", fontSize: 10,
                    letterSpacing: ".18em", textTransform: "uppercase",
                    color: "var(--lp-plum-300)",
                  }}>
                    bunnycal.com / samantha
                  </div>
                  <div className="lp-h3" style={{ marginTop: 5 }}>Intro chat · 30 min</div>
                </div>
                <span className="lp-chip">
                  <span className="lp-dot" />
                  Available
                </span>
              </div>
              <MiniCalendar />
              <SlotStrip />
            </div>

            {/* Floating chips — bleed aggressively outside the card edges */}
            <div className="lp-preview-float lp-preview-confirmed">
              <span className="lp-chip" style={{ background: "var(--lp-sage-soft)", borderColor: "var(--lp-sage)" }}>
                <span className="lp-dot" style={{ background: "var(--lp-sage)" }} />
                Confirmed · Tue 10:00 am
              </span>
            </div>

            <div className="lp-preview-float lp-preview-hold">
              <span className="lp-chip">
                <ClockIcon />
                Holding · 9:32 left
              </span>
            </div>
          </div>

        </div>

        {/* ── Trust strip — full width, flush left, raw horizontal list ── */}
        <div
          className="lp-fade-up lp-fade-up-5"
          style={{
            marginTop: "clamp(48px, 6vw, 80px)",
            paddingTop: "clamp(22px, 2.5vw, 36px)",
            borderTop: "1px solid var(--lp-border)",
            display: "flex",
            alignItems: "baseline",
            gap: "clamp(20px, 3vw, 40px)",
            flexWrap: "wrap",
          }}
        >
          <span className="lp-eyebrow" style={{ color: "var(--lp-plum-300)", flexShrink: 0 }}>
            Trusted by calm teams at
          </span>
          <div className="lp-logo-strip">
            {LOGO_NAMES.map((n) => (
              <span key={n} className="lp-logo-name">{n}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
