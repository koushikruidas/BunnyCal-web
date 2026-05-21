import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
export function ProviderStatusRow({ iconText, name, subtitle, meta, status, statusClass = "hold", action }) {
    return (_jsxs("article", { className: "int-tile-mini", style: { gridTemplateColumns: "1.2fr 1fr auto" }, children: [_jsx("div", { className: "logo", children: iconText }), _jsxs("div", { children: [_jsx("div", { className: "name", children: name }), _jsx("div", { className: "last", children: subtitle })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [meta && _jsx("div", { style: { fontSize: 12.5, color: "var(--plum-500)" }, children: meta }), status && _jsxs("span", { className: clsx("dbadge", statusClass), children: [_jsx("span", { className: "dot" }), status] }), action] })] }));
}
