import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "./clsx";
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function CalendarGrid({ selected, today, onSelect }) {
    const first = startOfMonth(selected);
    const offset = first.getDay();
    const dim = daysInMonth(selected);
    const cells = [];
    for (let i = 0; i < offset; i++)
        cells.push(null);
    for (let d = 1; d <= dim; d++)
        cells.push({ day: new Date(selected.getFullYear(), selected.getMonth(), d) });
    const monthLabel = selected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return (_jsxs("div", { className: "bk-cal", children: [_jsx("div", { className: "bk-cal-month", children: monthLabel }), _jsxs("div", { className: "bk-cal-grid", children: [["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (_jsx("div", { className: "bk-cal-dow", children: d }, i))), cells.map((c, i) => {
                        if (!c)
                            return _jsx("div", { className: "bk-cal-cell bk-cal-empty" }, i);
                        const isToday = sameDay(c.day, today);
                        const isSel = sameDay(c.day, selected);
                        const isPast = c.day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const dow = c.day.getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const disabled = isPast || isWeekend;
                        return (_jsxs("button", { type: "button", disabled: disabled, onClick: () => onSelect(c.day), className: clsx("bk-cal-cell", disabled && "is-disabled", !disabled && !isSel && "is-active", isToday && !isSel && "is-today", isSel && "is-selected"), children: [c.day.getDate(), !disabled && !isSel && _jsx("span", { className: "bk-cal-dot" })] }, i));
                    })] })] }));
}
