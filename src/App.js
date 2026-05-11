import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { buildSignInUrl, consumeAuthIntent, getCurrentRelativeUrl, peekAuthIntent, resolvePostLoginPath } from "@/lib/authRedirect";
import { AuthProvider, useAuth } from "@/state/AuthContext";
function PublicBookingRoute() {
    const { username, eventTypeSlug } = useParams();
    if (!username || !eventTypeSlug)
        return _jsx(LandingPage, {});
    return _jsx(BookingPage, { username: username, eventTypeSlug: eventTypeSlug });
}
function ProtectedRoute({ children }) {
    const location = useLocation();
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { className: "min-h-screen grid place-items-center bg-[#f8faff] text-[#6b7280]", children: "Checking session..." });
    if (!user) {
        const target = `${location.pathname}${location.search}${location.hash}`;
        return _jsx(Navigate, { to: buildSignInUrl({ mode: "PROTECTED_ROUTE", returnTo: target }), replace: true });
    }
    return children;
}
function AppRoutes() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useAuth();
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
            const redirected = resolvePostLoginPath(consumeAuthIntent());
            if (redirected !== getCurrentRelativeUrl()) {
                navigate(redirected, { replace: true });
            }
        }
    }, [navigate]);
    useEffect(() => {
        if (loading || !user)
            return;
        const pending = peekAuthIntent();
        if (!pending)
            return;
        const current = getCurrentRelativeUrl();
        const pendingPath = resolvePostLoginPath(pending);
        if (pendingPath === current) {
            consumeAuthIntent();
            return;
        }
        const onAuthLanding = location.pathname === "/sign-in"
            || location.pathname === "/login"
            || location.pathname.startsWith("/dashboard")
            || location.pathname.startsWith("/onboarding/");
        if (!onAuthLanding)
            return;
        const target = resolvePostLoginPath(consumeAuthIntent());
        if (target !== current) {
            navigate(target, { replace: true });
        }
    }, [loading, location.pathname, navigate, user]);
    return (_jsx(BookingProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/pricing", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/sign-in", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(Navigate, { to: "/sign-in?mode=APP_LOGIN", replace: true }) }), _jsx(Route, { path: "/onboarding/connect", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingConnectPage, {}) }) }), _jsx(Route, { path: "/onboarding/availability", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingAvailabilityPage, {}) }) }), _jsx(Route, { path: "/onboarding/event", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingEventPage, {}) }) }), _jsx(Route, { path: "/onboarding/success", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingSuccessPage, {}) }) }), _jsx(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/settings/*", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/settings", replace: true }) }) }), _jsx(Route, { path: "/availability", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/availability", replace: true }) }) }), _jsx(Route, { path: "/bookings", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard", replace: true }) }) }), _jsx(Route, { path: "/integrations", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/integrations", replace: true }) }) }), _jsx(Route, { path: "/book/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/public/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
export function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppRoutes, {}) }));
}
