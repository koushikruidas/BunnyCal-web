import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function parseBars(ranges) {
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
    { color: "var(--lp-lilac)", label: "Working hours" },
    { color: "var(--lp-lilac-soft)", label: "Soft hours" },
    { color: "var(--lp-ivory-2)", label: "Quiet" },
];
export function LandingAvailability() {
    return (_jsx("section", { className: "lp-section", id: "availability", children: _jsx("div", { className: "lp-container", children: _jsxs("div", { className: "lp-avail-layout", children: [_jsxs("div", { children: [_jsx("span", { className: "lp-eyebrow", children: "Availability, your way" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["Define the ", _jsx("em", { children: "shape of your week." })] }), _jsx("p", { className: "lp-lede", style: { marginTop: 18 }, children: "Quiet mornings? Walking Wednesdays? Friday afternoons sacred? BunnyCal honors the rhythm you actually live by \u2014 and gently declines anything that doesn't fit." }), _jsx("div", { style: { display: "flex", gap: 9, marginTop: 26, flexWrap: "wrap" }, children: LEGEND.map((l) => (_jsxs("span", { className: "lp-chip", children: [_jsx("span", { className: "lp-dot", style: { background: l.color } }), l.label] }, l.label))) })] }), _jsxs("div", { className: "lp-surface", style: { padding: 24 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lp-plum-400)" }, children: "Weekly rhythm" }), _jsx("div", { className: "lp-h3", style: { marginTop: 5 }, children: "Pacific Standard Time \u00B7 GMT-8" })] }), _jsx("button", { className: "lp-btn lp-btn-secondary lp-btn-sm", children: "Edit hours" })] }), _jsx("div", { className: "lp-avail-grid", children: DAYS.map((d) => (_jsxs("div", { className: "lp-avail-day", children: [_jsx("div", { className: "lp-label", children: d.label }), _jsx("div", { className: "lp-avail-bar", children: Array.from({ length: 24 }).map((_, h) => {
                                                const cls = ["lp-cell"];
                                                for (const b of d.bars) {
                                                    if (h >= b.start && h < b.end) {
                                                        cls.push("on");
                                                        if (b.soft)
                                                            cls.push("soft");
                                                    }
                                                }
                                                return _jsx("div", { className: cls.join(" ") }, h);
                                            }) }), _jsx("div", { style: { fontFamily: "var(--lp-mono)", fontSize: 10, color: "var(--lp-plum-400)" }, children: d.bars.length === 0
                                                ? "Day off"
                                                : d.bars.map((b) => `${b.start}–${b.end}`).join(" · ") })] }, d.label))) })] })] }) }) }));
}
