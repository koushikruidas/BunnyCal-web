import { Navigate } from "react-router-dom";

export function OnboardingAvailabilityPage() {
  return <Navigate to="/onboarding/event?step=3" replace />;
}
