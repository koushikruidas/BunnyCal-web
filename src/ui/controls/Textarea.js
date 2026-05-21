import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "@/lib/clsx";
export const Textarea = forwardRef(function Textarea({ invalid = false, className, rows = 4, ...rest }, ref) {
    return (_jsx("textarea", { ref: ref, rows: rows, "aria-invalid": invalid || undefined, className: clsx("focus-ring", "block w-full", "px-3 py-2.5", "rounded-xl border bg-surface", "text-body text-text-primary placeholder:text-text-tertiary", "transition-[border-color] duration-fast ease-out", "resize-y min-h-[96px]", invalid
            ? "border-danger-border hover:border-danger-fg"
            : "border-border-default hover:border-border-strong", "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-sunken", className), ...rest }));
});
