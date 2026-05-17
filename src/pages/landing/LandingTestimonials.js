import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TESTIMONIALS = [
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
    return (_jsx("section", { className: "lp-section", id: "stories", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-section-head", children: [_jsx("span", { className: "lp-eyebrow", children: "Hosts who breathe easier" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["Calmer calendars, ", _jsx("em", { children: "kinder mornings." })] })] }), _jsx("div", { className: "lp-t-grid", children: TESTIMONIALS.map((t) => (_jsxs("article", { className: "lp-t-card", style: {
                            gridColumn: t.col,
                            ...(t.cardBg ? { background: t.cardBg } : {}),
                            ...(t.cardBorder ? { borderColor: t.cardBorder } : {}),
                        }, children: [_jsx("p", { className: `lp-t-quote${t.large ? " lg" : ""}`, children: t.quote }), _jsxs("div", { className: "lp-t-meta", children: [_jsx("div", { className: "lp-t-avatar", style: { background: t.avatarBg } }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 560, fontSize: 14 }, children: t.name }), _jsx("div", { style: { color: "var(--lp-plum-400)", fontSize: 13, marginTop: 2 }, children: t.role })] })] })] }, t.name))) })] }) }));
}
