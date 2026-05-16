import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SplitPane, Stack, Inline } from "@/ui/layout";
import { Button } from "@/ui/controls";
import clsx from "@/lib/clsx";
export function StepShell({ steps, currentStep, stepComplete, onStepChange, error, onBack, onNext, onPublish, publishing, publishLabel = "Publish event", children, }) {
    const isLast = currentStep === steps.length - 1;
    return (_jsx(SplitPane, { aside: _jsx(Stepper, { steps: steps, currentStep: currentStep, stepComplete: stepComplete, onStepChange: onStepChange }), asideWidth: "default", gap: 5, children: _jsxs("div", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: ["Step ", currentStep + 1, " of ", steps.length] }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]", children: steps[currentStep] }), error && _jsx("p", { className: "mt-3 text-sm text-[#dc2626]", children: error }), children, _jsxs(Inline, { gap: 3, align: "center", justify: "between", className: "mt-8", children: [_jsx(Button, { variant: "secondary", onClick: onBack, disabled: currentStep === 0 || publishing, children: "Back" }), isLast ? (_jsx(Button, { variant: "primary", onClick: onPublish, disabled: publishing, children: publishing ? "Publishing..." : publishLabel })) : (_jsx(Button, { variant: "primary", onClick: onNext, children: "Next" }))] })] }) }));
}
function Stepper({ steps, currentStep, stepComplete, onStepChange }) {
    return (_jsxs("div", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Onboarding" }), _jsx(Stack, { as: "ol", gap: 2, className: "mt-4 text-sm", children: steps.map((label, i) => {
                    const isActive = currentStep === i;
                    const isComplete = stepComplete(i);
                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => onStepChange(i), "aria-current": isActive ? "step" : undefined, className: clsx("w-full rounded-xl border px-3 py-2 text-left", isActive
                                ? "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]"
                                : isComplete
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-[#e5e7eb] text-[#6b7280]"), children: [i + 1, ". ", label] }) }, label));
                }) })] }));
}
