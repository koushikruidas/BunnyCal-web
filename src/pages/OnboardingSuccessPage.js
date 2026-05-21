import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/urls";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import "./onboarding/onboarding.css";
export function OnboardingSuccessPage() {
    const [copied, setCopied] = useState(false);
    const link = useMemo(() => {
        const stored = sessionStorage.getItem("createdEventLink") ?? "/public/you/intro-chat";
        return toAbsoluteUrl(stored);
    }, []);
    const copy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (_jsx("div", { className: "onb onb-success", children: _jsxs("div", { className: "onb-success-card", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 9, marginBottom: 24, alignSelf: "flex-start" }, children: [_jsx(BunnyMark, { size: 24 }), _jsx(BrandWordmark, { style: { fontFamily: "var(--sans)", fontWeight: 600, fontSize: 17, letterSpacing: "-0.02em" } })] }), _jsx("div", { className: "onb-success-icon", children: _jsx("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", children: _jsx("path", { d: "M6 14.5L11 19.5L22 9", stroke: "#3D2F7A", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsxs("h1", { className: "onb-success-title", children: ["Your booking link ", _jsx("em", { children: "is live." })] }), _jsx("p", { className: "onb-success-sub", children: "Share it with clients and start accepting meetings quietly." }), _jsx("div", { className: "onb-success-link-box", children: link }), _jsxs("div", { className: "onb-success-actions", children: [_jsx("button", { className: "onb-btn onb-btn-primary", onClick: copy, children: copied ? (_jsxs(_Fragment, { children: [_jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", children: _jsx("path", { d: "M2 7L5.5 10.5L12 4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }), "Copied"] })) : (_jsxs(_Fragment, { children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", children: [_jsx("rect", { x: "4", y: "4", width: "8", height: "8", rx: "1.5", stroke: "currentColor", strokeWidth: "1.3" }), _jsx("path", { d: "M10 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })] }), "Copy link"] })) }), _jsx("a", { href: link, target: "_blank", rel: "noopener noreferrer", className: "onb-btn onb-btn-secondary", children: "Preview page" }), _jsx(Link, { to: "/dashboard", className: "onb-btn onb-btn-ghost", children: "Go to dashboard \u2192" })] }), _jsxs("div", { className: "onb-success-foot", children: [_jsx("span", { className: "dot" }), "Your event is saved and ready to share"] })] }) }));
}
