import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "./clsx";
export function Button({ variant = "primary", className, ...rest }) {
    return (_jsx("button", { ...rest, className: clsx("focus-ring min-h-touch rounded-[12px] text-body font-medium tracking-tight transition duration-fast ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]", variant === "primary" && "bg-accent-lavender text-[#241b34] px-5 py-3 hover:brightness-105", variant === "ghost" && "bg-transparent text-fg-dim border border-border-subtle hover:text-fg hover:border-border-default px-4 py-3", variant === "google" && "bg-surface-inverse text-text-on-inverse px-3.5 py-2 text-body-sm", className) }));
}
