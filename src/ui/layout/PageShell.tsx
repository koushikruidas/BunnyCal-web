import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

export type PageShellWidth = "narrow" | "comfort" | "wide" | "full";
export type PageShellBackground = "app" | "plain";

interface PageShellProps {
  children: ReactNode;
  /**
   * Inner container width. Selects between the three canonical widths defined
   * in tailwind.config.js (or "full" to opt out of a max-width).
   * Default: "wide" (app shell width).
   */
  width?: PageShellWidth;
  /**
   * Page background. "app" applies the canonical gradient; "plain" uses the
   * sunken surface token (suitable for marketing or auth pages that want a
   * distinct identity).
   * Default: "app".
   */
  background?: PageShellBackground;
  className?: string;
}

const widthClasses: Record<PageShellWidth, string> = {
  narrow: "max-w-narrow",
  comfort: "max-w-comfort",
  wide: "max-w-wide",
  full: "",
};

export function PageShell({
  children,
  width = "wide",
  background = "app",
  className,
}: PageShellProps) {
  return (
    <div
      className={clsx(
        "min-h-screen w-full",
        "px-4 py-5 sm:px-6 sm:py-8",
        background === "app" ? "bg-gradient-app" : "bg-surface-sunken",
        className,
      )}
    >
      <div className={clsx("mx-auto w-full", widthClasses[width])}>
        {children}
      </div>
    </div>
  );
}
