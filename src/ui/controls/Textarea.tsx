import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import clsx from "@/lib/clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visual invalid state. Pair with aria-describedby pointing at the error. */
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={clsx(
          "focus-ring",
          "block w-full",
          "px-3 py-2.5",
          "rounded-xl border bg-surface",
          "text-body text-text-primary placeholder:text-text-tertiary",
          "transition-[border-color] duration-fast ease-out",
          "resize-y min-h-[96px]",
          invalid
            ? "border-danger-border hover:border-danger-fg"
            : "border-border-default hover:border-border-strong",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-sunken",
          className,
        )}
        {...rest}
      />
    );
  },
);
