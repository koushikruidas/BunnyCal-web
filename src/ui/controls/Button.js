import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "@/lib/clsx";
const sizeClasses = {
    sm: "min-h-[36px] px-3 text-body-sm gap-1.5",
    md: "min-h-touch px-4 text-body gap-2",
    lg: "min-h-[52px] px-5 text-body gap-2",
};
const variantClasses = {
    primary: "bg-surface-inverse text-text-on-inverse border border-surface-inverse " +
        "hover:brightness-110 active:brightness-95",
    secondary: "bg-surface text-text-primary border border-border-default " +
        "hover:bg-surface-sunken hover:border-border-strong active:bg-surface-sunken",
    ghost: "bg-transparent text-text-primary border border-transparent " +
        "hover:bg-surface-sunken active:bg-accent-surface",
    danger: "bg-danger-bg text-text-on-accent border border-danger-bg " +
        "hover:brightness-110 active:brightness-95",
};
export const Button = forwardRef(function Button({ variant = "primary", size = "md", loading = false, leadingIcon, trailingIcon, fullWidth = false, disabled, type = "button", className, children, ...rest }, ref) {
    const isDisabled = disabled || loading;
    return (_jsxs("button", { ref: ref, type: type, disabled: isDisabled, "aria-busy": loading || undefined, "data-loading": loading || undefined, className: clsx("focus-ring", "inline-flex items-center justify-center", "rounded-xl font-medium", "transition-[background-color,border-color,color,filter] duration-fast ease-out", "select-none whitespace-nowrap", sizeClasses[size], variantClasses[variant], fullWidth && "w-full", isDisabled && "opacity-60 cursor-not-allowed pointer-events-none", className), ...rest, children: [loading ? _jsx(Spinner, { size: size }) : leadingIcon, _jsx("span", { className: clsx(loading && "opacity-90"), children: children }), !loading && trailingIcon ? trailingIcon : null] }));
});
function Spinner({ size }) {
    const pixel = size === "sm" ? 14 : size === "lg" ? 18 : 16;
    return (_jsxs("svg", { width: pixel, height: pixel, viewBox: "0 0 16 16", role: "status", "aria-label": "Loading", className: "animate-spin", children: [_jsx("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeOpacity: "0.25", strokeWidth: "2" }), _jsx("path", { d: "M14 8a6 6 0 0 0-6-6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }));
}
