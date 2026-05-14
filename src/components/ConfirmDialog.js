import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Keep", tone = "neutral", pending = false, onConfirm, onCancel, }) {
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !pending) {
                onCancel();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onCancel, open, pending]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-[#0f172a]/45 p-4 grid place-items-center", onClick: () => !pending && onCancel(), children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "confirm-dialog-title", "aria-describedby": "confirm-dialog-description", className: "w-full max-w-md rounded-2xl border border-[#dbe4f8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { id: "confirm-dialog-title", className: "text-lg font-semibold text-[#0f172a]", children: title }), _jsx("p", { id: "confirm-dialog-description", className: "mt-2 text-sm text-[#475569]", children: description }), _jsxs("div", { className: "mt-5 flex flex-wrap justify-end gap-2", children: [_jsx("button", { type: "button", disabled: pending, onClick: onCancel, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm disabled:opacity-60", children: cancelLabel }), _jsx("button", { type: "button", disabled: pending, onClick: onConfirm, className: `rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 ${tone === "danger" ? "bg-[#b91c1c]" : "bg-[#0f172a]"}`, children: pending ? "Processing..." : confirmLabel })] })] }) }));
}
