import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/urls";
import { BunnyMark } from "@/components/BunnyMark";
import "./onboarding/onboarding.css";

export function OnboardingSuccessPage() {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    const stored = sessionStorage.getItem("createdEventLink") ?? "/public/you/intro-chat";
    return toAbsoluteUrl(stored);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="onb onb-success">
      <div className="onb-success-card">
        {/* Brand mark at top */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 24, alignSelf: "flex-start" as const }}>
          <BunnyMark size={24} />
          <span style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 17, letterSpacing: "-0.02em", color: "var(--plum-400)" }}>Bunny</span>
            <span style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 17, color: "var(--plum-900)" }}>Cal</span>
          </span>
        </div>

        <div className="onb-success-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14.5L11 19.5L22 9" stroke="#3D2F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="onb-success-title">
          Your booking link <em>is live.</em>
        </h1>
        <p className="onb-success-sub">
          Share it with clients and start accepting meetings quietly.
        </p>

        <div className="onb-success-link-box">{link}</div>

        <div className="onb-success-actions">
          <button className="onb-btn onb-btn-primary" onClick={copy}>
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M10 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Copy link
              </>
            )}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="onb-btn onb-btn-secondary"
          >
            Preview page
          </a>
          <Link to="/dashboard" className="onb-btn onb-btn-ghost">
            Go to dashboard →
          </Link>
        </div>

        <div className="onb-success-foot">
          <span className="dot"></span>
          Your event is saved and ready to share
        </div>
      </div>
    </div>
  );
}
