import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { api } from "@/services";
export function DetailsView({ onBack }) {
    const { ctx, send } = useBooking();
    const { requestHold } = useBookingActions();
    const [touched, setTouched] = useState(false);
    const valid = ctx.details.name.trim().length > 1 && /\S+@\S+\.\S+/.test(ctx.details.email);
    const handleGoogleConnect = () => {
        window.location.href = api.getGoogleOAuthUrl();
    };
    const update = (k, v) => send({ type: "UPDATE_DETAILS", details: { [k]: v } });
    return (_jsx(Card, { children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 p-3.5 rounded-[12px] border border-white/[.08] bg-panel2", children: [_jsx("div", { className: "w-9 h-9 rounded-[10px] bg-accent-peach grid place-items-center text-[#7a3a14] font-semibold", children: "\u2197" }), _jsxs("div", { className: "flex-1 text-[13px]", children: [_jsx("strong", { className: "block font-medium", children: "Sign in for faster rebooking" }), _jsx("span", { className: "text-fg-dim text-[12px]", children: "Optional \u2014 we'll remember you and your past meetings." })] }), _jsx(Button, { variant: "google", type: "button", onClick: handleGoogleConnect, children: "Google" })] }), ctx.error && _jsx(ErrorBanner, { code: ctx.error.code, message: ctx.error.message, onDismiss: () => send({ type: "ERROR_CLEARED" }) }), _jsx(Field, { label: "Name", children: _jsx("input", { type: "text", value: ctx.details.name, onChange: e => update("name", e.target.value), onBlur: () => setTouched(true), placeholder: "Jordan Lee", className: inputCls }) }), _jsxs(Field, { label: "Email", children: [_jsx("input", { type: "email", value: ctx.details.email, onChange: e => update("email", e.target.value), onBlur: () => setTouched(true), placeholder: "jordan@company.com", className: inputCls }), touched && !valid && ctx.details.email && (_jsx("div", { className: "text-[11.5px] text-accent-pink font-mono", children: "enter a valid email" }))] }), _jsx(Field, { label: "What should we cover? (optional)", children: _jsx("textarea", { value: ctx.details.notes, onChange: e => update("notes", e.target.value), placeholder: "A quick note so I can prep\u2026", className: inputCls + " min-h-[80px] resize-y" }) }), _jsxs("div", { className: "flex items-center gap-2.5 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: onBack, disabled: ctx.loading, children: "Back" }), _jsx(Button, { disabled: !valid || ctx.loading, onClick: requestHold, children: ctx.loading ? "Reserving…" : "Reserve this slot" })] })] }) }));
}
const inputCls = "bg-panel2 border border-white/[.08] text-fg px-3.5 py-3 rounded-[10px] text-[14px] focus:outline-none focus:border-accent-lavender transition-colors";
function Field({ label, children }) {
    return (_jsxs("label", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "text-[11px] font-mono uppercase tracking-widest text-fg-faint", children: label }), children] }));
}
