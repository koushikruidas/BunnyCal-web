import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "./clsx";
export function Button({ variant = "primary", className, ...rest }) {
    return (_jsx("button", { ...rest, className: clsx("rounded-[12px] text-[14px] font-medium tracking-tight transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]", variant === "primary" && "bg-accent-lavender text-[#1a1530] px-5 py-3 hover:brightness-105", variant === "ghost" && "bg-transparent text-fg-dim border border-white/[.08] hover:text-fg hover:border-white/[.16] px-4 py-3", variant === "google" && "bg-fg text-bg px-3.5 py-2 text-[12.5px]", className) }));
}
