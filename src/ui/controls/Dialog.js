import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "@/lib/clsx";
const widthClasses = {
    sm: "max-w-[420px]",
    md: "max-w-[520px]",
    lg: "max-w-[720px]",
};
const FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), button:not([disabled]), iframe, object, embed, ' +
    '[tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
export function Dialog({ open, onClose, title, description, children, footer, width = "md", initialFocusRef, dismissible = true, }) {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const requestClose = useCallback(() => {
        if (dismissible)
            onClose();
    }, [dismissible, onClose]);
    // Body scroll lock + scrollbar-width compensation.
    // (visual-stability invariant #15-4: opening the dialog must not shift the
    // page underneath.)
    useEffect(() => {
        if (!open)
            return;
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
        if (!open)
            return;
        const handler = (event) => {
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
        if (!open)
            return;
        previousFocusRef.current = document.activeElement;
        // Microtask so the portal content is mounted.
        const focusTarget = initialFocusRef?.current ??
            dialogRef.current?.querySelector(FOCUSABLE_SELECTOR) ??
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
        if (!open)
            return;
        const handler = (event) => {
            if (event.key !== "Tab")
                return;
            const root = dialogRef.current;
            if (!root)
                return;
            const focusable = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute("data-focus-trap-skip"));
            if (focusable.length === 0) {
                event.preventDefault();
                root.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey) {
                if (active === first || !root.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            }
            else {
                if (active === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);
    if (!open)
        return null;
    if (typeof document === "undefined")
        return null;
    return createPortal(_jsx("div", { className: clsx("fixed inset-0 z-50", "flex items-center justify-center", "p-4", "bg-surface-inverse/45", "ui-overlay-enter"), onClick: requestClose, "aria-hidden": "false", children: _jsxs("div", { ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, "aria-describedby": description ? descriptionId : undefined, tabIndex: -1, onClick: (event) => event.stopPropagation(), className: clsx("ui-dialog-enter", "w-full", widthClasses[width], "max-h-[calc(100vh-2rem)] overflow-auto", "rounded-card border border-border-subtle bg-surface", "shadow-modal", "p-5 sm:p-6", "flex flex-col gap-4", "focus:outline-none"), children: [_jsxs("header", { className: "flex flex-col gap-1.5", children: [_jsx("h2", { id: titleId, className: "text-h3 text-text-primary", children: title }), description ? (_jsx("p", { id: descriptionId, className: "text-body-sm text-text-secondary", children: description })) : null] }), children ? _jsx("div", { className: "flex flex-col gap-3", children: children }) : null, footer ? (_jsx("footer", { className: "flex flex-wrap justify-end gap-2 pt-1", children: footer })) : null] }) }), document.body);
}
