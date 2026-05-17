import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STEPS = [
    {
        n: "01",
        tint: "lp-lilac",
        title: "Connect your calendar",
        body: "Sync Google, Apple, or Outlook. EasySchedule reads your busy times and never writes without your nod.",
    },
    {
        n: "02",
        tint: "lp-peach",
        title: "Set your weekly rhythm",
        body: "Quiet mornings, soft afternoons, no Fridays. EasySchedule honors the shape of your week.",
    },
    {
        n: "03",
        tint: "lp-sage",
        title: "Share one calm link",
        body: "Invitees hold a slot, confirm in seconds, and both sides receive a friendly confirmation.",
    },
];
export function LandingHowItWorks() {
    return (_jsx("section", { className: "lp-section", id: "how", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-section-head", children: [_jsx("span", { className: "lp-eyebrow", children: "Three quiet steps" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["Set up once. ", _jsx("em", { children: "Use it for years." })] })] }), _jsx("div", { className: "lp-flat-rows", children: STEPS.map((s) => (_jsxs("div", { className: "lp-flat-row", children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-end", gap: 12, justifyContent: "space-between" }, children: [_jsx("span", { className: "lp-num", children: s.n }), _jsx("span", { style: {
                                            width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                                            background: `var(--${s.tint}-soft)`,
                                            border: `1px solid var(--${s.tint})`,
                                        } })] }), _jsx("h3", { className: "lp-h3", style: { marginTop: 8 }, children: s.title }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }, children: s.body })] }, s.n))) })] }) }));
}
