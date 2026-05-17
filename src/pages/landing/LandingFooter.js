import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
function BunnyMark() {
    return (_jsx("span", { style: {
            width: 26, height: 26,
            display: "grid", placeItems: "center",
            borderRadius: 9,
            background: "linear-gradient(150deg, var(--lp-lilac-soft), var(--lp-blush-soft))",
            border: "1px solid var(--lp-border)",
            flexShrink: 0,
        }, children: _jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.4", strokeLinecap: "round" }), _jsx("path", { d: "M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.4", strokeLinecap: "round" }), _jsx("path", { d: "M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z", stroke: "#2B1F3D", strokeWidth: "1.4" }), _jsx("circle", { cx: "10", cy: "16.4", r: ".7", fill: "#2B1F3D" }), _jsx("circle", { cx: "14", cy: "16.4", r: ".7", fill: "#2B1F3D" })] }) }));
}
export function LandingFooter() {
    return (_jsx("footer", { className: "lp-footer", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-foot-grid", children: [_jsxs("div", { className: "lp-foot-col", children: [_jsxs("div", { style: { display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }, children: [_jsx(BunnyMark, {}), _jsxs("span", { style: { fontFamily: "var(--lp-serif)", fontSize: 18, letterSpacing: "-0.02em", color: "var(--lp-plum-900)" }, children: ["Easy", _jsx("span", { style: { fontFamily: "var(--lp-sans)", fontWeight: 500 }, children: "Schedule" })] })] }), _jsx("p", { style: { color: "var(--lp-plum-500)", maxWidth: "36ch", margin: 0, lineHeight: 1.65, fontSize: 14 }, children: "Calm scheduling for people who like their calendar \u2014 and the people on it. Made with patience in three time zones." })] }), _jsxs("div", { className: "lp-foot-col", children: [_jsx("h4", { children: "Product" }), _jsx("a", { href: "#how", children: "How it works" }), _jsx("a", { href: "#workflow", children: "Workflow types" }), _jsx("a", { href: "#integrations", children: "Integrations" }), _jsx(Link, { to: "/pricing", children: "Pricing" })] }), _jsxs("div", { className: "lp-foot-col", children: [_jsx("h4", { children: "Company" }), _jsx(Link, { to: "/about", children: "About" }), _jsx("a", { href: "#field-notes", children: "Field notes" }), _jsx("a", { href: "#careers", children: "Careers" }), _jsx("a", { href: "#contact", children: "Contact" })] }), _jsxs("div", { className: "lp-foot-col", children: [_jsx("h4", { children: "Quietly" }), _jsx("a", { href: "#trust", children: "Trust & privacy" }), _jsx("a", { href: "#status", children: "Status" }), _jsx("a", { href: "#a11y", children: "Accessibility" }), _jsx("a", { href: "#terms", children: "Terms" })] })] }), _jsxs("div", { className: "lp-foot-bottom", children: [_jsx("div", { children: "\u00A9 2026 EasySchedule \u00B7 Care, calmly applied." }), _jsxs("div", { style: { display: "flex", gap: 14, alignItems: "center" }, children: [_jsx("span", { style: { fontFamily: "var(--lp-mono)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10.5 }, children: "v 2.6" }), _jsx("span", { children: "All systems calm" }), _jsx("span", { style: {
                                        display: "inline-block", width: 8, height: 8,
                                        borderRadius: 999,
                                        background: "var(--lp-sage)",
                                        boxShadow: "0 0 0 3px var(--lp-sage-soft)",
                                    } })] })] })] }) }));
}
