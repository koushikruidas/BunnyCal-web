import { Link } from "react-router-dom";
import { BrandWordmark } from "@/components/BrandWordmark";

function BunnyMark() {
  return (
    <span style={{
      width: 26, height: 26,
      display: "grid", placeItems: "center",
      borderRadius: 9,
      background: "linear-gradient(150deg, var(--lp-lilac-soft), var(--lp-blush-soft))",
      border: "1px solid var(--lp-border)",
      flexShrink: 0,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2" stroke="#2B1F3D" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2" stroke="#2B1F3D" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z" stroke="#2B1F3D" strokeWidth="1.4"/>
        <circle cx="10" cy="16.4" r=".7" fill="#2B1F3D"/>
        <circle cx="14" cy="16.4" r=".7" fill="#2B1F3D"/>
      </svg>
    </span>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-foot-grid">
          <div className="lp-foot-col">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <BunnyMark />
              <BrandWordmark style={{ fontFamily: "var(--lp-sans)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }} />
            </div>
            <p style={{ color: "var(--lp-plum-500)", maxWidth: "36ch", margin: 0, lineHeight: 1.65, fontSize: 14 }}>
              Calm scheduling for people who like their calendar — and the people on it.
              Made with patience in three time zones.
            </p>
          </div>
          <div className="lp-foot-col">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#workflow">Workflow types</a>
            <a href="#integrations">Integrations</a>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="lp-foot-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <a href="#field-notes">Field notes</a>
            <a href="#careers">Careers</a>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="lp-foot-col">
            <h4>Quietly</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="#status">Status</a>
            <a href="#a11y">Accessibility</a>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
        <div className="lp-foot-bottom">
          <div>© 2026 BunnyCal · Care, calmly applied.</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--lp-mono)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10.5 }}>v 2.6</span>
            <span>All systems calm</span>
            <span style={{
              display: "inline-block", width: 8, height: 8,
              borderRadius: 999,
              background: "var(--lp-sage)",
              boxShadow: "0 0 0 3px var(--lp-sage-soft)",
            }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
