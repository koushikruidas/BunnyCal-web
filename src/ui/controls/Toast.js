import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const toneClasses = {
    neutral: "border-border-default bg-surface",
    info: "border-info-border bg-info-surface",
    success: "border-success-border bg-success-surface",
    warning: "border-warning-border bg-warning-surface",
    danger: "border-danger-border bg-danger-surface",
};
const titleToneClasses = {
    neutral: "text-text-primary",
    info: "text-info-fg",
    success: "text-success-fg",
    warning: "text-warning-fg",
    danger: "text-danger-fg",
};
/**
 * Single toast surface. Purely presentational — auto-dismiss timing and the
 * toast queue are the consumer's responsibility. (No hidden orchestration
 * side effects inside primitives.)
 */
export function Toast({ tone = "neutral", title, description, onDismiss, role = "status", className, }) {
    return (_jsxs("div", { role: role, "aria-live": role === "alert" ? "assertive" : "polite", className: clsx("pointer-events-auto", "flex items-start gap-3", "min-w-[280px] max-w-[420px]", "rounded-xl border bg-surface px-4 py-3", "shadow-raised", toneClasses[tone], className), children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: clsx("text-body-sm font-medium", titleToneClasses[tone]), children: title }), description ? (_jsx("p", { className: "mt-0.5 text-body-sm text-text-secondary", children: description })) : null] }), onDismiss ? (_jsx("button", { type: "button", onClick: onDismiss, "aria-label": "Dismiss notification", className: clsx("focus-ring", "shrink-0 -mr-1 -mt-1", "min-w-touch min-h-touch p-2", "rounded-md text-text-tertiary", "hover:bg-surface-sunken hover:text-text-primary", "transition-colors duration-fast ease-out"), children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M3 3L11 11M11 3L3 11", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) }) })) : null] }));
}
const positionClasses = {
    "top-right": "top-4 right-4 items-end",
    "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
    "bottom-right": "bottom-4 right-4 items-end",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
};
/**
 * Fixed-position container for a queue of Toast elements. The consumer
 * manages the list (add/remove/timeout).
 */
export function ToastViewport({ children, position = "bottom-right", className, }) {
    return (_jsx("div", { "aria-label": "Notifications", className: clsx("pointer-events-none fixed z-40", "flex flex-col gap-2", positionClasses[position], className), children: children }));
}
