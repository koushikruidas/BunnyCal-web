import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
/**
 * Fixed-bottom navigation bar for mobile breakpoints. Hidden at md and
 * above (consumers typically render this inside AppShell, which manages
 * the visibility policy; if rendered standalone, wrap in `md:hidden`).
 *
 * The bar is edge-to-edge, opaque on the surface token (not translucent —
 * translucency over scrolling content reduces readability and adds
 * cognitive load on a focus-task product). Safe-area inset padding is
 * applied so the bar clears the iOS home indicator.
 */
export function MobileNav({ children, ariaLabel = "Primary", className, }) {
    return (_jsx("nav", { "aria-label": ariaLabel, className: clsx("fixed inset-x-0 bottom-0 z-30", "border-t border-border-subtle bg-surface", "shadow-raised", "flex items-stretch justify-around", "pb-[env(safe-area-inset-bottom)]", className), children: children }));
}
/**
 * A single mobile-nav tab. Meets the 44px touch target (constitution §31).
 * Active state is communicated via `aria-current="page"` AND a visible
 * accent treatment (color + a thin top indicator). Both are required —
 * color alone is insufficient for accessibility.
 */
export function MobileNavItem({ active = false, icon, children, className, ...rest }) {
    return (_jsxs("a", { ...rest, "aria-current": active ? "page" : undefined, className: clsx("focus-ring", "relative", "flex flex-1 flex-col items-center justify-center gap-0.5", "min-h-touch px-2 py-2", "text-caption", "transition-colors duration-fast ease-out", active
            ? "text-accent-fg font-medium"
            : "text-text-tertiary hover:text-text-secondary", className), children: [_jsx("span", { "aria-hidden": "true", className: clsx("absolute inset-x-6 top-0 h-0.5 rounded-b", active ? "bg-accent-fg" : "bg-transparent") }), icon ? (_jsx("span", { "aria-hidden": "true", className: "shrink-0", children: icon })) : null, _jsx("span", { className: "truncate", children: children })] }));
}
