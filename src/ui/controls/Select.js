import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "@/lib/clsx";
/**
 * Native <select> primitive. Renders a chevron via inline SVG positioned
 * with absolute layout (does not affect the geometry of the control or
 * its surrounding rows).
 *
 * For consistent option styling, callers should pass `<option>` children.
 */
export const Select = forwardRef(function Select({ invalid = false, className, children, ...rest }, ref) {
    return (_jsxs("div", { className: "relative w-full", children: [_jsx("select", { ref: ref, "aria-invalid": invalid || undefined, className: clsx("focus-ring", "appearance-none", "block w-full", "min-h-touch pl-3 pr-9 py-2.5", "rounded-xl border bg-surface", "text-body text-text-primary", "transition-[border-color] duration-fast ease-out", invalid
                    ? "border-danger-border hover:border-danger-fg"
                    : "border-border-default hover:border-border-strong", "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-sunken", className), ...rest, children: children }), _jsx("span", { "aria-hidden": "true", className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary", children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", children: _jsx("path", { d: "M3.5 5.25L7 8.75L10.5 5.25", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }));
});
