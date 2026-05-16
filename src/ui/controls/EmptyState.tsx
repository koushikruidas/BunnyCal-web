import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface EmptyStateProps {
  /** Optional illustrative icon — 32–48px recommended. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Optional primary action — typically a Button. */
  action?: ReactNode;
  /** Optional secondary action rendered below the primary. */
  secondaryAction?: ReactNode;
  /**
   * Visual density. "card" wraps in a bordered surface (use for in-panel
   * empties); "bare" renders without a frame (use for full-page empties).
   * Default: "card".
   */
  variant?: "card" | "bare";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "card",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center text-center",
        "gap-3 py-8 px-4",
        variant === "card" &&
          "rounded-card border border-border-subtle bg-surface shadow-soft",
        className,
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="text-text-tertiary">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-1 max-w-[420px]">
        <h3 className="text-h3 text-text-primary">{title}</h3>
        {description ? (
          <p className="text-body-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
