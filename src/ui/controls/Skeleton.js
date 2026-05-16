import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const variantClasses = {
    block: "rounded-lg",
    text: "rounded h-4 w-full",
    circle: "rounded-full",
};
export function Skeleton({ variant = "block", className, ariaLabel = "Loading", }) {
    return (_jsx("span", { role: "status", "aria-label": ariaLabel, "aria-busy": "true", className: clsx("ui-skeleton", "block bg-surface-sunken", variantClasses[variant], className) }));
}
