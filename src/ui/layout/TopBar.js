import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
export function TopBar({ leading, trailing, children, background = "surface", className, ariaLabel = "Top", }) {
    return (_jsxs("header", { "aria-label": ariaLabel, className: clsx("flex w-full items-center gap-4", "min-h-touch px-4 sm:px-6 py-3", "rounded-card", background === "surface"
            ? "bg-surface border border-border-subtle shadow-soft"
            : "bg-transparent", className), children: [leading ? _jsx("div", { className: "flex shrink-0 items-center", children: leading }) : null, children ? (_jsx("div", { className: "flex flex-1 items-center gap-2 min-w-0", children: children })) : (_jsx("div", { className: "flex-1" })), trailing ? (_jsx("div", { className: "flex shrink-0 items-center gap-2", children: trailing })) : null] }));
}
