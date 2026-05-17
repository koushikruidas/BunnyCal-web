import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TRACKS = [
    { name: "Work · Google", tint: "lp-lilac", busy: [[1, 4], [9, 12]] },
    { name: "Studio · Apple", tint: "lp-peach", busy: [[2, 5], [10, 13]] },
    { name: "Personal · iCloud", tint: "lp-blush", busy: [[0, 3], [11, 14]] },
];
const SLOT_COUNT = 16;
function Stat({ label, value, hint }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,253,250,.5)" }, children: label }), _jsx("div", { style: { fontFamily: "var(--lp-serif)", fontSize: 36, lineHeight: 1.05, letterSpacing: "-.02em", marginTop: 8, color: "var(--lp-cream)" }, children: value }), _jsx("div", { style: { marginTop: 5, color: "rgba(255,253,250,.5)", fontSize: 12 }, children: hint })] }));
}
export function LandingIntelligence() {
    return (_jsx("section", { className: "lp-section-dark", id: "intelligence", children: _jsx("div", { className: "lp-container", children: _jsxs("div", { className: "lp-intel-grid", children: [_jsxs("div", { children: [_jsx("span", { className: "lp-eyebrow", style: { color: "rgba(255,253,250,.5)" }, children: "Quiet intelligence" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14, color: "var(--lp-cream)" }, children: ["Calmer because ", _jsx("em", { style: { color: "var(--lp-lavender)" }, children: "it's smarter underneath." })] }), _jsx("p", { className: "lp-lede", style: { marginTop: 22, color: "rgba(255,253,250,.68)" }, children: "BunnyCal watches every calendar you've connected \u2014 work, studio, personal \u2014 and keeps your booking page truthful in real time. Holds, buffers, and time zones, handled before they ever surface." }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 36 }, children: [_jsx(Stat, { label: "Sync window", value: "120 ms", hint: "median, p99 \u2264 800 ms" }), _jsx(Stat, { label: "Uptime", value: "99.99%", hint: "trailing 12 months" }), _jsx(Stat, { label: "Conflicts caught", value: "2.4M", hint: "this quarter, silently" })] }), _jsxs("div", { style: { marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }, children: [_jsx("a", { className: "lp-btn lp-btn-primary lp-btn-sm", style: { background: "var(--lp-cream)", color: "var(--lp-plum-900)" }, href: "#trust", children: "Trust & reliability" }), _jsx("a", { className: "lp-btn lp-btn-ghost lp-btn-sm", style: { color: "var(--lp-cream)" }, href: "#engineering", children: "How we engineer calm \u2192" })] })] }), _jsxs("div", { style: {
                            background: "rgba(255,253,250,.04)",
                            border: "1px solid rgba(255,253,250,.10)",
                            borderRadius: 26,
                            padding: 26,
                            backdropFilter: "blur(6px)",
                        }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,253,250,.45)" }, children: "Tuesday \u00B7 May 19" }), _jsx("div", { className: "lp-h3", style: { color: "var(--lp-cream)", marginTop: 5 }, children: "3 calendars \u00B7 1 calm answer" })] }), _jsxs("span", { className: "lp-chip", style: { background: "rgba(255,253,250,.08)", borderColor: "rgba(255,253,250,.18)", color: "rgba(255,253,250,.65)" }, children: [_jsx("span", { className: "lp-dot", style: { background: "var(--lp-sage)" } }), "Synced now"] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [TRACKS.map((t) => (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 5 }, children: [_jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,253,250,.5)" }, children: t.name }), _jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, color: "rgba(255,253,250,.35)" }, children: "9a \u2192 5p" })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 2 }, children: Array.from({ length: SLOT_COUNT }).map((_, i) => {
                                                    const busy = t.busy.some(([a, b]) => i >= a && i < b);
                                                    return (_jsx("div", { style: {
                                                            height: 17,
                                                            borderRadius: 3,
                                                            background: busy ? `var(--${t.tint})` : "rgba(255,253,250,.06)",
                                                            opacity: busy ? 0.85 : 1,
                                                        } }, i));
                                                }) })] }, t.name))), _jsxs("div", { style: { marginTop: 12, padding: 14, borderRadius: 13, background: "rgba(255,253,250,.05)", border: "1px solid rgba(255,253,250,.10)" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 9 }, children: [_jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,253,250,.65)" }, children: "BunnyCal \u00B7 merged" }), _jsx("span", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, color: "var(--lp-sage)" }, children: "5 slots offered" })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 2 }, children: Array.from({ length: SLOT_COUNT }).map((_, i) => {
                                                    const anyBusy = TRACKS.some(t => t.busy.some(([a, b]) => i >= a && i < b));
                                                    const isOffer = !anyBusy;
                                                    const highlight = i === 6 || i === 7;
                                                    return (_jsx("div", { style: {
                                                            height: 21,
                                                            borderRadius: 4,
                                                            background: highlight ? "var(--lp-cream)" : isOffer ? "rgba(200,188,232,.55)" : "rgba(255,253,250,.04)",
                                                        } }, i));
                                                }) }), _jsxs("div", { style: { marginTop: 11, display: "flex", alignItems: "center", gap: 9, color: "rgba(255,253,250,.65)", fontSize: 13 }, children: [_jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", children: _jsx("path", { d: "M2 8.5L6 12.5L14 4.5", stroke: "var(--lp-sage)", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }), "Booked \u00B7 Tue 1:30 pm \u00B7 with travel buffer"] })] })] })] })] }) }) }));
}
