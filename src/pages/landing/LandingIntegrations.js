import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function G({ children }) {
    return _jsx("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", children: children });
}
const CalendarGlyph = () => _jsxs(G, { children: [_jsx("rect", { x: "2.5", y: "3.5", width: "13", height: "11", rx: "2", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("path", { d: "M2.5 7h13", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("circle", { cx: "6", cy: "10.5", r: "1", fill: "#2B1F3D" })] });
const AppleishGlyph = () => _jsxs(G, { children: [_jsx("circle", { cx: "9", cy: "9", r: "6", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("path", { d: "M9 5v4l3 1.5", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinecap: "round" })] });
const SquareGlyph = () => _jsxs(G, { children: [_jsx("rect", { x: "3", y: "3", width: "12", height: "12", rx: "2", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("path", { d: "M3 9h12M9 3v12", stroke: "#2B1F3D", strokeWidth: "1.3" })] });
const CameraGlyph = () => _jsxs(G, { children: [_jsx("rect", { x: "2.5", y: "5", width: "9", height: "8", rx: "2", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("path", { d: "M11.5 8l4-2v6l-4-2", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" })] });
const BubbleGlyph = () => _jsx(G, { children: _jsx("path", { d: "M3 4h7a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H7l-3 2v-2H3z", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" }) });
const HashGlyph = () => _jsx(G, { children: _jsx("path", { d: "M6 3l-1 12M12 3l-1 12M3 7h12M3 11h12", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinecap: "round" }) });
const PaperGlyph = () => _jsxs(G, { children: [_jsx("path", { d: "M4 3h7l3 3v9H4z", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" }), _jsx("path", { d: "M11 3v3h3", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" })] });
const LinesGlyph = () => _jsx(G, { children: _jsx("path", { d: "M3 5h12M3 9h8M3 13h12", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinecap: "round" }) });
const DiamondGlyph = () => _jsx(G, { children: _jsx("path", { d: "M9 2l6 5-6 9-6-9z", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" }) });
const SpotGlyph = () => _jsxs(G, { children: [_jsx("circle", { cx: "9", cy: "9", r: "5.5", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("circle", { cx: "9", cy: "9", r: "2", fill: "#2B1F3D" })] });
const CloudGlyph = () => _jsx(G, { children: _jsx("path", { d: "M5 12h8a3 3 0 0 0 0-6 4 4 0 0 0-7.7 1A2.5 2.5 0 0 0 5 12z", stroke: "#2B1F3D", strokeWidth: "1.3", strokeLinejoin: "round" }) });
const ChainGlyph = () => _jsxs(G, { children: [_jsx("rect", { x: "2", y: "6", width: "7", height: "6", rx: "3", stroke: "#2B1F3D", strokeWidth: "1.3" }), _jsx("rect", { x: "9", y: "6", width: "7", height: "6", rx: "3", stroke: "#2B1F3D", strokeWidth: "1.3" })] });
const ITEMS = [
    { name: "Google Calendar", tint: "lp-lilac", glyph: _jsx(CalendarGlyph, {}) },
    { name: "Apple Calendar", tint: "lp-blush", glyph: _jsx(AppleishGlyph, {}) },
    { name: "Outlook", tint: "lp-sky", glyph: _jsx(SquareGlyph, {}) },
    { name: "Zoom", tint: "lp-peach", glyph: _jsx(CameraGlyph, {}) },
    { name: "Google Meet", tint: "lp-sage", glyph: _jsx(BubbleGlyph, {}) },
    { name: "Slack", tint: "lp-butter", glyph: _jsx(HashGlyph, {}) },
    { name: "Notion", tint: "lp-lilac", glyph: _jsx(PaperGlyph, {}) },
    { name: "Linear", tint: "lp-sky", glyph: _jsx(LinesGlyph, {}) },
    { name: "Stripe", tint: "lp-peach", glyph: _jsx(DiamondGlyph, {}) },
    { name: "HubSpot", tint: "lp-blush", glyph: _jsx(SpotGlyph, {}) },
    { name: "Salesforce", tint: "lp-sage", glyph: _jsx(CloudGlyph, {}) },
    { name: "Webhook", tint: "lp-butter", glyph: _jsx(ChainGlyph, {}) },
];
const FEATURES = [
    "Two-way sync, never overwriting your events",
    "Auto buffer before & after meetings",
    "Travel-time aware for in-person bookings",
    "Event-type detection — focus blocks respected",
];
export function LandingIntegrations() {
    return (_jsx("section", { className: "lp-section lp-section-band", id: "integrations", children: _jsxs("div", { className: "lp-container", children: [_jsxs("div", { className: "lp-section-head", children: [_jsx("span", { className: "lp-eyebrow", children: "Where EasySchedule lives" }), _jsxs("h2", { className: "lp-h1", style: { marginTop: 14 }, children: ["Connected to ", _jsx("em", { children: "the tools you trust." })] })] }), _jsxs("div", { className: "lp-int-layout", children: [_jsx("div", { className: "lp-int-grid", children: ITEMS.map((it) => (_jsxs("div", { className: "lp-int-card", children: [_jsx("div", { style: {
                                            width: 36, height: 36,
                                            display: "grid", placeItems: "center",
                                            background: `var(--${it.tint}-soft)`,
                                            border: `1px solid var(--${it.tint})`,
                                            borderRadius: 10,
                                        }, children: it.glyph }), _jsx("div", { className: "lp-int-name", children: it.name })] }, it.name))) }), _jsxs("div", { style: {
                                background: "var(--lp-cream)",
                                border: "1px solid var(--lp-border)",
                                borderRadius: 22,
                                padding: 30,
                                boxShadow: "var(--lp-shadow-soft)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                            }, children: [_jsx("span", { className: "lp-eyebrow", children: "Calendar logic" }), _jsx("h3", { className: "lp-h2", children: "Pulls busy times from every calendar you've connected." }), _jsx("p", { style: { color: "var(--lp-plum-500)", margin: 0, lineHeight: 1.6 }, children: "EasySchedule reads availability across all your calendars at once, so no slot is offered that conflicts with the rest of your life \u2014 work, personal, side project, or studio." }), _jsx("ul", { style: { listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 10 }, children: FEATURES.map((t) => (_jsxs("li", { style: { display: "flex", gap: 10, alignItems: "flex-start" }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", style: { marginTop: 3, flexShrink: 0 }, children: [_jsx("circle", { cx: "8", cy: "8", r: "7", fill: "var(--lp-lilac-soft)", stroke: "var(--lp-lilac)" }), _jsx("path", { d: "M5 8.4L7 10.2L11 6", stroke: "var(--lp-plum-700)", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { style: { color: "var(--lp-plum-700)", lineHeight: 1.5 }, children: t })] }, t))) }), _jsx("a", { className: "lp-btn lp-btn-secondary lp-btn-sm", href: "#integrations-all", style: { alignSelf: "flex-start", marginTop: 8 }, children: "See all 40+ integrations \u2192" })] })] })] }) }));
}
