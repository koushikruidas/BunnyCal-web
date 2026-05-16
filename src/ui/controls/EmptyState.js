import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
export function EmptyState({ icon, title, description, action, secondaryAction, variant = "card", className, }) {
    return (_jsxs("div", { className: clsx("flex flex-col items-center text-center", "gap-3 py-8 px-4", variant === "card" &&
            "rounded-card border border-border-subtle bg-surface shadow-soft", className), children: [icon ? (_jsx("div", { "aria-hidden": "true", className: "text-text-tertiary", children: icon })) : null, _jsxs("div", { className: "flex flex-col gap-1 max-w-[420px]", children: [_jsx("h3", { className: "text-h3 text-text-primary", children: title }), description ? (_jsx("p", { className: "text-body-sm text-text-secondary", children: description })) : null] }), action || secondaryAction ? (_jsxs("div", { className: "mt-2 flex flex-col items-center gap-2 sm:flex-row", children: [action, secondaryAction] })) : null] }));
}
