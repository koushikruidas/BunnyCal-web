import { useState } from "react";

const SLOTS = [
  { t: "9:00 am",  state: "available" },
  { t: "9:30 am",  state: "available" },
  { t: "10:00 am", state: "picked" },
  { t: "10:30 am", state: "taken" },
  { t: "11:00 am", state: "available" },
  { t: "11:30 am", state: "available" },
] as const;

export function SlotStrip() {
  const [picked, setPicked] = useState(2);

  return (
    <div className="lp-slot-row" role="list">
      {SLOTS.map((s, i) => {
        const isTaken = s.state === "taken";
        const isPicked = i === picked;
        const cls = ["lp-slot", isPicked ? "picked" : isTaken ? "taken" : ""].filter(Boolean).join(" ");
        return (
          <button
            key={i}
            role="listitem"
            className={cls}
            disabled={isTaken}
            onClick={() => !isTaken && setPicked(i)}
            aria-label={`${s.t}${isTaken ? " — unavailable" : ""}`}
          >
            {s.t}
          </button>
        );
      })}
    </div>
  );
}
