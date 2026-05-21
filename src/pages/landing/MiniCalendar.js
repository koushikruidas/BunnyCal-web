import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
export function MiniCalendar({ initialSelected = 18 }) {
    const [sel, setSel] = useState(initialSelected);
    const days = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 4; i++)
            arr.push({ d: 27 + i, dim: true });
        for (let i = 1; i <= 31; i++) {
            const dow = (i + 3) % 7;
            const weekend = dow === 5 || dow === 6;
            arr.push({ d: i, weekend, avail: !weekend && i >= 12 && i <= 28 });
        }
        while (arr.length % 7 !== 0)
            arr.push({ d: arr.length - 31 - 3, dim: true });
        return arr;
    }, []);
    return (_jsxs("div", { className: "lp-cal", children: [_jsxs("div", { className: "lp-cal-head", children: [_jsx("div", { className: "lp-cal-month", children: "May 2026" }), _jsxs("div", { className: "lp-cal-nav", "aria-label": "Change month", children: [_jsx("button", { "aria-label": "Previous", children: "\u2039" }), _jsx("button", { "aria-label": "Next", children: "\u203A" })] })] }), _jsxs("div", { className: "lp-cal-grid", role: "grid", children: [["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (_jsx("div", { className: "lp-cal-dow", children: d }, i))), days.map((c, i) => {
                        const cls = ["lp-cal-day"];
                        if (c.dim)
                            cls.push("dim");
                        if (c.avail)
                            cls.push("avail");
                        if (c.d === sel && !c.dim)
                            cls.push("sel");
                        if (c.d === 17 && !c.dim)
                            cls.push("today");
                        return (_jsx("button", { className: cls.join(" "), disabled: c.dim || c.weekend, onClick: () => !c.dim && c.avail && setSel(c.d), "aria-label": `May ${c.d}`, "aria-pressed": c.d === sel && !c.dim, children: c.d }, i));
                    })] })] }));
}
