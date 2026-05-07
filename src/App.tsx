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
  const { username, eventTypeSlug } = useParams<{ username: string; eventTypeSlug: string }>();
  if (!username || !eventTypeSlug) return <LandingPage />;
  return <BookingPage username={username} eventTypeSlug={eventTypeSlug} />;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f8faff] text-[#6b7280]">Checking session...</div>;
  if (!user) return <Navigate to="/login" replace />;
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
      if (hash) hash.delete("accessToken");
      url.hash = hash && hash.toString() ? `#${hash.toString()}` : "";
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  return (
    <BookingProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding/connect" element={<ProtectedRoute><OnboardingConnectPage /></ProtectedRoute>} />
        <Route path="/onboarding/availability" element={<ProtectedRoute><OnboardingAvailabilityPage /></ProtectedRoute>} />
        <Route path="/onboarding/event" element={<ProtectedRoute><OnboardingEventPage /></ProtectedRoute>} />
        <Route path="/onboarding/success" element={<ProtectedRoute><OnboardingSuccessPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/book/:username/:eventTypeSlug" element={<PublicBookingRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BookingProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
