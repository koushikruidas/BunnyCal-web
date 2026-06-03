import clsx from "./clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "google" | "secondary";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "primary", className, loading = false, disabled, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "focus-ring min-h-touch rounded-[12px] text-body font-medium tracking-tight transition duration-fast ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]",
        variant === "primary" && "bg-accent-lavender text-[#241b34] px-5 py-3 hover:brightness-105",
        variant === "ghost" && "bg-transparent text-fg-dim border border-border-subtle hover:text-fg hover:border-border-default px-4 py-3",
        variant === "google" && "bg-surface-inverse text-text-on-inverse px-3.5 py-2 text-body-sm",
        variant === "secondary" && "bg-surface-sunken text-fg border border-border-subtle hover:border-border-default px-3.5 py-2 text-body-sm",
        className,
      )}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
