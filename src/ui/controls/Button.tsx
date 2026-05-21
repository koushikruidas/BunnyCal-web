import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "@/lib/clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Optional leading icon (16–18px recommended). */
  leadingIcon?: ReactNode;
  /** Optional trailing icon (16–18px recommended). */
  trailingIcon?: ReactNode;
  /** Span the parent's full width. */
  fullWidth?: boolean;
  /** Defaults to "button" — set explicitly when used inside a <form>. */
  type?: "button" | "submit" | "reset";
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 text-body-sm gap-1.5",
  md: "min-h-touch px-4 text-body gap-2",
  lg: "min-h-[52px] px-5 text-body gap-2",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-inverse text-text-on-inverse border border-surface-inverse " +
    "hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface text-text-primary border border-border-default " +
    "hover:bg-surface-sunken hover:border-border-strong active:bg-surface-sunken",
  ghost:
    "bg-transparent text-text-primary border border-transparent " +
    "hover:bg-surface-sunken active:bg-accent-surface",
  danger:
    "bg-danger-bg text-text-on-accent border border-danger-bg " +
    "hover:brightness-110 active:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    disabled,
    type = "button",
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={clsx(
        "focus-ring",
        "inline-flex items-center justify-center",
        "rounded-xl font-medium",
        "transition-[background-color,border-color,color,filter] duration-fast ease-out",
        "select-none whitespace-nowrap",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        isDisabled && "opacity-60 cursor-not-allowed pointer-events-none",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size} /> : leadingIcon}
      <span className={clsx(loading && "opacity-90")}>{children}</span>
      {!loading && trailingIcon ? trailingIcon : null}
    </button>
  );
});

function Spinner({ size }: { size: ButtonSize }) {
  const pixel = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <svg
      width={pixel}
      height={pixel}
      viewBox="0 0 16 16"
      role="status"
      aria-label="Loading"
      className="animate-spin"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
