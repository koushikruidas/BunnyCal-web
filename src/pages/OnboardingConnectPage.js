import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
export function OnboardingConnectPage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({});
    const [error, setError] = useState(null);
    const handleGoogleConnect = () => {
        window.location.href = api.getGoogleOAuthUrl();
    };
    useEffect(() => {
        api
            .getCalendarStatus()
            .then(setStatus)
            .catch((e) => {
            console.error(e);
            setError("Failed to load calendar status.");
        })
            .finally(() => setLoading(false));
    }, []);
    return (_jsx("div", { className: "min-h-screen bg-[#f8faff] p-6", children: _jsxs("div", { className: "max-w-3xl mx-auto bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm", children: [_jsx("div", { className: "text-sm text-[#6b7280]", children: "Step 1/3" }), _jsx("h1", { className: "text-2xl font-semibold text-[#111827] mt-1", children: "Connect your calendar" }), _jsx("p", { className: "text-[#6b7280] mt-1", children: "Bookings are synced in real time to prevent conflicts." }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-3", children: error }), _jsx("div", { className: "mt-6 grid sm:grid-cols-2 gap-3", children: loading ? Array.from({ length: 2 }).map((_, i) => _jsx("div", { className: "h-24 rounded-xl bg-[#eef2ff] animate-pulse" }, i)) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: handleGoogleConnect, className: "rounded-xl border border-[#d1d5db] p-4 text-left hover:bg-[#f9fafb]", children: [_jsx("div", { className: "font-medium text-[#111827]", children: "Google Calendar" }), _jsx("div", { className: "text-sm text-[#6b7280] mt-1", children: status.google ?? "Not connected" })] }), _jsxs("button", { className: "rounded-xl border border-[#d1d5db] p-4 text-left hover:bg-[#f9fafb]", children: [_jsx("div", { className: "font-medium text-[#111827]", children: "Outlook" }), _jsx("div", { className: "text-sm text-[#6b7280] mt-1", children: status.outlook ?? "Not connected" })] })] })) }), _jsx("div", { className: "mt-6 flex justify-end", children: _jsx(Link, { to: "/onboarding/availability", className: "px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7]", children: "Continue" }) })] }) }));
}
