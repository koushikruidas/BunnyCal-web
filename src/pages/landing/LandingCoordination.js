import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const HOURS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];
const COLS = [
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
    { c: "lp-lilac", l: "Meetings" },
    { c: "lp-sage", l: "Focus" },
    { c: "lp-peach", l: "1:1s" },
    { c: "lp-blush", l: "External" },
    { c: "lp-butter", l: "Buffer" },
];
function CoordStat({ label, value, hint, tint }) {
    return (_jsxs("div", { style: { background: "var(--lp-cream)", border: "1px solid var(--lp-border)", borderRadius: 15, padding: 20 }, children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: label }), _jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }, children: [_jsx("div", { style: { fontFamily: "var(--lp-serif)", fontSize: 38, lineHeight: 1, letterSpacing: "-.02em" }, children: value }), _jsx("span", { style: { width: 9, height: 9, borderRadius: 999, background: `var(--${tint})`, border: "1px solid var(--lp-border)", flexShrink: 0 } })] }), _jsx("div", { style: { marginTop: 7, color: "var(--lp-plum-400)", fontSize: 13 }, children: hint })] }));
}
export function LandingCoordination() {
    return (_jsx("section", { className: "lp-section", id: "coordination", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-section-head", children: [_jsx("span", { className: "lp-eyebrow", children: "Calendar coordination" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["A clearer week, ", _jsx("em", { children: "by design." })] }), _jsx("p", { className: "lp-lede", style: { marginTop: 18 }, children: "EasySchedule layers everyone's commitments into one calm picture. Meetings land where they fit, never where they collide." })] }), _jsxs("div", { className: "lp-coord-card", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 22 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: "This week \u00B7 May 12 \u2014 16" }), _jsx("div", { className: "lp-h2", style: { marginTop: 7 }, children: "Studio \u00B7 Pacific time" })] }), _jsx("div", { style: { display: "flex", gap: 7, flexWrap: "wrap" }, children: LEGEND.map((k) => (_jsxs("span", { className: "lp-chip", children: [_jsx("span", { className: "lp-dot", style: { background: `var(--${k.c})` } }), k.l] }, k.l))) })] }), _jsxs("div", { className: "lp-timeline", role: "img", "aria-label": "A week of meetings shown as gentle pastel blocks", children: [_jsxs("div", { className: "lp-t-col gut", children: [_jsx("div", { className: "lp-t-head", style: { visibility: "hidden" }, children: "\u00B7" }), HOURS.map((h, i) => _jsx("div", { className: "lp-t-hour", children: h }, i))] }), DAY_LABELS.map((d, ci) => (_jsxs("div", { className: "lp-t-col", children: [_jsx("div", { className: "lp-t-head", children: d }), COLS[ci].map((e, ei) => (_jsxs("div", { className: `lp-t-event ${e.color}`, style: { top: e.top + 22, height: e.height }, children: [_jsx("div", { className: "who", children: e.who }), _jsx("div", { style: { fontWeight: 560, color: "var(--lp-plum-900)", marginTop: 2 }, children: e.label })] }, ei))), ci === 2 && (_jsx("div", { className: "lp-t-overlap", style: { top: 22 + 106, height: 84 }, "aria-label": "EasySchedule nudges this overlap into a calmer slot" }))] }, d)))] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 24 }, children: [_jsx(CoordStat, { label: "Time reclaimed", value: "4h 12m", hint: "of focus saved this week", tint: "lp-sage" }), _jsx(CoordStat, { label: "Conflicts resolved", value: "7", hint: "quietly rescheduled in advance", tint: "lp-lilac" }), _jsx(CoordStat, { label: "Buffer added", value: "15 min", hint: "between back-to-backs", tint: "lp-peach" })] })] })] }) }));
}
