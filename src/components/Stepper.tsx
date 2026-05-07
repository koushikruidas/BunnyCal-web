import clsx from "./clsx";

interface Props {
  current: number;
  steps: readonly string[];
  onJump?: (i: number) => void;
}

export function Stepper({ current, steps, onJump }: Props) {
  return (
    <div className="inline-flex flex-wrap gap-0 p-1 rounded-[14px] border border-white/[.08] bg-panel">
      {steps.map((label, i) => {
        const state = i === current ? "active" : i < current ? "done" : "todo";
        return (
          <button
            key={label}
            type="button"
            disabled={i >= current}
            onClick={() => i < current && onJump?.(i)}
            className={clsx(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[12.5px] font-mono tracking-wide whitespace-nowrap",
              state === "active" && "bg-panel2 text-fg",
              state === "done" && "text-fg-dim hover:text-fg",
              state === "todo" && "text-fg-faint cursor-default",
            )}
          >
            <span
              className={clsx(
                "grid place-items-center w-[18px] h-[18px] rounded-full text-[10px]",
                state === "active" && "bg-accent-lavender text-[#1a1530]",
                state === "done" && "bg-accent-mint text-[#0f4d35]",
                state === "todo" && "bg-white/[.06] text-fg-dim",
              )}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
