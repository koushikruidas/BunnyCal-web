import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/services";
import { getIntentFromSearch, peekAuthIntent, resolvePostLoginPath, saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
export function LoginPage() {
    const location = useLocation();
    const { user, loading } = useAuth();
    const authIntent = getIntentFromSearch(location.search) ?? peekAuthIntent() ?? { mode: "APP_LOGIN" };
    const handleGoogleConnect = () => {
        saveAuthIntent(authIntent);
        const oauthUrl = new URL(api.getGoogleOAuthUrl());
        if (authIntent.mode === "INTEGRATION" || authIntent.mode === "PROTECTED_ROUTE") {
            oauthUrl.searchParams.set("redirect", authIntent.returnTo);
        }
        window.location.href = oauthUrl.toString();
    };
    if (!loading && user) {
        return _jsx(Navigate, { to: resolvePostLoginPath(authIntent), replace: true });
    }
    return (_jsx("div", { className: "min-h-screen grid place-items-center bg-[linear-gradient(160deg,#f3f8ff_0%,#fff7ed_100%)] px-6", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl border border-[#dbe4f8] bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.08)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "EasySchedule" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]", children: "Sign in" }), _jsx("p", { className: "text-sm text-[#64748b] mt-1", children: "Start hosting meetings with your own booking link." }), _jsx("button", { onClick: handleGoogleConnect, className: "mt-6 w-full rounded-xl px-4 py-3 border border-[#d1d5db] bg-white hover:bg-[#f9fafb] text-[#0f172a] font-medium", children: "Continue with Google" }), _jsx("div", { className: "my-4 text-center text-sm text-[#9ca3af]", children: "or" }), _jsx("input", { placeholder: "Email", className: "w-full border border-[#d1d5db] rounded-xl px-3 py-2.5 mb-3" }), _jsx("input", { placeholder: "Password", type: "password", className: "w-full border border-[#d1d5db] rounded-xl px-3 py-2.5" }), _jsx("button", { className: "mt-4 w-full rounded-xl px-4 py-3 text-white bg-[#0f172a] hover:bg-[#1e293b]", children: "Sign in" })] }) }));
}
