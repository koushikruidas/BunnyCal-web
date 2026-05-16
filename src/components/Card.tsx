import clsx from "./clsx";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  padding?: "none" | "md" | "lg";
}

export function Card({ children, className, padding = "md" }: Props) {
  return (
    <div
      className={clsx(
        "rounded-card border bg-surface-raised shadow-raised",
        "border-border-subtle",
        padding === "md" && "p-5 sm:p-6",
        padding === "lg" && "p-6 sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
