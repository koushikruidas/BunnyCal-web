import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "./clsx";
export function Card({ children, className, padding = "md" }) {
    return (_jsx("div", { className: clsx("rounded-card border bg-surface-raised shadow-raised", "border-border-subtle", padding === "md" && "p-5 sm:p-6", padding === "lg" && "p-6 sm:p-8", className), children: children }));
}
