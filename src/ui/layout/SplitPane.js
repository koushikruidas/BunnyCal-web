import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const asideWidthClasses = {
    narrow: "md:w-[220px]",
    default: "md:w-[260px]",
    wide: "md:w-[320px]",
};
const gapClasses = {
    2: "md:gap-2",
    3: "md:gap-3",
    4: "md:gap-4",
    5: "md:gap-5",
    6: "md:gap-6",
    8: "md:gap-8",
};
/**
 * Generic responsive 2-column layout. Below md (768px), only `children`
 * renders; above md, `aside` and `children` render side-by-side.
 *
 * Responsive policy:
 *   - Below md: aside is `display: none`. Critical workflow content must
 *     live in `children` (responsive reordering must not change workflow
 *     meaning — see responsive-shell.md).
 *   - md and above: aside is a fixed-width column on the left, children
 *     fill the remaining space.
 *
 * No animated transitions across breakpoints (the layout shift on resize
 * is intentional and instantaneous).
 */
export function SplitPane({ aside, children, asideWidth = "default", gap = 4, className, }) {
    return (_jsxs("div", { className: clsx("flex flex-col md:flex-row md:items-stretch", "w-full min-h-0", gapClasses[gap], className), children: [_jsx("aside", { className: clsx("hidden md:flex md:flex-col md:shrink-0", asideWidthClasses[asideWidth]), children: aside }), _jsx("div", { className: "flex-1 min-w-0", children: children })] }));
}
