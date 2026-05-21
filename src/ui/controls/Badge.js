import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const toneClasses = {
    neutral: "bg-surface-sunken text-text-secondary border-border-subtle",
    accent: "bg-accent-surface text-accent-fg border-accent-border",
    danger: "bg-danger-surface text-danger-fg border-danger-border",
    success: "bg-success-surface text-success-fg border-success-border",
    warning: "bg-warning-surface text-warning-fg border-warning-border",
    info: "bg-info-surface text-info-fg border-info-border",
};
const sizeClasses = {
    sm: "h-5 px-2 text-caption gap-1",
    md: "h-6 px-2.5 text-body-sm gap-1.5",
};
export function Badge({ tone = "neutral", size = "md", icon, children, className, }) {
    return (_jsxs("span", { className: clsx("inline-flex items-center", "rounded-full border font-medium", "whitespace-nowrap", toneClasses[tone], sizeClasses[size], className), children: [icon ? (_jsx("span", { "aria-hidden": "true", className: "shrink-0", children: icon })) : null, children] }));
}
