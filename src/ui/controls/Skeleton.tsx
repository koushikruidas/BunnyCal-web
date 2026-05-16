import clsx from "@/lib/clsx";

export type SkeletonVariant = "block" | "text" | "circle";

interface SkeletonProps {
  /**
   * Shape variant.
   *   block — default rectangle (use className for size).
   *   text  — short rounded bar; default h-4 w-full.
   *   circle — fully rounded; use className for size.
   */
  variant?: SkeletonVariant;
  /**
   * Sizing and any further customization. Skeletons must match the geometry
   * of the content they replace (visual-stability invariant #15-1).
   */
  className?: string;
  /**
   * Accessible label announced to screen readers. Defaults to "Loading" —
   * pass a more descriptive label when context warrants.
   */
  ariaLabel?: string;
}

const variantClasses: Record<SkeletonVariant, string> = {
  block: "rounded-lg",
  text: "rounded h-4 w-full",
  circle: "rounded-full",
};

export function Skeleton({
  variant = "block",
  className,
  ariaLabel = "Loading",
}: SkeletonProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
      className={clsx(
        "ui-skeleton",
        "block bg-surface-sunken",
        variantClasses[variant],
        className,
      )}
    />
  );
}
