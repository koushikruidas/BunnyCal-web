import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "@/lib/clsx";
export const Input = forwardRef(function Input({ invalid = false, className, type = "text", ...rest }, ref) {
    return (_jsx("input", { ref: ref, type: type, "aria-invalid": invalid || undefined, className: clsx("focus-ring", "block w-full", "min-h-touch px-3 py-2.5", "rounded-xl border bg-surface", "text-body text-text-primary placeholder:text-text-tertiary", "transition-[border-color] duration-fast ease-out", invalid
            ? "border-danger-border hover:border-danger-fg"
            : "border-border-default hover:border-border-strong", "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-sunken", className), ...rest }));
});
