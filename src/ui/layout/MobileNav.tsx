import type { AnchorHTMLAttributes, ReactNode } from "react";
import clsx from "@/lib/clsx";

interface MobileNavProps {
  /** Nav items — compose with MobileNavItem. 3–5 items recommended. */
  children: ReactNode;
  /** Accessible label for the navigation landmark. */
  ariaLabel?: string;
  className?: string;
}

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
export function MobileNav({
  children,
  ariaLabel = "Primary",
  className,
}: MobileNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30",
        "border-t border-border-subtle bg-surface",
        "shadow-raised",
        "flex items-stretch justify-around",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      {children}
    </nav>
  );
}

type MobileNavItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Mark the item as the currently active route. */
  active?: boolean;
  /** 20–22px icon recommended. Rendered above the label. */
  icon?: ReactNode;
  /** Visible label below the icon. Kept short (1–2 words). */
  children: ReactNode;
};

/**
 * A single mobile-nav tab. Meets the 44px touch target (constitution §31).
 * Active state is communicated via `aria-current="page"` AND a visible
 * accent treatment (color + a thin top indicator). Both are required —
 * color alone is insufficient for accessibility.
 */
export function MobileNavItem({
  active = false,
  icon,
  children,
  className,
  ...rest
}: MobileNavItemProps) {
  return (
    <a
      {...rest}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "focus-ring",
        "relative",
        "flex flex-1 flex-col items-center justify-center gap-0.5",
        "min-h-touch px-2 py-2",
        "text-caption",
        "transition-colors duration-fast ease-out",
        active
          ? "text-accent-fg font-medium"
          : "text-text-tertiary hover:text-text-secondary",
        className,
      )}
    >
      {/* Top indicator line — visible only when active. Reserves geometry
          via min-height on the slot so toggling does not shift the icon. */}
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-x-6 top-0 h-0.5 rounded-b",
          active ? "bg-accent-fg" : "bg-transparent",
        )}
      />
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </a>
  );
}
