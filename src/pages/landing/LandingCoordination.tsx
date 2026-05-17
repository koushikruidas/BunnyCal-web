const HOURS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];

const COLS: Array<Array<{ top: number; height: number; label: string; who: string; color: string }>> = [
  [
    { top: 36, height: 52, label: "Standup", who: "team · 9:00", color: "lilac" },
    { top: 128, height: 72, label: "Design crit", who: "mira + jules · 11:00", color: "peach" },
    { top: 240, height: 52, label: "Quiet hour", who: "samantha · 3:00", color: "butter" },
  ],
  [
    { top: 22, height: 92, label: "Maker time", who: "samantha · 9–11", color: "sage" },
    { top: 160, height: 52, label: "Intro chat", who: "with jordan · 12:30", color: "blush" },
    { top: 240, height: 52, label: "Review", who: "northwind · 3:00", color: "lilac" },
  ],
  [
    { top: 36, height: 52, label: "1:1 with K.", who: "kira · 9:30", color: "peach" },
    { top: 106, height: 84, label: "Workshop", who: "studio · 10:30", color: "lilac" },
    { top: 232, height: 52, label: "Coffee", who: "with leo · 2:30", color: "butter" },
  ],
  [
    { top: 22, height: 124, label: "Maker time", who: "no meetings · 9–1", color: "sage" },
    { top: 190, height: 52, label: "Demo", who: "with foundry · 1:30", color: "blush" },
  ],
  [
    { top: 36, height: 52, label: "Standup", who: "team · 9:00", color: "lilac" },
    { top: 106, height: 72, label: "Walk + think", who: "samantha · 10:30", color: "sage" },
    { top: 232, height: 52, label: "Wrap-up", who: "team · 2:30", color: "butter" },
  ],
];

const DAY_LABELS = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"];

const LEGEND = [
  { c: "lp-lilac",  l: "Meetings" },
  { c: "lp-sage",   l: "Focus" },
  { c: "lp-peach",  l: "1:1s" },
  { c: "lp-blush",  l: "External" },
  { c: "lp-butter", l: "Buffer" },
];

function CoordStat({ label, value, hint, tint }: { label: string; value: string; hint: string; tint: string }) {
  return (
    <div style={{ background: "var(--lp-cream)", border: "1px solid var(--lp-border)", borderRadius: 15, padding: 20 }}>
      <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
        <div style={{ fontFamily: "var(--lp-serif)", fontSize: 38, lineHeight: 1, letterSpacing: "-.02em" }}>{value}</div>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: `var(--${tint})`, border: "1px solid var(--lp-border)", flexShrink: 0 }} />
      </div>
      <div style={{ marginTop: 7, color: "var(--lp-plum-400)", fontSize: 13 }}>{hint}</div>
    </div>
  );
}

export function LandingCoordination() {
  return (
    <section className="lp-section" id="coordination">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Calendar coordination</span>
          <h2 className="lp-h1" style={{ marginTop: 14 }}>
            A clearer week, <em>by design.</em>
          </h2>
          <p className="lp-lede" style={{ marginTop: 18 }}>
            BunnyCal layers everyone's commitments into one calm picture.
            Meetings land where they fit, never where they collide.
          </p>
        </div>

        <div className="lp-coord-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>
                This week · May 12 — 16
              </div>
              <div className="lp-h2" style={{ marginTop: 7 }}>Studio · Pacific time</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {LEGEND.map((k) => (
                <span key={k.l} className="lp-chip">
                  <span className="lp-dot" style={{ background: `var(--${k.c})` }} />{k.l}
                </span>
              ))}
            </div>
          </div>

          <div
            className="lp-timeline"
            role="img"
            aria-label="A week of meetings shown as gentle pastel blocks"
          >
            {/* Hour gutter */}
            <div className="lp-t-col gut">
              <div className="lp-t-head" style={{ visibility: "hidden" }}>·</div>
              {HOURS.map((h, i) => <div key={i} className="lp-t-hour">{h}</div>)}
            </div>
            {/* Day columns */}
            {DAY_LABELS.map((d, ci) => (
              <div key={d} className="lp-t-col">
                <div className="lp-t-head">{d}</div>
                {COLS[ci].map((e, ei) => (
                  <div
                    key={ei}
                    className={`lp-t-event ${e.color}`}
                    style={{ top: e.top + 22, height: e.height }}
                  >
                    <div className="who">{e.who}</div>
                    <div style={{ fontWeight: 560, color: "var(--lp-plum-900)", marginTop: 2 }}>{e.label}</div>
                  </div>
                ))}
                {ci === 2 && (
                  <div
                    className="lp-t-overlap"
                    style={{ top: 22 + 106, height: 84 }}
                    aria-label="BunnyCal nudges this overlap into a calmer slot"
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 24 }}>
            <CoordStat label="Time reclaimed"    value="4h 12m"   hint="of focus saved this week"          tint="lp-sage"  />
            <CoordStat label="Conflicts resolved" value="7"        hint="quietly rescheduled in advance"    tint="lp-lilac" />
            <CoordStat label="Buffer added"       value="15 min"   hint="between back-to-backs"             tint="lp-peach" />
          </div>
        </div>
      </div>
    </section>
  );
}
