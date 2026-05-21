interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatarBg: string;
  col: string;
  cardBg?: string;
  cardBorder?: string;
  large?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "BunnyCal made calendar-sharing feel like a small act of hospitality. Clients comment on how lovely the booking page is. I used to send four emails to get one meeting — now I send a link and put the kettle on.",
    name: "Samantha Lin",
    role: "Independent strategist · Mira Studio",
    avatarBg: "linear-gradient(140deg, var(--lp-lilac), var(--lp-lilac-soft))",
    col: "span 7",
    cardBg: "linear-gradient(150deg, var(--lp-lilac-soft) 0%, var(--lp-cream) 60%)",
    large: true,
  },
  {
    quote: "It feels like the calendar version of a deep breath. Our team's switched completely.",
    name: "Jules Okafor",
    role: "Head of design · Foundry Press",
    avatarBg: "linear-gradient(140deg, var(--lp-peach), var(--lp-peach-soft))",
    col: "span 5",
  },
  {
    quote: "The holds-and-confirms flow is genuinely lovely. No more racing each other to a slot.",
    name: "Kira Vasquez",
    role: "Founder · Northwind",
    avatarBg: "linear-gradient(140deg, var(--lp-sage), var(--lp-sage-soft))",
    col: "span 4",
  },
  {
    quote: "Beautiful, calm, and quietly powerful. The round-robin logic is the best we've used.",
    name: "Leo Brennan",
    role: "Ops lead · Greenfield",
    avatarBg: "linear-gradient(140deg, var(--lp-butter), var(--lp-butter-soft))",
    cardBg: "var(--lp-butter-soft)",
    cardBorder: "var(--lp-butter)",
    col: "span 4",
  },
  {
    quote: "I sent a link and my client said, \"this is the prettiest booking page I've ever seen.\" That alone is worth it.",
    name: "Mira Eklund",
    role: "Photographer · Linnea",
    avatarBg: "linear-gradient(140deg, var(--lp-blush), var(--lp-blush-soft))",
    col: "span 4",
  },
];

export function LandingTestimonials() {
  return (
    <section className="lp-section" id="stories">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Hosts who breathe easier</span>
          <h2 className="lp-h1" style={{ marginTop: 14 }}>
            Calmer calendars, <em>kinder mornings.</em>
          </h2>
        </div>

        <div className="lp-t-grid">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="lp-t-card"
              style={{
                gridColumn: t.col,
                ...(t.cardBg ? { background: t.cardBg } : {}),
                ...(t.cardBorder ? { borderColor: t.cardBorder } : {}),
              }}
            >
              <p className={`lp-t-quote${t.large ? " lg" : ""}`}>{t.quote}</p>
              <div className="lp-t-meta">
                <div className="lp-t-avatar" style={{ background: t.avatarBg }} />
                <div>
                  <div style={{ fontWeight: 560, fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: "var(--lp-plum-400)", fontSize: 13, marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
