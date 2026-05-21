import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "@/lib/clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visual invalid state. */
  invalid?: boolean;
}

/**
 * Native <select> primitive. Renders a chevron via inline SVG positioned
 * with absolute layout (does not affect the geometry of the control or
 * its surrounding rows).
 *
 * For consistent option styling, callers should pass `<option>` children.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          "focus-ring",
          "appearance-none",
          "block w-full",
          "min-h-touch pl-3 pr-9 py-2.5",
          "rounded-xl border bg-surface",
          "text-body text-text-primary",
          "transition-[border-color] duration-fast ease-out",
          invalid
            ? "border-danger-border hover:border-danger-fg"
            : "border-border-default hover:border-border-strong",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-sunken",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
});
