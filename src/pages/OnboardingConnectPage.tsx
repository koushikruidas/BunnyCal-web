import { Navigate } from "react-router-dom";

export function OnboardingConnectPage() {
  return <Navigate to="/onboarding/event?step=4" replace />;
}
