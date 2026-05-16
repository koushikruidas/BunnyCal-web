import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const gapClasses = {
    0: "gap-0",
    1: "gap-1",
    2: "gap-2",
    3: "gap-3",
    4: "gap-4",
    5: "gap-5",
    6: "gap-6",
    8: "gap-8",
};
const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    baseline: "items-baseline",
    stretch: "items-stretch",
};
const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
};
export function Inline({ children, gap = 2, align = "center", justify = "start", wrap = false, as: Component = "div", className, }) {
    return (_jsx(Component, { className: clsx("flex min-w-0", wrap ? "flex-wrap" : "flex-nowrap", gapClasses[gap], alignClasses[align], justifyClasses[justify], className), children: children }));
}
