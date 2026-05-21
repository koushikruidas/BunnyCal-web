import { useState, useMemo } from "react";

export function MiniCalendar({ initialSelected = 18 }: { initialSelected?: number }) {
  const [sel, setSel] = useState(initialSelected);

  const days = useMemo(() => {
    const arr: Array<{ d: number; dim?: boolean; weekend?: boolean; avail?: boolean }> = [];
    for (let i = 0; i < 4; i++) arr.push({ d: 27 + i, dim: true });
    for (let i = 1; i <= 31; i++) {
      const dow = (i + 3) % 7;
      const weekend = dow === 5 || dow === 6;
      arr.push({ d: i, weekend, avail: !weekend && i >= 12 && i <= 28 });
    }
    while (arr.length % 7 !== 0) arr.push({ d: arr.length - 31 - 3, dim: true });
    return arr;
  }, []);

  return (
    <div className="lp-cal">
      <div className="lp-cal-head">
        <div className="lp-cal-month">May 2026</div>
        <div className="lp-cal-nav" aria-label="Change month">
          <button aria-label="Previous">‹</button>
          <button aria-label="Next">›</button>
        </div>
      </div>
      <div className="lp-cal-grid" role="grid">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="lp-cal-dow">{d}</div>
        ))}
        {days.map((c, i) => {
          const cls = ["lp-cal-day"];
          if (c.dim) cls.push("dim");
          if (c.avail) cls.push("avail");
          if (c.d === sel && !c.dim) cls.push("sel");
          if (c.d === 17 && !c.dim) cls.push("today");
          return (
            <button
              key={i}
              className={cls.join(" ")}
              disabled={c.dim || c.weekend}
              onClick={() => !c.dim && c.avail && setSel(c.d)}
              aria-label={`May ${c.d}`}
              aria-pressed={c.d === sel && !c.dim}
            >
              {c.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
