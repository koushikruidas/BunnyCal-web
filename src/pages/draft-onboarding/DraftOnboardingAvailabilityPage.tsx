import { Navigate } from "react-router-dom";

export function DraftOnboardingAvailabilityPage() {
  return <Navigate to="/d/onboarding/event?step=3" replace />;
}
