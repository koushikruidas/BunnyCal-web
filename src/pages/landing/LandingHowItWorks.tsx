const STEPS = [
  {
    n: "01",
    tint: "lp-lilac",
    title: "Connect your calendar",
    body: "Sync Google, Apple, or Outlook. BunnyCal reads your busy times and never writes without your nod.",
  },
  {
    n: "02",
    tint: "lp-peach",
    title: "Set your weekly rhythm",
    body: "Quiet mornings, soft afternoons, no Fridays. BunnyCal honors the shape of your week.",
  },
  {
    n: "03",
    tint: "lp-sage",
    title: "Share one calm link",
    body: "Invitees hold a slot, confirm in seconds, and both sides receive a friendly confirmation.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="lp-section" id="how">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Three quiet steps</span>
          <h2 className="lp-h1" style={{ marginTop: 14 }}>
            Set up once. <em>Use it for years.</em>
          </h2>
        </div>
        <div className="lp-flat-rows">
          {STEPS.map((s) => (
            <div key={s.n} className="lp-flat-row">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, justifyContent: "space-between" }}>
                <span className="lp-num">{s.n}</span>
                <span style={{
                  width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                  background: `var(--${s.tint}-soft)`,
                  border: `1px solid var(--${s.tint})`,
                }} />
              </div>
              <h3 className="lp-h3" style={{ marginTop: 8 }}>{s.title}</h3>
              <p style={{ color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
