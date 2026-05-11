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

function PublicBookingRoute() {
  const { username, eventTypeSlug } = useParams<{ username: string; eventTypeSlug: string }>();
  if (!username || !eventTypeSlug) return <LandingPage />;
  return <BookingPage username={username} eventTypeSlug={eventTypeSlug} />;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { user, isHydratingAuth, authInitialized } = useAuth();

  if (isHydratingAuth && !authInitialized) {
    routeDebug("protected route waiting for hydration", {
      pathname: location.pathname,
      isHydratingAuth,
      authInitialized,
      hasUser: Boolean(user),
    });
    return <div className="min-h-screen grid place-items-center bg-[#f8faff] text-[#6b7280]">Checking session...</div>;
  }

  if (authInitialized && !user) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    routeDebug("protected route redirecting to sign-in", { pathname: location.pathname, target, authInitialized });
    return <Navigate to={buildSignInUrl({ mode: "PROTECTED_ROUTE", returnTo: target })} replace />;
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
      if (hash) hash.delete("accessToken");
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
    if (isHydratingAuth || !authInitialized || !user) return;
    const pending = peekAuthIntent();
    if (!pending) return;
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
    if (!onAuthLanding) return;

    const target = resolvePostLoginPath(consumeAuthIntent());
    if (target !== current) {
      routeDebug("navigating to pending auth intent", { current, target });
      navigate(target, { replace: true });
    }
  }, [authInitialized, isHydratingAuth, location.pathname, navigate, user]);

  return (
    <IntegrationProvider>
      <OnboardingProvider>
        <BookingProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<LandingPage />} />
        <Route path="/about" element={<LandingPage />} />
        <Route path="/sign-in" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/sign-in?mode=APP_LOGIN" replace />} />
        <Route path="/onboarding/connect" element={<ProtectedRoute><OnboardingConnectPage /></ProtectedRoute>} />
        <Route path="/onboarding/availability" element={<ProtectedRoute><OnboardingAvailabilityPage /></ProtectedRoute>} />
        <Route path="/onboarding/event" element={<ProtectedRoute><OnboardingEventPage /></ProtectedRoute>} />
        <Route path="/onboarding/success" element={<ProtectedRoute><OnboardingSuccessPage /></ProtectedRoute>} />
        <Route path="/dashboard/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><Navigate to="/dashboard/settings" replace /></ProtectedRoute>} />
        <Route path="/availability" element={<ProtectedRoute><Navigate to="/dashboard/availability" replace /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/integrations" element={<ProtectedRoute><Navigate to="/dashboard/integrations" replace /></ProtectedRoute>} />
        <Route path="/book/:username/:eventTypeSlug" element={<PublicBookingRoute />} />
        <Route path="/public/:username/:eventTypeSlug" element={<PublicBookingRoute />} />
        <Route path="/:username/:eventTypeSlug" element={<PublicBookingRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </BookingProvider>
      </OnboardingProvider>
    </IntegrationProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
