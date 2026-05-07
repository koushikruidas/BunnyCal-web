import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "./clsx";
function fmt(iso) {
    const d = new Date(iso);
    let h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 === 0 ? 12 : h % 12;
    return `${h}:${String(m).padStart(2, "0")} ${period}`;
}
export function SlotButton({ slot, selected, justTaken, onClick }) {
    const state = !slot.available ? "booked" :
        justTaken ? "just-taken" :
            selected ? "selected" : "available";
    return (_jsxs("button", { type: "button", disabled: state !== "available" && state !== "selected", onClick: () => state === "available" && onClick?.(slot), className: clsx("relative font-mono text-[13px] py-3 px-2.5 rounded-[10px] border transition", state === "available" && "border-white/[.08] bg-panel2 text-fg hover:border-accent-lavender hover:bg-accent-lavender/10", state === "selected" && "bg-accent-lavender border-accent-lavender text-[#1a1530] font-medium", state === "booked" && "border-white/[.08] bg-panel2 text-fg-faint line-through opacity-50 cursor-not-allowed", state === "just-taken" && "border-accent-pink/20 bg-accent-pink/[.06] text-fg-faint cursor-not-allowed"), children: [fmt(slot.start), state === "just-taken" && (_jsx("span", { className: "absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-accent-pink text-[#7a1f47] font-mono whitespace-nowrap", children: "just taken" }))] }));
}
