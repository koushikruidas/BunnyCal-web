import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "./clsx";
export function Stepper({ current, steps, onJump }) {
    return (_jsx("div", { className: "flex w-full flex-wrap gap-0 p-1 rounded-[14px] border border-border-subtle bg-surface-raised shadow-soft", children: steps.map((label, i) => {
            const state = i === current ? "active" : i < current ? "done" : "todo";
            return (_jsxs("button", { type: "button", disabled: i >= current, onClick: () => i < current && onJump?.(i), className: clsx("focus-ring inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-body-sm font-mono tracking-wide whitespace-nowrap", state === "active" && "bg-accent-surface text-fg", state === "done" && "text-fg-dim hover:text-fg", state === "todo" && "text-fg-faint cursor-default"), children: [_jsx("span", { className: clsx("grid place-items-center w-[18px] h-[18px] rounded-full text-[10px]", state === "active" && "bg-accent-lavender text-[#241b34]", state === "done" && "bg-accent-mint text-[#1f5a47]", state === "todo" && "bg-surface-sunken text-fg-dim"), children: state === "done" ? "✓" : i + 1 }), label] }, label));
        }) }));
}
