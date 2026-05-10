import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { BookingPage } from "@/pages/BookingPage";
import { BookingProvider } from "@/state/BookingContext";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingConnectPage } from "@/pages/OnboardingConnectPage";
import { OnboardingAvailabilityPage } from "@/pages/OnboardingAvailabilityPage";
import { OnboardingEventPage } from "@/pages/OnboardingEventPage";
import { OnboardingSuccessPage } from "@/pages/OnboardingSuccessPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { setAccessToken } from "@/lib/apiClient";
import { AuthProvider, useAuth } from "@/state/AuthContext";
function PublicBookingRoute() {
    const { username, eventTypeSlug } = useParams();
    if (!username || !eventTypeSlug)
        return _jsx(LandingPage, {});
    return _jsx(BookingPage, { username: username, eventTypeSlug: eventTypeSlug });
}
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { className: "min-h-screen grid place-items-center bg-[#f8faff] text-[#6b7280]", children: "Checking session..." });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
function AppRoutes() {
    useEffect(() => {
        const url = new URL(window.location.href);
        const hash = url.hash.startsWith("#") ? new URLSearchParams(url.hash.slice(1)) : null;
        const accessToken = url.searchParams.get("accessToken") ?? hash?.get("accessToken");
        if (accessToken) {
            setAccessToken(accessToken);
            url.searchParams.delete("accessToken");
            if (hash)
                hash.delete("accessToken");
            url.hash = hash && hash.toString() ? `#${hash.toString()}` : "";
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
    }, []);
    return (_jsx(BookingProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/onboarding/connect", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingConnectPage, {}) }) }), _jsx(Route, { path: "/onboarding/availability", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingAvailabilityPage, {}) }) }), _jsx(Route, { path: "/onboarding/event", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingEventPage, {}) }) }), _jsx(Route, { path: "/onboarding/success", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingSuccessPage, {}) }) }), _jsx(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/book/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/public/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
export function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppRoutes, {}) }));
}
