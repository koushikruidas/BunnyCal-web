import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
function ArrowIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M3 8h10M9 4l4 4-4 4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
export function LandingCTA({ onCreateLink }) {
    return (_jsx("section", { className: "lp-section", id: "start", children: _jsx("div", { className: "lp-container", children: _jsxs("div", { className: "lp-cta-box", children: [_jsx("span", { className: "lp-eyebrow", style: { color: "rgba(255,253,250,.55)" }, children: "Begin gently" }), _jsxs("h2", { className: "lp-display", style: { marginTop: 18, color: "var(--lp-cream)", fontSize: "clamp(42px, 5.4vw, 84px)" }, children: ["Your calmest link,", _jsx("br", {}), _jsx("em", { style: { color: "var(--lp-lavender)" }, children: "in minutes." })] }), _jsx("p", { style: { marginTop: 22, color: "rgba(255,253,250,.68)", fontSize: 17.5, lineHeight: 1.6, maxWidth: "46ch" }, children: "Free for solo hosts. No credit card. Cancel any time." }), _jsxs("div", { style: { display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }, children: [_jsxs("button", { onClick: onCreateLink, className: "lp-btn lp-btn-primary lp-btn-lg", style: {
                                    background: "var(--lp-cream)",
                                    color: "var(--lp-plum-900)",
                                    boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 14px 30px -12px rgba(0,0,0,.5)",
                                }, children: ["Create your EasySchedule", _jsx(ArrowIcon, {})] }), _jsx(Link, { to: "/book/samantha/intro-30", className: "lp-btn lp-btn-secondary lp-btn-lg", style: { background: "rgba(255,253,250,.08)", color: "var(--lp-cream)", borderColor: "rgba(255,253,250,.18)" }, children: "Book a 15-min walkthrough" })] })] }) }) }));
}
