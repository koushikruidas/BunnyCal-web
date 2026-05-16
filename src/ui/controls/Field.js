import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
/**
 * Form field wrapper. Composes label + control + message slot with a fixed
 * geometry so that an error message appearing or disappearing does not push
 * surrounding content (visual-stability invariant #15-5).
 */
export function Field({ label, htmlFor, description, hint, error, required = false, children, className, }) {
    const messageId = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
    return (_jsxs("div", { className: clsx("flex flex-col gap-1.5", className), children: [_jsxs("label", { htmlFor: htmlFor, className: "text-body-sm font-medium text-text-secondary", children: [label, required ? (_jsx("span", { "aria-hidden": "true", className: "ml-1 text-danger-fg", children: "*" })) : null] }), description ? (_jsx("p", { className: "text-body-sm text-text-tertiary", children: description })) : null, children, _jsx("p", { id: messageId, role: error ? "alert" : undefined, "aria-live": error ? "polite" : undefined, className: clsx("min-h-[18px] text-body-sm", error ? "text-danger-fg" : "text-text-tertiary"), children: error ?? hint ?? " " })] }));
}
