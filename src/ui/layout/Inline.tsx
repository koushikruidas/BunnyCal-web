import type { ElementType, ReactNode } from "react";
import clsx from "@/lib/clsx";

/**
 * Horizontal layout primitive. Use `wrap` when children may overflow the
 * row (e.g., a wrapping group of badges, a toolbar that needs to reflow on
 * narrow viewports).
 */

export type InlineGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8;
export type InlineAlign = "start" | "center" | "end" | "baseline" | "stretch";
export type InlineJustify = "start" | "center" | "end" | "between" | "around";

interface InlineProps {
  children: ReactNode;
  /** Horizontal gap between children. Default: 2. */
  gap?: InlineGap;
  /** Cross-axis alignment. Default: "center". */
  align?: InlineAlign;
  /** Main-axis distribution. Default: "start". */
  justify?: InlineJustify;
  /** Allow children to wrap to multiple rows when they overflow. */
  wrap?: boolean;
  /** Optional element override (e.g. "nav", "ul"). Default: "div". */
  as?: ElementType;
  className?: string;
}

const gapClasses: Record<InlineGap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
};

const alignClasses: Record<InlineAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
  stretch: "items-stretch",
};

const justifyClasses: Record<InlineJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

export function Inline({
  children,
  gap = 2,
  align = "center",
  justify = "start",
  wrap = false,
  as: Component = "div",
  className,
}: InlineProps) {
  return (
    <Component
      className={clsx(
        "flex min-w-0",
        wrap ? "flex-wrap" : "flex-nowrap",
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </Component>
  );
}
