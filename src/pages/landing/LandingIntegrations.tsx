import type { ReactNode } from "react";

function G({ children }: { children: ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{children}</svg>;
}
const CalendarGlyph = () => <G><rect x="2.5" y="3.5" width="13" height="11" rx="2" stroke="#2B1F3D" strokeWidth="1.3"/><path d="M2.5 7h13" stroke="#2B1F3D" strokeWidth="1.3"/><circle cx="6" cy="10.5" r="1" fill="#2B1F3D"/></G>;
const AppleishGlyph = () => <G><circle cx="9" cy="9" r="6" stroke="#2B1F3D" strokeWidth="1.3"/><path d="M9 5v4l3 1.5" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/></G>;
const SquareGlyph   = () => <G><rect x="3" y="3" width="12" height="12" rx="2" stroke="#2B1F3D" strokeWidth="1.3"/><path d="M3 9h12M9 3v12" stroke="#2B1F3D" strokeWidth="1.3"/></G>;
const CameraGlyph   = () => <G><rect x="2.5" y="5" width="9" height="8" rx="2" stroke="#2B1F3D" strokeWidth="1.3"/><path d="M11.5 8l4-2v6l-4-2" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/></G>;
const BubbleGlyph   = () => <G><path d="M3 4h7a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H7l-3 2v-2H3z" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/></G>;
const HashGlyph     = () => <G><path d="M6 3l-1 12M12 3l-1 12M3 7h12M3 11h12" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/></G>;
const PaperGlyph    = () => <G><path d="M4 3h7l3 3v9H4z" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/><path d="M11 3v3h3" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/></G>;
const LinesGlyph    = () => <G><path d="M3 5h12M3 9h8M3 13h12" stroke="#2B1F3D" strokeWidth="1.3" strokeLinecap="round"/></G>;
const DiamondGlyph  = () => <G><path d="M9 2l6 5-6 9-6-9z" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/></G>;
const SpotGlyph     = () => <G><circle cx="9" cy="9" r="5.5" stroke="#2B1F3D" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" fill="#2B1F3D"/></G>;
const CloudGlyph    = () => <G><path d="M5 12h8a3 3 0 0 0 0-6 4 4 0 0 0-7.7 1A2.5 2.5 0 0 0 5 12z" stroke="#2B1F3D" strokeWidth="1.3" strokeLinejoin="round"/></G>;
const ChainGlyph    = () => <G><rect x="2" y="6" width="7" height="6" rx="3" stroke="#2B1F3D" strokeWidth="1.3"/><rect x="9" y="6" width="7" height="6" rx="3" stroke="#2B1F3D" strokeWidth="1.3"/></G>;

const ITEMS = [
  { name: "Google Calendar", tint: "lp-lilac",  glyph: <CalendarGlyph /> },
  { name: "Apple Calendar",  tint: "lp-blush",  glyph: <AppleishGlyph /> },
  { name: "Outlook",         tint: "lp-sky",    glyph: <SquareGlyph />   },
  { name: "Zoom",            tint: "lp-peach",  glyph: <CameraGlyph />   },
  { name: "Google Meet",     tint: "lp-sage",   glyph: <BubbleGlyph />   },
  { name: "Slack",           tint: "lp-butter", glyph: <HashGlyph />     },
  { name: "Notion",          tint: "lp-lilac",  glyph: <PaperGlyph />    },
  { name: "Linear",          tint: "lp-sky",    glyph: <LinesGlyph />    },
  { name: "Stripe",          tint: "lp-peach",  glyph: <DiamondGlyph />  },
  { name: "HubSpot",         tint: "lp-blush",  glyph: <SpotGlyph />     },
  { name: "Salesforce",      tint: "lp-sage",   glyph: <CloudGlyph />    },
  { name: "Webhook",         tint: "lp-butter", glyph: <ChainGlyph />    },
] as const;

const FEATURES = [
  "Two-way sync, never overwriting your events",
  "Auto buffer before & after meetings",
  "Travel-time aware for in-person bookings",
  "Event-type detection — focus blocks respected",
];

export function LandingIntegrations() {
  return (
    <section className="lp-section lp-section-band" id="integrations">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Where BunnyCal lives</span>
          <h2 className="lp-h1" style={{ marginTop: 14 }}>
            Connected to <em>the tools you trust.</em>
          </h2>
        </div>

        <div className="lp-int-layout">
          <div className="lp-int-grid">
            {ITEMS.map((it) => (
              <div key={it.name} className="lp-int-card">
                <div style={{
                  width: 36, height: 36,
                  display: "grid", placeItems: "center",
                  background: `var(--${it.tint}-soft)`,
                  border: `1px solid var(--${it.tint})`,
                  borderRadius: 10,
                }}>
                  {it.glyph}
                </div>
                <div className="lp-int-name">{it.name}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: "var(--lp-cream)",
            border: "1px solid var(--lp-border)",
            borderRadius: 22,
            padding: 30,
            boxShadow: "var(--lp-shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>
            <span className="lp-eyebrow">Calendar logic</span>
            <h3 className="lp-h2">Pulls busy times from every calendar you've connected.</h3>
            <p style={{ color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }}>
              BunnyCal reads availability across all your calendars at once, so no slot
              is offered that conflicts with the rest of your life — work, personal, side
              project, or studio.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES.map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 3, flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" fill="var(--lp-lilac-soft)" stroke="var(--lp-lilac)"/>
                    <path d="M5 8.4L7 10.2L11 6" stroke="var(--lp-plum-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ color: "var(--lp-plum-700)", lineHeight: 1.5 }}>{t}</span>
                </li>
              ))}
            </ul>
            <a className="lp-btn lp-btn-secondary lp-btn-sm" href="#integrations-all" style={{ alignSelf: "flex-start", marginTop: 8 }}>
              See all 40+ integrations →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
