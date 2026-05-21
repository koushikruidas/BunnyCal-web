import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface TopBarProps {
  /** Leading slot — brand or back affordance. */
  leading?: ReactNode;
  /** Trailing slot — actions, user menu. */
  trailing?: ReactNode;
  /**
   * Center slot — nav links, page title, or breadcrumbs. Rendered as
   * children so consumers can compose freely.
   */
  children?: ReactNode;
  /**
   * Visual treatment. "surface" renders on the canonical surface token;
   * "transparent" lets the page background show through.
   * Default: "surface".
   */
  background?: "surface" | "transparent";
  className?: string;
  /** Accessible label for the navigation landmark. */
  ariaLabel?: string;
}

export function TopBar({
  leading,
  trailing,
  children,
  background = "surface",
  className,
  ariaLabel = "Top",
}: TopBarProps) {
  return (
    <header
      aria-label={ariaLabel}
      className={clsx(
        "flex w-full items-center gap-4",
        "min-h-touch px-4 sm:px-6 py-3",
        "rounded-card",
        background === "surface"
          ? "bg-surface border border-border-subtle shadow-soft"
          : "bg-transparent",
        className,
      )}
    >
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
      {children ? (
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {children}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </header>
  );
}
