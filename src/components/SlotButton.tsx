import clsx from "./clsx";
import type { SlotDto } from "@/services/types";
import { formatSlotTime } from "@/shared/time/slotTimeFormatter";

type State = "available" | "selected" | "booked" | "just-taken";

interface Props {
  slot: SlotDto;
  selected?: boolean;
  justTaken?: boolean;
  onClick?: (slot: SlotDto) => void;
}

export function SlotButton({ slot, selected, justTaken, onClick }: Props) {
  const state: State =
    !slot.available ? "booked" :
    justTaken ? "just-taken" :
    selected ? "selected" : "available";

  return (
    <button
      type="button"
      disabled={state !== "available" && state !== "selected"}
      onClick={() => state === "available" && onClick?.(slot)}
      className={clsx(
        "relative font-mono text-[13px] py-3 px-2.5 rounded-[10px] border transition",
        state === "available" && "border-white/[.08] bg-panel2 text-fg hover:border-accent-lavender hover:bg-accent-lavender/10",
        state === "selected" && "bg-accent-lavender border-accent-lavender text-[#1a1530] font-medium",
        state === "booked" && "border-white/[.08] bg-panel2 text-fg-faint line-through opacity-50 cursor-not-allowed",
        state === "just-taken" && "border-accent-pink/20 bg-accent-pink/[.06] text-fg-faint cursor-not-allowed",
      )}
    >
      {formatSlotTime(slot.start)}
      {state === "just-taken" && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-accent-pink text-[#7a1f47] font-mono whitespace-nowrap">
          just taken
        </span>
      )}
    </button>
  );
}
