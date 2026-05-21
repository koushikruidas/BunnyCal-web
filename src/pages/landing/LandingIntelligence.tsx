const TRACKS = [
  { name: "Work · Google",      tint: "lp-lilac", busy: [[1, 4], [9, 12]] as [number,number][] },
  { name: "Studio · Apple",     tint: "lp-peach",  busy: [[2, 5], [10, 13]] as [number,number][] },
  { name: "Personal · iCloud",  tint: "lp-blush",  busy: [[0, 3], [11, 14]] as [number,number][] },
];
const SLOT_COUNT = 16;

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,253,250,.5)" }}>{label}</div>
      <div style={{ fontFamily: "var(--lp-serif)", fontSize: 36, lineHeight: 1.05, letterSpacing: "-.02em", marginTop: 8, color: "var(--lp-cream)" }}>{value}</div>
      <div style={{ marginTop: 5, color: "rgba(255,253,250,.5)", fontSize: 12 }}>{hint}</div>
    </div>
  );
}

export function LandingIntelligence() {
  return (
    <section className="lp-section-dark" id="intelligence">
      <div className="lp-container">
        <div className="lp-intel-grid">
          {/* Copy */}
          <div>
            <span className="lp-eyebrow" style={{ color: "rgba(255,253,250,.5)" }}>Quiet intelligence</span>
            <h2 className="lp-h1" style={{ marginTop: 14, color: "var(--lp-cream)" }}>
              Calmer because <em style={{ color: "var(--lp-lavender)" }}>it's smarter underneath.</em>
            </h2>
            <p className="lp-lede" style={{ marginTop: 22, color: "rgba(255,253,250,.68)" }}>
              BunnyCal watches every calendar you've connected — work, studio, personal —
              and keeps your booking page truthful in real time. Holds, buffers, and time zones,
              handled before they ever surface.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 36 }}>
              <Stat label="Sync window"      value="120 ms"  hint="median, p99 ≤ 800 ms" />
              <Stat label="Uptime"           value="99.99%"  hint="trailing 12 months" />
              <Stat label="Conflicts caught" value="2.4M"    hint="this quarter, silently" />
            </div>
            <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                className="lp-btn lp-btn-primary lp-btn-sm"
                style={{ background: "var(--lp-cream)", color: "var(--lp-plum-900)" }}
                href="#trust"
              >
                Trust & reliability
              </a>
              <a
                className="lp-btn lp-btn-ghost lp-btn-sm"
                style={{ color: "var(--lp-cream)" }}
                href="#engineering"
              >
                How we engineer calm →
              </a>
            </div>
          </div>

          {/* Visualization */}
          <div style={{
            background: "rgba(255,253,250,.04)",
            border: "1px solid rgba(255,253,250,.10)",
            borderRadius: 26,
            padding: 26,
            backdropFilter: "blur(6px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,253,250,.45)" }}>
                  Tuesday · May 19
                </div>
                <div className="lp-h3" style={{ color: "var(--lp-cream)", marginTop: 5 }}>3 calendars · 1 calm answer</div>
              </div>
              <span className="lp-chip" style={{ background: "rgba(255,253,250,.08)", borderColor: "rgba(255,253,250,.18)", color: "rgba(255,253,250,.65)" }}>
                <span className="lp-dot" style={{ background: "var(--lp-sage)" }} />Synced now
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TRACKS.map((t) => (
                <div key={t.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,253,250,.5)" }}>
                      {t.name}
                    </span>
                    <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, color: "rgba(255,253,250,.35)" }}>9a → 5p</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 2 }}>
                    {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                      const busy = t.busy.some(([a, b]) => i >= a && i < b);
                      return (
                        <div key={i} style={{
                          height: 17,
                          borderRadius: 3,
                          background: busy ? `var(--${t.tint})` : "rgba(255,253,250,.06)",
                          opacity: busy ? 0.85 : 1,
                        }} />
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Merged availability */}
              <div style={{ marginTop: 12, padding: 14, borderRadius: 13, background: "rgba(255,253,250,.05)", border: "1px solid rgba(255,253,250,.10)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                  <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,253,250,.65)" }}>
                    BunnyCal · merged
                  </span>
                  <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10.5, color: "var(--lp-sage)" }}>5 slots offered</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 2 }}>
                  {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                    const anyBusy = TRACKS.some(t => t.busy.some(([a, b]) => i >= a && i < b));
                    const isOffer = !anyBusy;
                    const highlight = i === 6 || i === 7;
                    return (
                      <div key={i} style={{
                        height: 21,
                        borderRadius: 4,
                        background: highlight ? "var(--lp-cream)" : isOffer ? "rgba(200,188,232,.55)" : "rgba(255,253,250,.04)",
                      }} />
                    );
                  })}
                </div>
                <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 9, color: "rgba(255,253,250,.65)", fontSize: 13 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8.5L6 12.5L14 4.5" stroke="var(--lp-sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Booked · Tue 1:30 pm · with travel buffer
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
