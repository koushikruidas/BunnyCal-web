import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
export function OnboardingAvailabilityPage() {
    return _jsx(Navigate, { to: "/onboarding/event?step=3", replace: true });
}
