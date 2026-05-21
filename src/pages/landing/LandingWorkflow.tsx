const BOOKING_SLOTS = [
  { d: "Tue · May 19", t: "9:00 am" },
  { d: "Tue · May 19", t: "9:30 am" },
  { d: "Wed · May 20", t: "10:00 am · holding", holding: true },
  { d: "Wed · May 20", t: "11:30 am" },
];

const POLL_OPTIONS = [
  { t: "Thu · May 21 · 2:00 pm", votes: 6, total: 7, picked: true },
  { t: "Fri · May 22 · 10:00 am", votes: 4, total: 7 },
  { t: "Mon · May 25 · 3:30 pm", votes: 2, total: 7 },
];

const TEAM = [
  { n: "Mira",  bg: "linear-gradient(140deg, var(--lp-lilac), var(--lp-lilac-soft))" },
  { n: "Jules", bg: "linear-gradient(140deg, var(--lp-peach), var(--lp-peach-soft))" },
  { n: "Kira",  bg: "linear-gradient(140deg, var(--lp-blush), var(--lp-blush-soft))" },
  { n: "Leo",   bg: "linear-gradient(140deg, var(--lp-sage),  var(--lp-sage-soft))"  },
];

const RECUR_WEEKS = [
  { label: "May 12", on: true },
  { label: "May 19", on: false },
  { label: "May 26", on: true },
  { label: "Jun 2",  on: false },
];

export function LandingWorkflow() {
  return (
    <section className="lp-section lp-section-band" id="workflow">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Ways to be booked</span>
          <h2 className="lp-h1" style={{ marginTop: 14 }}>
            Solo, paired, <em>or whole team.</em>
          </h2>
        </div>

        <div className="lp-feature-grid">
          {/* One-on-one — large */}
          <div className="lp-feature-card" style={{ gridColumn: "span 7", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "28px 28px 0" }}>
              <span className="lp-eyebrow">One-on-one</span>
              <h3 className="lp-h2" style={{ marginTop: 10 }}>An intro chat, no friction.</h3>
              <p style={{ color: "var(--lp-plum-500)", margin: "8px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>
                Hold a slot for ten minutes while details get filled in. We watch the clock
                so neither of you has to.
              </p>
            </div>
            <div style={{ margin: "20px 28px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {BOOKING_SLOTS.map((s, i) => (
                <div key={i} style={{
                  border: "1px solid var(--lp-border)",
                  background: s.holding ? "var(--lp-plum-900)" : "var(--lp-cream)",
                  color: s.holding ? "var(--lp-cream)" : "var(--lp-plum-700)",
                  borderRadius: 13,
                  padding: "11px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", opacity: 0.7 }}>{s.d}</div>
                    <div style={{ marginTop: 3, fontWeight: 500, fontFamily: "var(--lp-mono)", fontSize: 13 }}>{s.t}</div>
                  </div>
                  {s.holding && (
                    <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10, padding: "3px 8px", background: "rgba(255,253,250,.16)", borderRadius: 999, letterSpacing: ".15em", textTransform: "uppercase" }}>
                      9:32 left
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: "20px 28px 28px", display: "flex", alignItems: "center", gap: 9, color: "var(--lp-plum-500)", fontSize: 13.5 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 4.5V8l2.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Holds expire kindly — invitees get a gentle reminder before the slot releases.
            </div>
          </div>

          {/* Group polling */}
          <div className="lp-feature-card" style={{ gridColumn: "span 5" }}>
            <span className="lp-eyebrow">Group poll</span>
            <h3 className="lp-h2" style={{ marginTop: 6 }}>Find the one time that works.</h3>
            <p style={{ color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }}>Float three options. Watch consensus arrive on its own.</p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
              {POLL_OPTIONS.map((o, i) => (
                <div key={i} style={{
                  position: "relative",
                  background: o.picked ? "var(--lp-lilac-soft)" : "var(--lp-cream)",
                  border: `1px solid ${o.picked ? "var(--lp-lilac)" : "var(--lp-border)"}`,
                  borderRadius: 13,
                  padding: "11px 14px",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
                    <span style={{ fontFamily: "var(--lp-mono)", fontSize: 12, color: "var(--lp-plum-700)" }}>{o.t}</span>
                    <span style={{ fontFamily: "var(--lp-mono)", fontSize: 11, color: "var(--lp-plum-500)" }}>{o.votes}/{o.total}</span>
                  </div>
                  {!o.picked && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "var(--lp-lilac-soft)",
                      width: `${(o.votes / o.total) * 100}%`,
                      opacity: 0.5,
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Round robin */}
          <div className="lp-feature-card" style={{ gridColumn: "span 5" }}>
            <span className="lp-eyebrow">Round robin</span>
            <h3 className="lp-h2" style={{ marginTop: 6 }}>Share the load, fairly.</h3>
            <p style={{ color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }}>Rotate hosts by who's freest — or whose turn it is.</p>
            <div style={{ marginTop: 18, display: "flex", gap: 0 }}>
              {TEAM.map((p, i) => (
                <div key={p.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginLeft: i === 0 ? 0 : -8 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 999, background: p.bg,
                    border: "2.5px solid var(--lp-cream)",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--lp-serif)", fontSize: 17, color: "var(--lp-plum-900)",
                  }}>{p.n[0]}</div>
                  <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>{p.n}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--lp-ivory-2)", border: "1px solid var(--lp-border)" }}>
              <div style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>Next up</div>
              <div style={{ marginTop: 4, fontWeight: 560, fontSize: 14 }}>Jules — three more bookings this week</div>
            </div>
          </div>

          {/* Recurring */}
          <div className="lp-feature-card" style={{ gridColumn: "span 7" }}>
            <span className="lp-eyebrow">Recurring rituals</span>
            <h3 className="lp-h2" style={{ marginTop: 6 }}>Standing meetings that don't outstay their welcome.</h3>
            <p style={{ color: "var(--lp-plum-500)", margin: 0, maxWidth: "52ch", lineHeight: 1.6 }}>
              Set a cadence, attach an agenda, let BunnyCal pause it gracefully when calendars get crowded.
            </p>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {RECUR_WEEKS.map((c) => (
                <div key={c.label} style={{
                  border: `1px solid ${c.on ? "var(--lp-lilac)" : "var(--lp-border)"}`,
                  background: c.on ? "var(--lp-lilac-soft)" : "var(--lp-cream)",
                  borderRadius: 12,
                  padding: "13px 11px",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <span style={{ fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }}>Week of</span>
                  <span style={{ fontFamily: "var(--lp-serif)", fontSize: 21, letterSpacing: "-.02em" }}>{c.label}</span>
                  <span style={{ fontFamily: "var(--lp-mono)", fontSize: 11, color: c.on ? "var(--lp-plum-700)" : "var(--lp-plum-300)" }}>
                    {c.on ? "Scheduled" : "Skipped"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
