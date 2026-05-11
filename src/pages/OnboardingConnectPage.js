import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
import { getCurrentRelativeUrl, saveAuthIntent } from "@/lib/authRedirect";
function statusTone(status) {
    const normalized = (status ?? "").toLowerCase();
    if (normalized.includes("active") || normalized.includes("connected")) {
        return { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    }
    if (normalized.includes("error")) {
        return { badge: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" };
    }
    return { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
}
export function OnboardingConnectPage() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState({});
    const [error, setError] = useState(null);
    const googleStatus = useMemo(() => status.google ?? "Not connected", [status.google]);
    const googleTone = statusTone(googleStatus);
    const isConnected = /active|connected/i.test(googleStatus);
    const loadStatus = async () => {
        setError(null);
        try {
            const response = await api.getCalendarStatus();
            setStatus(response);
        }
        catch (e) {
            console.error(e);
            setError("Failed to load calendar status.");
        }
    };
    const handleGoogleConnect = async () => {
        setBusy(true);
        setError(null);
        try {
            saveAuthIntent({ mode: "INTEGRATION", provider: "GOOGLE", returnTo: getCurrentRelativeUrl() });
            const redirectUrl = await api.getCalendarConnectRedirectUrl();
            window.location.href = redirectUrl;
        }
        catch (e) {
            console.error(e);
            setError("Failed to start Google Calendar connect.");
            setBusy(false);
        }
    };
    const disconnectGoogle = async () => {
        setBusy(true);
        setError(null);
        try {
            await api.disconnectCalendar("google");
            await loadStatus();
        }
        catch (e) {
            console.error(e);
            setError("Failed to disconnect Google Calendar.");
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        loadStatus().finally(() => setLoading(false));
    }, []);
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-5 py-8", children: _jsxs("div", { className: "max-w-5xl mx-auto grid lg:grid-cols-[280px_1fr] gap-5", children: [_jsxs("aside", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-[#6b7280]", children: "Setup" }), _jsx("h2", { className: "mt-2 text-xl font-semibold text-[#0f172a]", children: "Welcome to your workspace" }), _jsxs("ol", { className: "mt-5 space-y-3 text-sm", children: [_jsx("li", { className: "rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-3 py-2 text-[#3730a3]", children: "1. Connect calendar" }), _jsx("li", { className: "rounded-xl border border-[#e5e7eb] px-3 py-2 text-[#6b7280]", children: "2. Set weekly hours" }), _jsx("li", { className: "rounded-xl border border-[#e5e7eb] px-3 py-2 text-[#6b7280]", children: "3. Publish first event" })] })] }), _jsxs("main", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-6 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Step 1 of 3" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]", children: "Connect your calendar" }), _jsx("p", { className: "mt-2 text-[#475569]", children: "Bookings are blocked automatically when your calendar is busy." })] }), !loading && (_jsxs("span", { className: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${googleTone.badge}`, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${googleTone.dot}` }), googleStatus] }))] }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-4", children: error }), _jsxs("div", { className: "mt-7 rounded-2xl border border-[#d1d5db] p-4", children: [_jsx("div", { className: "text-lg font-semibold text-[#0f172a]", children: "Google Calendar" }), _jsx("div", { className: "text-sm text-[#64748b] mt-1", children: "Sync events and prevent double bookings" }), _jsxs("div", { className: "mt-4 flex gap-2", children: [!isConnected ? (_jsx("button", { onClick: handleGoogleConnect, disabled: busy, className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60", children: "Connect" })) : (_jsx("button", { onClick: disconnectGoogle, disabled: busy, className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#0f172a] disabled:opacity-60", children: busy ? "Disconnecting..." : "Disconnect" })), _jsx("button", { onClick: loadStatus, className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm", children: "Refresh status" })] })] }), _jsx("div", { className: "mt-8 flex justify-end", children: _jsx(Link, { to: "/onboarding/availability", className: "rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b]", children: "Continue to availability" }) })] })] }) }));
}
