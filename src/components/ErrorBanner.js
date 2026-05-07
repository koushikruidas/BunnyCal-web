import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorBanner({ code, message, onDismiss }) {
    return (_jsxs("div", { className: "flex items-start gap-3 p-3.5 rounded-[12px] border border-accent-pink/30 bg-accent-pink/[.08]", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-accent-pink text-[#7a1f47] grid place-items-center shrink-0 font-bold", children: "!" }), _jsxs("div", { className: "flex-1 text-[13px]", children: [_jsx("strong", { className: "block font-mono text-[11px] uppercase tracking-wider text-fg-dim", children: code }), _jsx("span", { children: message })] }), onDismiss && (_jsx("button", { onClick: onDismiss, className: "text-fg-faint hover:text-fg text-[18px] leading-none", children: "\u00D7" }))] }));
}
