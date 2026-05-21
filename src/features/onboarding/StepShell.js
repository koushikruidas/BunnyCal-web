import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useAuth } from "@/state/AuthContext";
import "../../pages/onboarding/onboarding.css";
const STEP_META = [
    {
        label: "Basic details",
        hint: "Name & description",
        asideTitle: (_jsxs(_Fragment, { children: ["Let's set up your ", _jsx("em", { children: "booking link." })] })),
        blurb: "Just a name and a short note. Invitees will see this when they open your link.",
    },
    {
        label: "Event setup",
        hint: "Location & duration",
        asideTitle: (_jsxs(_Fragment, { children: ["How long, ", _jsx("em", { children: "and where shall we meet?" })] })),
        blurb: "Pick where the meeting happens, and the gentle length that suits the conversation.",
    },
    {
        label: "Availability",
        hint: "Weekly rhythm",
        asideTitle: (_jsxs(_Fragment, { children: ["The shape of ", _jsx("em", { children: "your week." })] })),
        blurb: "Quiet mornings, soft afternoons, no Fridays — define the rhythm you actually live by.",
    },
    {
        label: "Integrations",
        hint: "Calendars & Zoom",
        asideTitle: (_jsxs(_Fragment, { children: ["Quietly synced ", _jsx("em", { children: "across your calendars." })] })),
        blurb: "Connect the calendars that hold your real life. BunnyCal reads them, never writes without your nod.",
    },
    {
        label: "Review & publish",
        hint: "Share your link",
        asideTitle: (_jsxs(_Fragment, { children: ["Almost there. ", _jsx("em", { children: "Take a calm look." })] })),
        blurb: "A last gentle look before your link goes live. You can adjust anything later from the dashboard.",
    },
];
export function StepShell({ steps, currentStep, stepComplete, onStepChange, error, onBack, onNext, onPublish, publishing, publishLabel = "Publish gently", children, }) {
    const { user } = useAuth();
    const brandHref = user ? "/dashboard" : "/";
    const isLast = currentStep === steps.length - 1;
    const meta = STEP_META[currentStep] ?? STEP_META[0];
    return (_jsxs("div", { className: "onb", children: [_jsxs("aside", { className: "onb-aside", children: [_jsxs(Link, { to: brandHref, className: "onb-brand", children: [_jsx("div", { style: {
                                    width: 45, height: 45, borderRadius: 12, flexShrink: 0,
                                    background: "linear-gradient(150deg, var(--lilac-soft), var(--peach-soft))",
                                    border: "1px solid var(--border)",
                                    display: "grid", placeItems: "center",
                                }, children: _jsx(BunnyMark, { size: 26 }) }), _jsx("span", { className: "onb-brand-name", children: _jsx(BrandWordmark, { style: { fontFamily: "var(--sans)", fontWeight: 600 } }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "onb-count", children: ["Step ", currentStep + 1, " of ", steps.length] }), _jsx("h1", { className: "onb-title", children: meta.asideTitle }), _jsx("p", { className: "onb-blurb", children: meta.blurb })] }), _jsx("ol", { className: "onb-steps", children: STEP_META.slice(0, steps.length).map((s, i) => {
                            const isDone = stepComplete(i) && i !== currentStep;
                            const isActive = i === currentStep;
                            return (_jsxs("li", { className: "onb-step" + (isDone ? " done" : isActive ? " active" : ""), onClick: () => isDone && onStepChange(i), "aria-current": isActive ? "step" : undefined, children: [_jsx("span", { className: "marker", "aria-hidden": "true", children: isDone ? (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", children: _jsx("path", { d: "M2 6.4L4.6 9L10 3.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })) : (String(i + 1).padStart(2, "0")) }), _jsxs("div", { children: [_jsx("div", { className: "label", children: s.label }), _jsx("div", { className: "hint", children: s.hint })] })] }, s.label));
                        }) }), _jsxs("div", { className: "onb-foot", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "dot" }), "Your draft is saved as you go."] }), _jsx("div", { className: "row", style: { color: "var(--plum-400)", fontSize: "12.5px" }, children: "About three calm minutes." })] })] }), _jsxs("main", { className: "onb-main", children: [_jsxs("div", { className: "onb-body", children: [error && _jsx("p", { className: "onb-error", children: error }), children] }), _jsxs("footer", { className: "onb-footer", children: [_jsxs("div", { className: "saved", children: [_jsx("span", { className: "dot" }), "Saved \u00B7 synced just now"] }), _jsxs("div", { className: "actions", children: [currentStep > 0 && (_jsx("button", { className: "onb-btn onb-btn-secondary onb-btn-sm", onClick: onBack, disabled: publishing, children: "\u2190 Back" })), !isLast ? (_jsxs("button", { className: "onb-btn onb-btn-primary onb-btn-sm", onClick: onNext, children: ["Continue", _jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M3 8h10M9 4l4 4-4 4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) })] })) : (_jsx("button", { className: "onb-btn onb-btn-primary onb-btn-sm", onClick: onPublish, disabled: publishing, children: publishing ? "Publishing…" : publishLabel }))] })] })] })] }));
}
