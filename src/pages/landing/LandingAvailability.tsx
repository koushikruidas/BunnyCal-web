function parseBars(ranges: string[]) {
  return ranges.map((r) => {
    const soft = r.endsWith("s");
    const [s, e] = (soft ? r.slice(0, -1) : r).split("-").map(Number);
    return { start: s, end: e, soft };
  });
}

const DAYS = [
  { label: "Mon", bars: parseBars(["9-13", "14-17"]) },
  { label: "Tue", bars: parseBars(["10-12", "13-16"]) },
  { label: "Wed", bars: parseBars(["9-12"]) },
  { label: "Thu", bars: parseBars(["10-13", "14-17"]) },
  { label: "Fri", bars: parseBars(["9-12"]) },
  { label: "Sat", bars: [] },
  { label: "Sun", bars: [] },
];

const LEGEND = [
  { color: "var(--lp-lilac)",      label: "Working hours" },
  { color: "var(--lp-lilac-soft)", label: "Soft hours" },
  { color: "var(--lp-ivory-2)",    label: "Quiet" },
];

export function LandingAvailability() {
  return (
    <section className="lp-section" id="availability">
      <div className="lp-container">
        <div className="lp-avail-layout">
          {/* Copy */}
          <div>
            <span className="lp-eyebrow">Availability, your way</span>
            <h2 className="lp-h1" style={{ marginTop: 14 }}>
              Define the <em>shape of your week.</em>
            </h2>
            <p className="lp-lede" style={{ marginTop: 18 }}>
              Quiet mornings? Walking Wednesdays? Friday afternoons sacred?
              BunnyCal honors the rhythm you actually live by — and gently
              declines anything that doesn't fit.
            </p>
            <div style={{ display: "flex", gap: 9, marginTop: 26, flexWrap: "wrap" }}>
              {LEGEND.map((l) => (
                <span key={l.label} className="lp-chip">
                  <span className="lp-dot" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="lp-surface" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>
                  Weekly rhythm
                </div>
                <div className="lp-h3" style={{ marginTop: 5 }}>Pacific Standard Time · GMT-8</div>
              </div>
              <button className="lp-btn lp-btn-secondary lp-btn-sm">Edit hours</button>
            </div>
            <div className="lp-avail-grid">
              {DAYS.map((d) => (
                <div className="lp-avail-day" key={d.label}>
                  <div className="lp-label">{d.label}</div>
                  <div className="lp-avail-bar">
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cls = ["lp-cell"];
                      for (const b of d.bars) {
                        if (h >= b.start && h < b.end) {
                          cls.push("on");
                          if (b.soft) cls.push("soft");
                        }
                      }
                      return <div key={h} className={cls.join(" ")} />;
                    })}
                  </div>
                  <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, color: "var(--lp-plum-400)" }}>
                    {d.bars.length === 0
                      ? "Day off"
                      : d.bars.map((b) => `${b.start}–${b.end}`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
