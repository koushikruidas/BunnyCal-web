import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
export function DashboardPage() {
    const { user, logout, logoutLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            .listEventTypes()
            .then((eventTypes) => {
            setEvents(eventTypes);
        })
            .catch((e) => {
            console.error(e);
            setError("Failed to load dashboard data.");
            setEvents([]);
        })
            .finally(() => setLoading(false));
    }, []);
    const handleLogout = async () => {
        await logout();
    };
    return (_jsx("div", { className: "min-h-screen bg-[#f8faff] p-6", children: _jsxs("div", { className: "max-w-6xl mx-auto grid md:grid-cols-[220px_1fr] gap-5", children: [_jsx("aside", { className: "bg-white rounded-2xl border border-[#e5e7eb] p-4 h-fit", children: _jsxs("nav", { className: "space-y-2 text-sm", children: [_jsx("div", { className: "font-medium text-[#111827]", children: "Events" }), _jsx("div", { className: "text-[#6b7280]", children: "Meetings" }), _jsx("div", { className: "text-[#6b7280]", children: "Availability" }), _jsx("div", { className: "text-[#6b7280]", children: "Settings" })] }) }), _jsxs("main", { className: "bg-white rounded-2xl border border-[#e5e7eb] p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h1", { className: "text-2xl font-semibold text-[#111827]", children: ["Event Types", user ? ` · ${user.name || user.email || user.username}` : ""] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/onboarding/event", className: "px-4 py-2 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7]", children: "Create event" }), _jsx("button", { onClick: handleLogout, disabled: logoutLoading, className: "px-4 py-2 rounded-xl border border-[#d1d5db] disabled:opacity-60", children: logoutLoading ? "Signing out..." : "Logout" })] })] }), error && _jsx("p", { className: "text-sm text-[#dc2626] mb-4", children: error }), loading ? (_jsx("div", { className: "grid sm:grid-cols-2 gap-3", children: Array.from({ length: 4 }).map((_, i) => _jsx("div", { className: "h-28 rounded-xl bg-[#eef2ff] animate-pulse" }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-[#d1d5db] p-10 text-center", children: [_jsx("div", { className: "text-[#111827] font-medium", children: "Create your first event" }), _jsx("p", { className: "text-sm text-[#6b7280] mt-1", children: "Once created, your shareable booking link appears here." }), _jsx(Link, { to: "/onboarding/event", className: "mt-4 inline-block px-4 py-2 rounded-xl border border-[#c7d2fe] bg-[#eef2ff]", children: "Create event" })] })) : (_jsx("div", { className: "grid sm:grid-cols-2 gap-3", children: events.map((event) => (_jsxs("article", { className: "rounded-xl border border-[#e5e7eb] p-4 bg-white shadow-[0_8px_24px_rgba(99,102,241,0.08)]", children: [_jsx("div", { className: "font-medium text-[#111827]", children: event.name }), _jsxs("div", { className: "text-sm text-[#6b7280] mt-1", children: ["/", event.slug] }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("button", { onClick: () => navigator.clipboard.writeText(event.link), className: "px-3 py-1.5 rounded-lg text-sm bg-[#eef2ff] border border-[#c7d2fe]", children: "Copy link" }), _jsx("a", { href: event.link, className: "px-3 py-1.5 rounded-lg text-sm border border-[#d1d5db]", children: "Preview" })] })] }, event.id))) }))] })] }) }));
}
