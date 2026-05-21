import { Link } from "react-router-dom";

interface LandingCTAProps {
  onCreateLink: () => void;
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function LandingCTA({ onCreateLink }: LandingCTAProps) {
  return (
    <section className="lp-section" id="start">
      <div className="lp-container">
        <div className="lp-cta-box">
          <span className="lp-eyebrow" style={{ color: "rgba(255,253,250,.55)" }}>Begin gently</span>
          <h2
            className="lp-display"
            style={{ marginTop: 18, color: "var(--lp-cream)", fontSize: "clamp(42px, 5.4vw, 84px)" }}
          >
            Your calmest link,<br /><em style={{ color: "var(--lp-lavender)" }}>in minutes.</em>
          </h2>
          <p style={{ marginTop: 22, color: "rgba(255,253,250,.68)", fontSize: 17.5, lineHeight: 1.6, maxWidth: "46ch" }}>
            Free for solo hosts. No credit card. Cancel any time.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <button
              onClick={onCreateLink}
              className="lp-btn lp-btn-primary lp-btn-lg"
              style={{
                background: "var(--lp-cream)",
                color: "var(--lp-plum-900)",
                boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 14px 30px -12px rgba(0,0,0,.5)",
              }}
            >
              Create your BunnyCal
              <ArrowIcon />
            </button>
            <Link
              to="/book/samantha/intro-30"
              className="lp-btn lp-btn-secondary lp-btn-lg"
              style={{ background: "rgba(255,253,250,.08)", color: "var(--lp-cream)", borderColor: "rgba(255,253,250,.18)" }}
            >
              Book a 15-min walkthrough
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
