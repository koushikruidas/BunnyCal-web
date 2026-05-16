import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import clsx from "@/lib/clsx";

export type DialogWidth = "sm" | "md" | "lg";

interface DialogProps {
  open: boolean;
  /**
   * Called when the user requests close via Escape, backdrop click, or any
   * caller-provided close affordance. Caller decides whether to honor it
   * (e.g. block during a pending submit).
   */
  onClose: () => void;
  title: ReactNode;
  /** Optional descriptive paragraph rendered below the title. */
  description?: ReactNode;
  /** Optional body content rendered between description and footer. */
  children?: ReactNode;
  /** Optional footer slot — typically right-aligned action buttons. */
  footer?: ReactNode;
  /**
   * Width preset. Maps to canonical max-widths.
   * Default: "md".
   */
  width?: DialogWidth;
  /**
   * Element to receive focus when the dialog opens. Default: the first
   * focusable descendant of the dialog (typically the cancel button).
   */
  initialFocusRef?: RefObject<HTMLElement>;
  /**
   * When false, Escape and backdrop click do NOT call onClose. Use during
   * pending async operations to prevent accidental dismissal.
   * Default: true.
   */
  dismissible?: boolean;
}

const widthClasses: Record<DialogWidth, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
};

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), button:not([disabled]), iframe, object, embed, ' +
  '[tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
  initialFocusRef,
  dismissible = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  // Body scroll lock + scrollbar-width compensation.
  // (visual-stability invariant #15-4: opening the dialog must not shift the
  // page underneath.)
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.classList.add("ui-scroll-locked");
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.classList.remove("ui-scroll-locked");
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  // Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, requestClose]);

  // Initial focus on open + restore on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Microtask so the portal content is mounted.
    const focusTarget =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogRef.current;
    focusTarget?.focus();
    return () => {
      // Restore focus to the previously focused element (typically the trigger).
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [open, initialFocusRef]);

  // Focus trap — keep Tab/Shift+Tab within the dialog.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("data-focus-trap-skip"));
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50",
        "flex items-center justify-center",
        "p-4",
        "bg-surface-inverse/45",
        "ui-overlay-enter",
      )}
      onClick={requestClose}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={clsx(
          "ui-dialog-enter",
          "w-full",
          widthClasses[width],
          "max-h-[calc(100vh-2rem)] overflow-auto",
          "rounded-card border border-border-subtle bg-surface",
          "shadow-modal",
          "p-5 sm:p-6",
          "flex flex-col gap-4",
          "focus:outline-none",
        )}
      >
        <header className="flex flex-col gap-1.5">
          <h2 id={titleId} className="text-h3 text-text-primary">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-body-sm text-text-secondary">
              {description}
            </p>
          ) : null}
        </header>
        {children ? <div className="flex flex-col gap-3">{children}</div> : null}
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 pt-1">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
