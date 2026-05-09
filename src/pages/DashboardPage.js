import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { Avatar } from "@/components/Avatar";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
export function DashboardPage() {
    const { user, refreshUser, logout, logoutLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        refreshUser().catch(() => {
            // Protected route already handles missing auth.
        });
        api
            .listEventTypes()
            .then(setEvents)
            .catch((e) => {
            console.error(e);
            setError("Failed to load dashboard data.");
            setEvents([]);
        })
            .finally(() => setLoading(false));
    }, [refreshUser]);
    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
    };
    const firstName = useMemo(() => {
        const source = user?.name || user?.username || user?.email || "there";
        return source.split(" ")[0];
    }, [user]);
    const bookingUrl = (event) => {
        if (event.link)
            return toAbsoluteUrl(event.link);
        const username = user?.username || "";
        return toAbsoluteUrl(toPublicBookingPath(username, event.slug));
    };
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_45%,#f9fbff_100%)] px-5 py-6", children: _jsxs("div", { className: "max-w-6xl mx-auto grid lg:grid-cols-[220px_1fr] gap-5", children: [_jsxs("aside", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-4 h-fit shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("div", { className: "px-2 pb-3 border-b border-[#eef2f7]", children: [_jsx("div", { className: "text-[#0f172a] font-semibold", children: "EasySchedule" }), _jsx("div", { className: "text-xs text-[#64748b] mt-1", children: "Host workspace" })] }), _jsxs("nav", { className: "pt-3 space-y-1 text-sm", children: [_jsx("div", { className: "rounded-xl bg-[#eef2ff] text-[#3730a3] px-3 py-2 font-medium", children: "Event types" }), _jsx("div", { className: "rounded-xl px-3 py-2 text-[#64748b]", children: "Meetings" }), _jsx("div", { className: "rounded-xl px-3 py-2 text-[#64748b]", children: "Availability" }), _jsx("div", { className: "rounded-xl px-3 py-2 text-[#64748b]", children: "Integrations" }), _jsx("div", { className: "rounded-xl px-3 py-2 text-[#64748b]", children: "Settings" })] })] }), _jsxs("main", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 pb-5 border-b border-[#eef2f7]", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-[#64748b]", children: ["Good to see you, ", firstName] }), _jsx("h1", { className: "mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]", children: "Your event types" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/onboarding/event", className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b]", children: "New event" }), _jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setMenuOpen((prev) => !prev), className: "rounded-full focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-2", "aria-haspopup": "menu", "aria-expanded": menuOpen, "aria-label": "Open user menu", children: _jsx(Avatar, { name: user?.name || user?.email || user?.username || "User", image: user?.profileImage }) }), menuOpen && (_jsxs("div", { role: "menu", className: "absolute right-0 mt-2 w-44 rounded-xl border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.12)] p-1 z-20", children: [_jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]", children: "Profile" }), _jsx("button", { type: "button", role: "menuitem", className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb]", children: "Settings" }), _jsx("button", { type: "button", role: "menuitem", onClick: handleLogout, disabled: logoutLoading, className: "w-full text-left px-3 py-2 rounded-lg text-sm text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-60", children: logoutLoading ? "Signing out..." : "Logout" })] }))] })] })] }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-4", children: error }), _jsx("section", { className: "mt-5", children: loading ? (_jsx("div", { className: "grid md:grid-cols-2 gap-3", children: Array.from({ length: 4 }).map((_, i) => _jsx("div", { className: "h-28 rounded-2xl bg-[#eef2ff] animate-pulse" }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "rounded-2xl border border-dashed border-[#cbd5e1] p-10 text-center", children: [_jsx("div", { className: "text-[#0f172a] text-lg font-semibold", children: "No event types yet" }), _jsx("p", { className: "text-sm text-[#64748b] mt-1", children: "Create one event and your shareable links will appear here." }), _jsx(Link, { to: "/onboarding/event", className: "mt-4 inline-block rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium", children: "Create event" })] })) : (_jsx("div", { className: "grid md:grid-cols-2 gap-3", children: events.map((event) => {
                                    const url = bookingUrl(event);
                                    return (_jsxs("article", { className: "rounded-2xl border border-[#e2e8f0] p-4 bg-[#fcfdff]", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-[#0f172a]", children: event.name }), _jsxs("p", { className: "text-sm text-[#64748b] mt-1", children: ["/", event.slug] })] }), _jsx("span", { className: "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700", children: "Active" })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { onClick: () => navigator.clipboard.writeText(url), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Copy link" }), _jsx("a", { href: url, className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Preview" })] })] }, event.id));
                                }) })) })] })] }) }));
}
