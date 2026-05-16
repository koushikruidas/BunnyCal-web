import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface AppShellProps {
  /**
   * Desktop sidebar slot. Rendered at md and above. Below md it is
   * `display: none` (responsive policy — see responsive-shell.md).
   * Consumers should not place workflow-critical content here without
   * also placing it in `children` or `mobileNav`.
   */
  sidebar?: ReactNode;
  /**
   * Mobile bottom navigation slot. Rendered below md only. Hidden at md
   * and above. Compose with the MobileNav + MobileNavItem primitives.
   */
  mobileNav?: ReactNode;
  /**
   * Optional top bar for the main column. Rendered inside the main
   * column on all breakpoints — does not affect the sidebar.
   */
  topBar?: ReactNode;
  children: ReactNode;
  /**
   * Background treatment. "app" applies the canonical gradient; "plain"
   * uses the sunken surface token (suitable for marketing or auth pages).
   * Default: "app".
   */
  background?: "app" | "plain";
  /**
   * Main-column maximum width. Constrains content to a canonical reading
   * width inside the main flex column. Use "wide" for dashboards,
   * "comfort" for forms, "narrow" for focused tasks, "full" to opt out.
   * Default: "wide".
   */
  mainWidth?: "narrow" | "comfort" | "wide" | "full";
  className?: string;
}

const mainWidthClasses: Record<NonNullable<AppShellProps["mainWidth"]>, string> = {
  narrow: "max-w-narrow",
  comfort: "max-w-comfort",
  wide: "max-w-wide",
  full: "",
};

/**
 * Responsive application shell. Composes:
 *   - a desktop sidebar (md+, hidden below)
 *   - a mobile bottom nav (below md, hidden at md+)
 *   - an optional top bar inside the main column
 *   - a main content area
 *
 * Pure visual: no state, no effects, no orchestration side effects.
 *
 * Breakpoint policy (frozen):
 *   < md (768px): mobile mode — sidebar hidden, mobileNav visible.
 *   >= md       : desktop mode — sidebar visible, mobileNav hidden.
 *
 * Bottom padding on the main column reserves clearance for the fixed
 * mobile nav so content does not scroll under it. On desktop the padding
 * is removed.
 *
 * The layout transition at the md breakpoint is intentionally
 * instantaneous (no animation) — animated shell transitions degrade
 * perceived reliability on a focus-task product and risk layout-shift
 * regressions.
 */
export function AppShell({
  sidebar,
  mobileNav,
  topBar,
  children,
  background = "app",
  mainWidth = "wide",
  className,
}: AppShellProps) {
  return (
    <div
      className={clsx(
        "min-h-screen w-full",
        background === "app" ? "bg-gradient-app" : "bg-surface-sunken",
        className,
      )}
    >
      <div
        className={clsx(
          "flex flex-col md:flex-row md:items-stretch",
          "md:gap-4",
          "p-4 sm:p-5 md:p-6",
          // Reserve clearance for the fixed mobile nav at < md.
          mobileNav ? "pb-24 md:pb-6" : "",
        )}
      >
        {sidebar ? (
          <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col">
            {sidebar}
          </aside>
        ) : null}
        <main className="flex flex-1 min-w-0 flex-col gap-4">
          {topBar ? <div className="w-full">{topBar}</div> : null}
          <div className={clsx("mx-auto w-full", mainWidthClasses[mainWidth])}>
            {children}
          </div>
        </main>
      </div>
      {mobileNav ? <div className="md:hidden">{mobileNav}</div> : null}
    </div>
  );
}
