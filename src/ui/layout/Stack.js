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
    10: "gap-10",
    12: "gap-12",
};
const alignClasses = {
    stretch: "items-stretch",
    start: "items-start",
    center: "items-center",
    end: "items-end",
};
export function Stack({ children, gap = 4, align = "stretch", as: Component = "div", className, }) {
    return (_jsx(Component, { className: clsx("flex flex-col min-w-0", gapClasses[gap], alignClasses[align], className), children: children }));
}
