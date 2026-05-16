import type { AnchorHTMLAttributes, ReactNode } from "react";
import clsx from "@/lib/clsx";

interface SidebarProps {
  /** Optional top slot — brand mark, logo, or workspace switcher. */
  brand?: ReactNode;
  /** Optional bottom slot — user menu, settings, sign-out. */
  footer?: ReactNode;
  /** Nav items. Compose with SidebarNavItem (or a NavLink wrapper). */
  children: ReactNode;
  /**
   * Visibility policy is the consumer's responsibility — the primitive does
   * not assume show/hide breakpoints. Wrap in `hidden md:flex` or similar
   * at the call site.
   */
  className?: string;
  /** Optional accessible label for the nav landmark. */
  ariaLabel?: string;
}

export function Sidebar({
  brand,
  footer,
  children,
  className,
  ariaLabel = "Primary",
}: SidebarProps) {
  return (
    <aside
      className={clsx(
        "flex w-[260px] shrink-0 flex-col",
        "rounded-card border border-border-subtle bg-surface",
        "shadow-soft",
        "p-4",
        className,
      )}
    >
      {brand ? <div className="mb-5 px-2">{brand}</div> : null}
      <nav aria-label={ariaLabel} className="flex flex-1 flex-col gap-1">
        {children}
      </nav>
      {footer ? (
        <div className="mt-4 border-t border-border-subtle pt-4">{footer}</div>
      ) : null}
    </aside>
  );
}

type SidebarNavItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Mark the item as the currently active route. */
  active?: boolean;
  /** Optional leading icon slot (a 16–20px icon recommended). */
  icon?: ReactNode;
  children: ReactNode;
};

export function SidebarNavItem({
  active = false,
  icon,
  children,
  className,
  ...rest
}: SidebarNavItemProps) {
  return (
    <a
      {...rest}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "focus-ring",
        "flex items-center gap-2.5",
        "min-h-touch px-3 py-2",
        "rounded-lg",
        "text-body-sm",
        "transition-colors duration-fast ease-out",
        active
          ? "bg-accent-surface text-accent-fg font-medium"
          : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 text-current" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </a>
  );
}
