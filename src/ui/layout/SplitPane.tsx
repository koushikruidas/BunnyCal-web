import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

export type SplitPaneAsideWidth = "narrow" | "default" | "wide";

interface SplitPaneProps {
  /**
   * Content for the aside column. Hidden below the md breakpoint
   * (responsive policy: §responsive-shell.md). Consumers should not pass
   * critical workflow content here — anything that the mobile user needs
   * lives in `children`.
   */
  aside: ReactNode;
  children: ReactNode;
  /**
   * Aside column width.
   *   narrow: 220px  — minimal nav (icon-prioritized)
   *   default: 260px — canonical app sidebar (recommended)
   *   wide: 320px   — secondary nav or context panel
   * Default: "default".
   */
  asideWidth?: SplitPaneAsideWidth;
  /**
   * Horizontal gap between aside and main on md+. Constrained to a
   * finite set of spacing tokens.
   * Default: 4 (16px).
   */
  gap?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
}

const asideWidthClasses: Record<SplitPaneAsideWidth, string> = {
  narrow: "md:w-[220px]",
  default: "md:w-[260px]",
  wide: "md:w-[320px]",
};

const gapClasses: Record<NonNullable<SplitPaneProps["gap"]>, string> = {
  2: "md:gap-2",
  3: "md:gap-3",
  4: "md:gap-4",
  5: "md:gap-5",
  6: "md:gap-6",
  8: "md:gap-8",
};

/**
 * Generic responsive 2-column layout. Below md (768px), only `children`
 * renders; above md, `aside` and `children` render side-by-side.
 *
 * Responsive policy:
 *   - Below md: aside is `display: none`. Critical workflow content must
 *     live in `children` (responsive reordering must not change workflow
 *     meaning — see responsive-shell.md).
 *   - md and above: aside is a fixed-width column on the left, children
 *     fill the remaining space.
 *
 * No animated transitions across breakpoints (the layout shift on resize
 * is intentional and instantaneous).
 */
export function SplitPane({
  aside,
  children,
  asideWidth = "default",
  gap = 4,
  className,
}: SplitPaneProps) {
  return (
    <div
      className={clsx(
        "flex flex-col md:flex-row md:items-stretch",
        "w-full min-h-0",
        gapClasses[gap],
        className,
      )}
    >
      <aside
        className={clsx(
          "hidden md:flex md:flex-col md:shrink-0",
          asideWidthClasses[asideWidth],
        )}
      >
        {aside}
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
