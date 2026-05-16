import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface SectionHeaderProps {
  /** Section title (rendered as h2). */
  title: ReactNode;
  /** Optional small uppercase label rendered above the title. */
  eyebrow?: ReactNode;
  /** Optional descriptive text rendered below the title. */
  description?: ReactNode;
  /**
   * Optional trailing slot for actions (e.g. buttons). On mobile, falls
   * below the title block; on sm+, sits to the right.
   */
  action?: ReactNode;
  /**
   * Visual level of the heading. Affects size only; the element is always h2.
   * Default: "section".
   */
  level?: "page" | "section" | "subsection";
  className?: string;
  /**
   * Optional id for the heading element. Useful for aria-labelledby on
   * surrounding containers.
   */
  headingId?: string;
}

const titleClasses: Record<NonNullable<SectionHeaderProps["level"]>, string> = {
  page: "text-h1 text-text-primary",
  section: "text-h2 text-text-primary",
  subsection: "text-h3 text-text-primary",
};

export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  level = "section",
  className,
  headingId,
}: SectionHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        {eyebrow ? (
          <span className="text-eyebrow uppercase text-text-tertiary">
            {eyebrow}
          </span>
        ) : null}
        <h2 id={headingId} className={titleClasses[level]}>
          {title}
        </h2>
        {description ? (
          <p className="text-body-sm text-text-secondary max-w-comfort">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
