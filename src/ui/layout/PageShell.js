import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const widthClasses = {
    narrow: "max-w-narrow",
    comfort: "max-w-comfort",
    wide: "max-w-wide",
    full: "",
};
export function PageShell({ children, width = "wide", background = "app", className, }) {
    return (_jsx("div", { className: clsx("min-h-screen w-full", "px-4 py-5 sm:px-6 sm:py-8", background === "app" ? "bg-gradient-app" : "bg-surface-sunken", className), children: _jsx("div", { className: clsx("mx-auto w-full", widthClasses[width]), children: children }) }));
}
