import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { api } from "@/services";
import { savePostLoginRedirect } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
export function DetailsView({ onBack }) {
    const { ctx, send, persistForOAuthRedirect } = useBooking();
    const { requestHold } = useBookingActions();
    const { user } = useAuth();
    const [touched, setTouched] = useState(false);
    const normalizedName = ctx.details.name.trim();
    const normalizedEmail = ctx.details.email.trim();
    const hasEmail = normalizedEmail.length > 0;
    const validEmail = /\S+@\S+\.\S+/.test(normalizedEmail);
    const valid = normalizedName.length > 1 && validEmail;
    const handleGoogleConnect = async () => {
        try {
            const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            savePostLoginRedirect(returnTo);
            persistForOAuthRedirect();
            const redirectUrl = await api.getCalendarConnectRedirectUrl({ source: "public-booking", returnTo });
            window.location.href = redirectUrl;
        }
        catch (e) {
            console.error("Failed to start Google Calendar connect from public booking page", e);
        }
    };
    const update = (k, v) => send({ type: "UPDATE_DETAILS", details: { [k]: v } });
    useEffect(() => {
        if (!user)
            return;
        const nextName = ctx.details.name.trim() ? undefined : user.name || user.username || undefined;
        const nextEmail = ctx.details.email.trim() ? undefined : user.email || undefined;
        if (!nextName && !nextEmail)
            return;
        send({ type: "UPDATE_DETAILS", details: { ...(nextName ? { name: nextName } : {}), ...(nextEmail ? { email: nextEmail } : {}) } });
    }, [ctx.details.email, ctx.details.name, send, user]);
    return (_jsx(Card, { children: _jsxs("div", { className: "flex flex-col gap-4", children: [user ? (_jsxs("div", { className: "flex items-center gap-3 p-3.5 rounded-[12px] border border-emerald-400/30 bg-emerald-500/10", children: [_jsx("div", { className: "w-9 h-9 rounded-[10px] bg-emerald-500/20 text-emerald-200 grid place-items-center font-semibold", children: "\u2713" }), _jsxs("div", { className: "flex-1 text-[13px]", children: [_jsxs("strong", { className: "block font-medium", children: ["Signed in as ", user.email] }), _jsx("span", { className: "text-fg-dim text-[12px]", children: "Your attendee details are restored for this booking." })] })] })) : (_jsxs("div", { className: "flex items-center gap-3 p-3.5 rounded-[12px] border border-white/[.08] bg-panel2", children: [_jsx("div", { className: "w-9 h-9 rounded-[10px] bg-accent-peach grid place-items-center text-[#7a3a14] font-semibold", children: "\u2197" }), _jsxs("div", { className: "flex-1 text-[13px]", children: [_jsx("strong", { className: "block font-medium", children: "Sign in for faster rebooking" }), _jsx("span", { className: "text-fg-dim text-[12px]", children: "Optional \u2014 we'll remember you and your past meetings." })] }), _jsx(Button, { variant: "google", type: "button", onClick: handleGoogleConnect, children: "Google" })] })), ctx.error && _jsx(ErrorBanner, { code: ctx.error.code, message: ctx.error.message, onDismiss: () => send({ type: "ERROR_CLEARED" }) }), _jsx(Field, { label: "Name", children: _jsx("input", { type: "text", value: ctx.details.name, onChange: e => update("name", e.target.value), onBlur: () => setTouched(true), placeholder: "Jordan Lee", className: inputCls }) }), _jsxs(Field, { label: "Email", children: [_jsx("input", { type: "email", value: ctx.details.email, onChange: e => update("email", e.target.value), onBlur: () => setTouched(true), placeholder: "jordan@company.com", className: inputCls }), touched && !hasEmail && _jsx("div", { className: "text-[11.5px] text-accent-pink font-mono", children: "email is required" }), touched && hasEmail && !validEmail && _jsx("div", { className: "text-[11.5px] text-accent-pink font-mono", children: "enter a valid email" })] }), _jsx(Field, { label: "What should we cover? (optional)", children: _jsx("textarea", { value: ctx.details.notes, onChange: e => update("notes", e.target.value), placeholder: "A quick note so I can prep\u2026", className: inputCls + " min-h-[80px] resize-y" }) }), _jsxs("div", { className: "flex items-center gap-2.5 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: onBack, disabled: ctx.loading, children: "Back" }), _jsx(Button, { disabled: !valid || ctx.loading, onClick: requestHold, children: ctx.loading ? "Reserving…" : "Reserve this slot" })] })] }) }));
}
const inputCls = "bg-panel2 border border-white/[.08] text-fg px-3.5 py-3 rounded-[10px] text-[14px] focus:outline-none focus:border-accent-lavender transition-colors";
function Field({ label, children }) {
    return (_jsxs("label", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "text-[11px] font-mono uppercase tracking-widest text-fg-faint", children: label }), children] }));
}
