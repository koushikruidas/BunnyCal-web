import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { BrandWordmark } from "@/components/BrandWordmark";
function BunnyMark() {
    return (_jsx("span", { className: "lp-brand-mark", children: _jsxs("svg", { width: "45", height: "45", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M8 11.5c0-3.5 1.2-7 1.8-7.2.6-.2 1 .8 1.2 2 .2 1.2.2 2.7.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.4", strokeLinecap: "round" }), _jsx("path", { d: "M16 11.5c0-3.5-1.2-7-1.8-7.2-.6-.2-1 .8-1.2 2-.2 1.2-.2 2.7-.2 4.2", stroke: "#2B1F3D", strokeWidth: "1.4", strokeLinecap: "round" }), _jsx("path", { d: "M5.5 16.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 2.6-2.4 3.5-6.5 3.5s-6.5-.9-6.5-3.5z", stroke: "#2B1F3D", strokeWidth: "1.4" }), _jsx("circle", { cx: "10", cy: "16.4", r: ".7", fill: "#2B1F3D" }), _jsx("circle", { cx: "14", cy: "16.4", r: ".7", fill: "#2B1F3D" })] }) }));
}
export function LandingNav({ onCreateLink: _onCreateLink }) {
    const { user } = useAuth();
    const brandHref = user ? "/dashboard" : "/";
    return (_jsx("nav", { className: "lp-nav", "aria-label": "Primary", children: _jsxs("div", { className: "lp-nav-inner", children: [_jsxs(Link, { to: brandHref, className: "lp-brand", children: [_jsx(BunnyMark, {}), _jsx(BrandWordmark, { style: { fontFamily: "var(--lp-sans)", fontWeight: 600 } })] }), _jsxs("div", { className: "lp-nav-links", children: [_jsx("a", { className: "lp-nav-link", href: "#how", children: "How it works" }), _jsx("a", { className: "lp-nav-link", href: "#workflow", children: "Workflow" }), _jsx("a", { className: "lp-nav-link", href: "#integrations", children: "Integrations" }), _jsx("a", { className: "lp-nav-link", href: "#stories", children: "Stories" })] }), _jsx("div", { className: "lp-nav-cta", children: user ? (_jsx(Link, { to: "/dashboard", className: "lp-btn lp-btn-ghost lp-btn-sm", children: "Dashboard" })) : (_jsx(Link, { to: "/sign-in?mode=APP_LOGIN", className: "lp-btn lp-btn-primary lp-btn-sm", children: "Sign in" })) })] }) }));
}
