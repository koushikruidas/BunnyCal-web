import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const mainWidthClasses = {
    narrow: "max-w-narrow",
    comfort: "max-w-comfort",
    wide: "max-w-wide",
    full: "",
};
/**
 * Responsive application shell. Composes:
 *   - a desktop sidebar (md+, hidden below)
 *   - a mobile bottom nav (below md, hidden at md+)
 *   - an optional top bar inside the main column
 *   - a main content area
 *
 * Pure visual: no state, no effects, no orchestration side effects.
 *
 * Breakpoint policy (frozen):
 *   < md (768px): mobile mode — sidebar hidden, mobileNav visible.
 *   >= md       : desktop mode — sidebar visible, mobileNav hidden.
 *
 * Bottom padding on the main column reserves clearance for the fixed
 * mobile nav so content does not scroll under it. On desktop the padding
 * is removed.
 *
 * The layout transition at the md breakpoint is intentionally
 * instantaneous (no animation) — animated shell transitions degrade
 * perceived reliability on a focus-task product and risk layout-shift
 * regressions.
 */
export function AppShell({ sidebar, mobileNav, topBar, children, background = "app", mainWidth = "wide", className, }) {
    return (_jsxs("div", { className: clsx("min-h-screen w-full", background === "app" ? "bg-gradient-app" : "bg-surface-sunken", className), children: [_jsxs("div", { className: clsx("flex flex-col md:flex-row md:items-stretch", "md:gap-4", "p-4 sm:p-5 md:p-6", 
                // Reserve clearance for the fixed mobile nav at < md.
                mobileNav ? "pb-24 md:pb-6" : ""), children: [sidebar ? (_jsx("aside", { className: "hidden md:flex md:w-[260px] md:shrink-0 md:flex-col", children: sidebar })) : null, _jsxs("main", { className: "flex flex-1 min-w-0 flex-col gap-4", children: [topBar ? _jsx("div", { className: "w-full", children: topBar }) : null, _jsx("div", { className: clsx("mx-auto w-full", mainWidthClasses[mainWidth]), children: children })] })] }), mobileNav ? _jsx("div", { className: "md:hidden", children: mobileNav }) : null] }));
}
