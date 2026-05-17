import { Link } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

function BunnyMark() {
  return (
    <span className="lp-brand-mark">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2" stroke="#2B1F3D" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2" stroke="#2B1F3D" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z" stroke="#2B1F3D" strokeWidth="1.4"/>
        <circle cx="10" cy="16.4" r=".7" fill="#2B1F3D"/>
        <circle cx="14" cy="16.4" r=".7" fill="#2B1F3D"/>
      </svg>
    </span>
  );
}

interface LandingNavProps {
  onCreateLink: () => void;
}

export function LandingNav({ onCreateLink }: LandingNavProps) {
  const { user } = useAuth();

  return (
    <nav className="lp-nav" aria-label="Primary">
      <div className="lp-nav-inner">
        <Link to="/" className="lp-brand">
          <BunnyMark />
          Bunny<span style={{ fontFamily: "var(--lp-sans)", fontWeight: 500 }}>Cal</span>
        </Link>
        <div className="lp-nav-links">
          <a className="lp-nav-link" href="#how">How it works</a>
          <a className="lp-nav-link" href="#workflow">Workflow</a>
          <a className="lp-nav-link" href="#integrations">Integrations</a>
          <a className="lp-nav-link" href="#stories">Stories</a>
        </div>
        <div className="lp-nav-cta">
          {user ? (
            <Link to="/dashboard" className="lp-btn lp-btn-ghost lp-btn-sm">Dashboard</Link>
          ) : (
            <Link to="/sign-in?mode=APP_LOGIN" className="lp-btn lp-btn-ghost lp-btn-sm">Sign in</Link>
          )}
          <button onClick={onCreateLink} className="lp-btn lp-btn-primary lp-btn-sm">
            Create your link
          </button>
        </div>
      </div>
    </nav>
  );
}
