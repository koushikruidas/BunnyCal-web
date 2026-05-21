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
import { IntegrationProvider } from "@/state/IntegrationContext";
import { OnboardingProvider } from "@/state/OnboardingContext";
import { oauthDebug, routeDebug } from "@/lib/authDebug";
import { DraftCreatePage } from "@/pages/draft-host/DraftCreatePage";
import { DraftManagePage } from "@/pages/draft-host/DraftManagePage";
import { DraftSharePage } from "@/pages/draft-host/DraftSharePage";
import { DraftClaimPage } from "@/pages/draft-host/DraftClaimPage";
import { DraftOnboardingProvider } from "@/modules/draft-onboarding/state";
import { DraftOnboardingEventPage } from "@/pages/draft-onboarding/DraftOnboardingEventPage";
import { DraftOnboardingAvailabilityPage } from "@/pages/draft-onboarding/DraftOnboardingAvailabilityPage";
import { DraftOnboardingConnectPage } from "@/pages/draft-onboarding/DraftOnboardingConnectPage";
import { DraftOnboardingSuccessPage } from "@/pages/draft-onboarding/DraftOnboardingSuccessPage";
import { GuestManageBookingPage } from "@/pages/guest-booking/GuestManageBookingPage";
function PublicBookingRoute() {
    const { username, eventTypeSlug } = useParams();
    if (!username || !eventTypeSlug)
        return _jsx(LandingPage, {});
    return _jsx(BookingPage, { username: username, eventTypeSlug: eventTypeSlug });
}
function ProtectedRoute({ children }) {
    const location = useLocation();
    const { user, isHydratingAuth, authInitialized } = useAuth();
    if (isHydratingAuth && !authInitialized) {
        routeDebug("protected route waiting for hydration", {
            pathname: location.pathname,
            isHydratingAuth,
            authInitialized,
            hasUser: Boolean(user),
        });
        return _jsx("div", { className: "min-h-screen grid place-items-center bg-[#f8faff] text-[#6b7280]", children: "Checking session..." });
    }
    if (authInitialized && !user) {
        const target = `${location.pathname}${location.search}${location.hash}`;
        routeDebug("protected route redirecting to sign-in", { pathname: location.pathname, target, authInitialized });
        return _jsx(Navigate, { to: buildSignInUrl({ mode: "PROTECTED_ROUTE", returnTo: target }), replace: true });
    }
    routeDebug("protected route allowed", { pathname: location.pathname, authInitialized, hasUser: Boolean(user) });
    return children;
}
function AppRoutes() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isHydratingAuth, authInitialized } = useAuth();
    useEffect(() => {
        routeDebug("route state", {
            pathname: location.pathname,
            search: location.search,
            authInitialized,
            isHydratingAuth,
            hasUser: Boolean(user),
        });
    }, [authInitialized, isHydratingAuth, location.pathname, location.search, user]);
    useEffect(() => {
        const url = new URL(window.location.href);
        const hash = url.hash.startsWith("#") ? new URLSearchParams(url.hash.slice(1)) : null;
        const accessToken = url.searchParams.get("accessToken") ?? hash?.get("accessToken");
        if (accessToken) {
            oauthDebug("access token found in callback URL", { pathname: url.pathname });
            setAccessToken(accessToken);
            url.searchParams.delete("accessToken");
            if (hash)
                hash.delete("accessToken");
            url.hash = hash && hash.toString() ? `#${hash.toString()}` : "";
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
            const redirected = resolvePostLoginPath(consumeAuthIntent());
            if (redirected !== getCurrentRelativeUrl()) {
                oauthDebug("redirecting post OAuth token extraction", { redirected });
                navigate(redirected, { replace: true });
            }
        }
    }, [navigate]);
    useEffect(() => {
        if (isHydratingAuth || !authInitialized || !user)
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
            routeDebug("navigating to pending auth intent", { current, target });
            navigate(target, { replace: true });
        }
    }, [authInitialized, isHydratingAuth, location.pathname, navigate, user]);
    return (_jsx(IntegrationProvider, { children: _jsx(OnboardingProvider, { children: _jsx(BookingProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/pricing", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/sign-in", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(Navigate, { to: "/sign-in?mode=APP_LOGIN", replace: true }) }), _jsx(Route, { path: "/onboarding/connect", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingConnectPage, {}) }) }), _jsx(Route, { path: "/onboarding/availability", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingAvailabilityPage, {}) }) }), _jsx(Route, { path: "/onboarding/event", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingEventPage, {}) }) }), _jsx(Route, { path: "/onboarding/success", element: _jsx(ProtectedRoute, { children: _jsx(OnboardingSuccessPage, {}) }) }), _jsx(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/settings/*", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/settings", replace: true }) }) }), _jsx(Route, { path: "/availability", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/availability", replace: true }) }) }), _jsx(Route, { path: "/bookings", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard", replace: true }) }) }), _jsx(Route, { path: "/integrations", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/integrations", replace: true }) }) }), _jsx(Route, { path: "/d/create", element: _jsx(DraftCreatePage, {}) }), _jsx(Route, { path: "/d/onboarding/connect", element: _jsx(DraftOnboardingProvider, { children: _jsx(DraftOnboardingConnectPage, {}) }) }), _jsx(Route, { path: "/d/onboarding/availability", element: _jsx(DraftOnboardingProvider, { children: _jsx(DraftOnboardingAvailabilityPage, {}) }) }), _jsx(Route, { path: "/d/onboarding/event", element: _jsx(DraftOnboardingProvider, { children: _jsx(DraftOnboardingEventPage, {}) }) }), _jsx(Route, { path: "/d/onboarding/success", element: _jsx(DraftOnboardingProvider, { children: _jsx(DraftOnboardingSuccessPage, {}) }) }), _jsx(Route, { path: "/d/:slug/manage", element: _jsx(DraftManagePage, {}) }), _jsx(Route, { path: "/d/:slug/share", element: _jsx(DraftSharePage, {}) }), _jsx(Route, { path: "/d/:slug/claim", element: _jsx(DraftClaimPage, {}) }), _jsx(Route, { path: "/book/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/public/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "/book/:username/:eventTypeSlug/manage/:bookingId", element: _jsx(GuestManageBookingPage, {}) }), _jsx(Route, { path: "/public/:username/:eventTypeSlug/manage/:bookingId", element: _jsx(GuestManageBookingPage, {}) }), _jsx(Route, { path: "/:username/:eventTypeSlug/manage/:bookingId", element: _jsx(GuestManageBookingPage, {}) }), _jsx(Route, { path: "/manage/:bookingId", element: _jsx(GuestManageBookingPage, {}) }), _jsx(Route, { path: "/:username/:eventTypeSlug", element: _jsx(PublicBookingRoute, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }));
}
export function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppRoutes, {}) }));
}
