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
    <div className="bk-cal">
      <div className="bk-cal-month">{monthLabel}</div>
      <div className="bk-cal-grid">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="bk-cal-dow">{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="bk-cal-cell bk-cal-empty" />;
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
                "bk-cal-cell",
                disabled && "is-disabled",
                !disabled && !isSel && "is-active",
                isToday && !isSel && "is-today",
                isSel && "is-selected",
              )}
            >
              {c.day.getDate()}
              {!disabled && !isSel && <span className="bk-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
