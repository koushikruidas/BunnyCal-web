import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
const titleClasses = {
    page: "text-h1 text-text-primary",
    section: "text-h2 text-text-primary",
    subsection: "text-h3 text-text-primary",
};
export function SectionHeader({ title, eyebrow, description, action, level = "section", className, headingId, }) {
    return (_jsxs("header", { className: clsx("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className), children: [_jsxs("div", { className: "flex flex-col gap-1.5 min-w-0", children: [eyebrow ? (_jsx("span", { className: "text-eyebrow uppercase text-text-tertiary", children: eyebrow })) : null, _jsx("h2", { id: headingId, className: titleClasses[level], children: title }), description ? (_jsx("p", { className: "text-body-sm text-text-secondary max-w-comfort", children: description })) : null] }), action ? _jsx("div", { className: "shrink-0", children: action }) : null] }));
}
