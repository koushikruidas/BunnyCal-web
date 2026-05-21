import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
export function Sidebar({ brand, footer, children, className, ariaLabel = "Primary", }) {
    return (_jsxs("aside", { className: clsx("flex w-[260px] shrink-0 flex-col", "rounded-card border border-border-subtle bg-surface", "shadow-soft", "p-4", className), children: [brand ? _jsx("div", { className: "mb-5 px-2", children: brand }) : null, _jsx("nav", { "aria-label": ariaLabel, className: "flex flex-1 flex-col gap-1", children: children }), footer ? (_jsx("div", { className: "mt-4 border-t border-border-subtle pt-4", children: footer })) : null] }));
}
export function SidebarNavItem({ active = false, icon, children, className, ...rest }) {
    return (_jsxs("a", { ...rest, "aria-current": active ? "page" : undefined, className: clsx("focus-ring", "flex items-center gap-2.5", "min-h-touch px-3 py-2", "rounded-lg", "text-body-sm", "transition-colors duration-fast ease-out", active
            ? "bg-accent-surface text-accent-fg font-medium"
            : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary", className), children: [icon ? (_jsx("span", { className: "shrink-0 text-current", "aria-hidden": "true", children: icon })) : null, _jsx("span", { className: "truncate", children: children })] }));
}
