import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    { n: "Mira", bg: "linear-gradient(140deg, var(--lp-lilac), var(--lp-lilac-soft))" },
    { n: "Jules", bg: "linear-gradient(140deg, var(--lp-peach), var(--lp-peach-soft))" },
    { n: "Kira", bg: "linear-gradient(140deg, var(--lp-blush), var(--lp-blush-soft))" },
    { n: "Leo", bg: "linear-gradient(140deg, var(--lp-sage),  var(--lp-sage-soft))" },
];
const RECUR_WEEKS = [
    { label: "May 12", on: true },
    { label: "May 19", on: false },
    { label: "May 26", on: true },
    { label: "Jun 2", on: false },
];
export function LandingWorkflow() {
    return (_jsx("section", { className: "lp-section lp-section-band", id: "workflow", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-section-head", children: [_jsx("span", { className: "lp-eyebrow", children: "Ways to be booked" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["Solo, paired, ", _jsx("em", { children: "or whole team." })] })] }), _jsxs("div", { className: "lp-feature-grid", children: [_jsxs("div", { className: "lp-feature-card", style: { gridColumn: "span 7", padding: 0, overflow: "hidden" }, children: [_jsxs("div", { style: { padding: "28px 28px 0" }, children: [_jsx("span", { className: "lp-eyebrow", children: "One-on-one" }), _jsx("h3", { className: "lp-h2", style: { marginTop: 10 }, children: "An intro chat, no friction." }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: "8px 0 0", maxWidth: "44ch", lineHeight: 1.6 }, children: "Hold a slot for ten minutes while details get filled in. We watch the clock so neither of you has to." })] }), _jsx("div", { style: { margin: "20px 28px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: BOOKING_SLOTS.map((s, i) => (_jsxs("div", { style: {
                                            border: "1px solid var(--lp-border)",
                                            background: s.holding ? "var(--lp-plum-900)" : "var(--lp-cream)",
                                            color: s.holding ? "var(--lp-cream)" : "var(--lp-plum-700)",
                                            borderRadius: 13,
                                            padding: "11px 14px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", opacity: 0.7 }, children: s.d }), _jsx("div", { style: { marginTop: 3, fontWeight: 500, fontFamily: "var(--lp-mono)", fontSize: 13 }, children: s.t })] }), s.holding && (_jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, padding: "3px 8px", background: "rgba(255,253,250,.16)", borderRadius: 999, letterSpacing: ".15em", textTransform: "uppercase" }, children: "9:32 left" }))] }, i))) }), _jsxs("div", { style: { padding: "20px 28px 28px", display: "flex", alignItems: "center", gap: 9, color: "var(--lp-plum-500)", fontSize: 13.5 }, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", children: [_jsx("circle", { cx: "8", cy: "8", r: "6.4", stroke: "currentColor", strokeWidth: "1.3" }), _jsx("path", { d: "M8 4.5V8l2.4 1.4", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })] }), "Holds expire kindly \u2014 invitees get a gentle reminder before the slot releases."] })] }), _jsxs("div", { className: "lp-feature-card", style: { gridColumn: "span 5" }, children: [_jsx("span", { className: "lp-eyebrow", children: "Group poll" }), _jsx("h3", { className: "lp-h2", style: { marginTop: 6 }, children: "Find the one time that works." }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }, children: "Float three options. Watch consensus arrive on its own." }), _jsx("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }, children: POLL_OPTIONS.map((o, i) => (_jsxs("div", { style: {
                                            position: "relative",
                                            background: o.picked ? "var(--lp-lilac-soft)" : "var(--lp-cream)",
                                            border: `1px solid ${o.picked ? "var(--lp-lilac)" : "var(--lp-border)"}`,
                                            borderRadius: 13,
                                            padding: "11px 14px",
                                            overflow: "hidden",
                                        }, children: [_jsxs("div", { style: { position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }, children: [_jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 12, color: "var(--lp-plum-700)" }, children: o.t }), _jsxs("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 11, color: "var(--lp-plum-500)" }, children: [o.votes, "/", o.total] })] }), !o.picked && (_jsx("div", { style: {
                                                    position: "absolute", inset: 0,
                                                    background: "var(--lp-lilac-soft)",
                                                    width: `${(o.votes / o.total) * 100}%`,
                                                    opacity: 0.5,
                                                } }))] }, i))) })] }), _jsxs("div", { className: "lp-feature-card", style: { gridColumn: "span 5" }, children: [_jsx("span", { className: "lp-eyebrow", children: "Round robin" }), _jsx("h3", { className: "lp-h2", style: { marginTop: 6 }, children: "Share the load, fairly." }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }, children: "Rotate hosts by who's freest \u2014 or whose turn it is." }), _jsx("div", { style: { marginTop: 18, display: "flex", gap: 0 }, children: TEAM.map((p, i) => (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginLeft: i === 0 ? 0 : -8 }, children: [_jsx("div", { style: {
                                                    width: 52, height: 52, borderRadius: 999, background: p.bg,
                                                    border: "2.5px solid var(--lp-cream)",
                                                    display: "grid", placeItems: "center",
                                                    fontFamily: "var(--lp-serif)", fontSize: 17, color: "var(--lp-plum-900)",
                                                }, children: p.n[0] }), _jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: p.n })] }, p.n))) }), _jsxs("div", { style: { marginTop: 16, padding: 14, borderRadius: 12, background: "var(--lp-ivory-2)", border: "1px solid var(--lp-border)" }, children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: "Next up" }), _jsx("div", { style: { marginTop: 4, fontWeight: 560, fontSize: 14 }, children: "Jules \u2014 three more bookings this week" })] })] }), _jsxs("div", { className: "lp-feature-card", style: { gridColumn: "span 7" }, children: [_jsx("span", { className: "lp-eyebrow", children: "Recurring rituals" }), _jsx("h3", { className: "lp-h2", style: { marginTop: 6 }, children: "Standing meetings that don't outstay their welcome." }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: 0, maxWidth: "52ch", lineHeight: 1.6 }, children: "Set a cadence, attach an agenda, let BunnyCal pause it gracefully when calendars get crowded." }), _jsx("div", { style: { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }, children: RECUR_WEEKS.map((c) => (_jsxs("div", { style: {
                                            border: `1px solid ${c.on ? "var(--lp-lilac)" : "var(--lp-border)"}`,
                                            background: c.on ? "var(--lp-lilac-soft)" : "var(--lp-cream)",
                                            borderRadius: 12,
                                            padding: "13px 11px",
                                            display: "flex", flexDirection: "column", gap: 4,
                                        }, children: [_jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: "Week of" }), _jsx("span", { style: { fontFamily: "var(--lp-serif)", fontSize: 21, letterSpacing: "-.02em" }, children: c.label }), _jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 11, color: c.on ? "var(--lp-plum-700)" : "var(--lp-plum-300)" }, children: c.on ? "Scheduled" : "Skipped" })] }, c.label))) })] })] })] }) }));
}
