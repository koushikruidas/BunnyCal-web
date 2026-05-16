import type { ElementType, ReactNode } from "react";
import clsx from "@/lib/clsx";

/**
 * Vertical layout primitive. Constrains the gap to a finite set of spacing
 * tokens so callers cannot reach for `gap-[7]` or other ad-hoc values.
 */

export type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
export type StackAlign = "stretch" | "start" | "center" | "end";

interface StackProps {
  children: ReactNode;
  /** Vertical gap between children, in Tailwind spacing units (4px each). */
  gap?: StackGap;
  /** Cross-axis alignment of children. Default: "stretch". */
  align?: StackAlign;
  /** Optional element override (e.g. "section", "ul"). Default: "div". */
  as?: ElementType;
  className?: string;
}

const gapClasses: Record<StackGap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

const alignClasses: Record<StackAlign, string> = {
  stretch: "items-stretch",
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export function Stack({
  children,
  gap = 4,
  align = "stretch",
  as: Component = "div",
  className,
}: StackProps) {
  return (
    <Component
      className={clsx(
        "flex flex-col min-w-0",
        gapClasses[gap],
        alignClasses[align],
        className,
      )}
    >
      {children}
    </Component>
  );
}
