import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
export function Divider({ weight = "subtle", orientation = "horizontal", className, }) {
    const color = weight === "subtle" ? "border-border-subtle" : "border-border-default";
    if (orientation === "vertical") {
        return (_jsx("span", { role: "separator", "aria-orientation": "vertical", className: clsx("inline-block w-px self-stretch border-l", color, className) }));
    }
    return (_jsx("hr", { role: "separator", "aria-orientation": "horizontal", className: clsx("w-full border-t", color, className) }));
}
