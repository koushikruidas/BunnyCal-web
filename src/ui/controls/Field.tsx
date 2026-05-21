import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface FieldProps {
  /** Visible label. */
  label: ReactNode;
  /** Must match the `id` of the control rendered as `children`. */
  htmlFor: string;
  /** Optional descriptive text shown between label and control. */
  description?: ReactNode;
  /**
   * Optional hint shown below the control. Rendered in the reserved
   * message slot when no error is present.
   */
  hint?: ReactNode;
  /**
   * Optional error message. Takes precedence over `hint` in the message slot.
   * When present, callers should also set `aria-invalid` on the control.
   */
  error?: ReactNode;
  /** Show a required indicator next to the label. */
  required?: boolean;
  /** The control: <Input>, <Textarea>, <Select>, or a custom control. */
  children: ReactNode;
  className?: string;
}

/**
 * Form field wrapper. Composes label + control + message slot with a fixed
 * geometry so that an error message appearing or disappearing does not push
 * surrounding content (visual-stability invariant #15-5).
 */
export function Field({
  label,
  htmlFor,
  description,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldProps) {
  const messageId = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-body-sm font-medium text-text-secondary"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-danger-fg">
            *
          </span>
        ) : null}
      </label>
      {description ? (
        <p className="text-body-sm text-text-tertiary">{description}</p>
      ) : null}
      {children}
      {/*
        Message slot has a reserved min-height so that toggling error/hint
        does not change the overall field height (no CLS).
      */}
      <p
        id={messageId}
        role={error ? "alert" : undefined}
        aria-live={error ? "polite" : undefined}
        className={clsx(
          "min-h-[18px] text-body-sm",
          error ? "text-danger-fg" : "text-text-tertiary",
        )}
      >
        {error ?? hint ?? " "}
      </p>
    </div>
  );
}
