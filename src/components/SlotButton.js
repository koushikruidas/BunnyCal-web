import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "./clsx";
import { formatSlotTime } from "@/shared/time/slotTimeFormatter";
export function SlotButton({ slot, selected, justTaken, onClick }) {
    const state = !slot.available ? "booked" :
        justTaken ? "just-taken" :
            selected ? "selected" : "available";
    return (_jsxs("button", { type: "button", disabled: state !== "available" && state !== "selected", onClick: () => state === "available" && onClick?.(slot), className: clsx("relative w-full font-mono text-[13px] leading-none py-[22px] px-3.5 rounded-[17px] border transition-all duration-200", state === "available" && "border-[rgba(31,21,48,0.09)] bg-[rgba(255,253,250,0.56)] text-[var(--plum-700)] hover:border-[rgba(31,21,48,0.18)] hover:text-[var(--plum-900)] hover:bg-[rgba(255,253,250,0.88)]", state === "selected" && "bg-[var(--plum-900)] border-[var(--plum-900)] text-[var(--cream)] font-medium shadow-[0_10px_24px_-14px_rgba(31,21,48,0.78)]", state === "booked" && "border-[rgba(31,21,48,0.06)] bg-[rgba(255,253,250,0.22)] text-[var(--plum-300)] line-through opacity-65 cursor-not-allowed", state === "just-taken" && "border-accent-pink/20 bg-accent-pink/[.05] text-[var(--plum-300)] cursor-not-allowed"), children: [formatSlotTime(slot.start), state === "just-taken" && (_jsx("span", { className: "absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-accent-pink text-[#7a1f47] font-mono whitespace-nowrap", children: "just taken" }))] }));
}
