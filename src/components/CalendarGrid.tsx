import clsx from "./clsx";

interface Props {
  selected: Date;
  today: Date;
  onSelect: (d: Date) => void;
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarGrid({ selected, today, onSelect }: Props) {
  const first = startOfMonth(selected);
  const offset = first.getDay();
  const dim = daysInMonth(selected);
  const cells: ({ day: Date } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ day: new Date(selected.getFullYear(), selected.getMonth(), d) });

  const monthLabel = selected.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[15px] font-medium tracking-tight">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center font-mono text-[10.5px] uppercase tracking-widest text-fg-faint py-1.5">{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />;
          const isToday = sameDay(c.day, today);
          const isSel = sameDay(c.day, selected);
          const isPast = c.day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dow = c.day.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const disabled = isPast || isWeekend;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(c.day)}
              className={clsx(
                "aspect-square rounded-[10px] grid place-items-center text-[13px] relative transition",
                disabled && "text-fg-faint opacity-40 cursor-not-allowed",
                !disabled && !isSel && "text-fg-dim hover:bg-panel2 hover:text-fg",
                isToday && !isSel && "outline outline-1 outline-white/[.16] text-fg",
                isSel && "bg-accent-lavender text-[#1a1530] font-medium",
              )}
            >
              {c.day.getDate()}
              {!disabled && !isSel && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-lavender" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
