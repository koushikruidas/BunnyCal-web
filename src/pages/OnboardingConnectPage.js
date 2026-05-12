import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
export function OnboardingConnectPage() {
    return _jsx(Navigate, { to: "/onboarding/event?step=4", replace: true });
}
