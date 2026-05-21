import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { api } from "@/services";
import { saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { chooseProvider, fetchEnabledAuthProviders } from "@/lib/authProviders";
import { adaptLinkProvider } from "@/domain/adapters/authAdapters";
export function DetailsView({ onBack, hostKind = "authenticated-host" }) {
    const { ctx, send, persistForOAuthRedirect } = useBooking();
    const { requestHold } = useBookingActions(hostKind);
    const { user } = useAuth();
    const [touched, setTouched] = useState(false);
    const [authProviders, setAuthProviders] = useState([]);
    const normalizedName = ctx.details.name.trim();
    const normalizedEmail = ctx.details.email.trim();
    const hasEmail = normalizedEmail.length > 0;
    const validEmail = /\S+@\S+\.\S+/.test(normalizedEmail);
    const valid = normalizedName.length > 1 && validEmail;
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const providers = await fetchEnabledAuthProviders();
                if (!alive)
                    return;
                setAuthProviders(providers);
            }
            catch (error) {
                console.error("Failed to load sign-in providers", error);
            }
        };
        void load();
        return () => {
            alive = false;
        };
    }, []);
    const handleSignIn = async () => {
        try {
            const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const selected = chooseProvider(authProviders);
            const provider = selected?.provider;
            saveAuthIntent({ mode: "INTEGRATION", provider: provider?.toUpperCase(), returnTo });
            persistForOAuthRedirect();
            let loginUrl = selected?.loginUrl ?? null;
            if (!loginUrl && selected?.provider) {
                const linked = await api.linkProvider(selected.provider.toLowerCase());
                loginUrl = adaptLinkProvider(linked).authorizationUrl ?? null;
            }
            if (!loginUrl)
                return;
            const oauthUrl = new URL(loginUrl);
            oauthUrl.searchParams.set("redirect", returnTo);
            window.location.href = oauthUrl.toString();
        }
        catch (e) {
            console.error("Failed to start sign-in from public booking page", e);
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
    return (_jsx(Card, { className: "bk-panel", children: _jsxs("div", { className: "flex flex-col gap-4", children: [user ? (_jsxs("div", { className: "flex items-center gap-3 p-3.5 rounded-[12px] border border-success-border bg-success-surface", children: [_jsx("div", { className: "w-9 h-9 rounded-[10px] bg-success-bg/20 text-success-fg grid place-items-center font-semibold", children: "\u2713" }), _jsxs("div", { className: "flex-1 text-body-sm", children: [_jsxs("strong", { className: "block font-medium", children: ["Signed in as ", user.email] }), _jsx("span", { className: "text-fg-dim text-caption", children: "Your attendee details are restored for this booking." })] })] })) : (_jsxs("div", { className: "flex items-center gap-3 p-3.5 rounded-[12px] border border-border-subtle bg-surface-sunken", children: [_jsx("div", { className: "w-9 h-9 rounded-[10px] bg-accent-peach grid place-items-center text-[#5f3046] font-semibold", children: "\u2197" }), _jsxs("div", { className: "flex-1 text-body-sm", children: [_jsx("strong", { className: "block font-medium", children: "Sign in for faster rebooking" }), _jsx("span", { className: "text-fg-dim text-caption", children: "Optional \u2014 we'll remember you and your past meetings." })] }), _jsx(Button, { variant: "google", type: "button", onClick: handleSignIn, children: "Sign in" })] })), ctx.error && _jsx(ErrorBanner, { code: ctx.error.code, message: ctx.error.message, onDismiss: () => send({ type: "ERROR_CLEARED" }) }), _jsx(Field, { label: "Name", children: _jsx("input", { id: "booking-guest-name", type: "text", value: ctx.details.name, onChange: e => update("name", e.target.value), onBlur: () => setTouched(true), placeholder: "Jordan Lee", className: inputCls }) }), _jsxs(Field, { label: "Email", children: [_jsx("input", { id: "booking-guest-email", type: "email", value: ctx.details.email, onChange: e => update("email", e.target.value), onBlur: () => setTouched(true), placeholder: "jordan@company.com", className: inputCls, "aria-invalid": touched && (!hasEmail || !validEmail) ? "true" : undefined, "aria-describedby": touched && (!hasEmail || !validEmail) ? "booking-email-error" : undefined }), touched && !hasEmail && _jsx("div", { id: "booking-email-error", role: "alert", className: "text-caption text-accent-pink font-mono", children: "email is required" }), touched && hasEmail && !validEmail && _jsx("div", { id: "booking-email-error", role: "alert", className: "text-caption text-accent-pink font-mono", children: "enter a valid email" })] }), _jsx(Field, { label: "What should we cover? (optional)", children: _jsx("textarea", { value: ctx.details.notes, onChange: e => update("notes", e.target.value), placeholder: "A quick note so I can prep\u2026", className: inputCls + " min-h-[80px] resize-y" }) }), _jsxs("div", { className: "flex items-center gap-2.5 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: onBack, disabled: ctx.loading, children: "Back" }), _jsx(Button, { disabled: !valid || ctx.loading, onClick: requestHold, children: ctx.loading ? "Reserving…" : "Reserve this slot" })] })] }) }));
}
const inputCls = "bk-input";
function Field({ label, children }) {
    return (_jsxs("label", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "bk-field-label", children: label }), children] }));
}
