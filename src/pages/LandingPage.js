import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import "./landing/landing.css";
import { LandingNav } from "./landing/LandingNav";
import { LandingHero } from "./landing/LandingHero";
import { LandingHowItWorks } from "./landing/LandingHowItWorks";
import { LandingWorkflow } from "./landing/LandingWorkflow";
import { LandingCoordination } from "./landing/LandingCoordination";
import { LandingIntelligence } from "./landing/LandingIntelligence";
import { LandingIntegrations } from "./landing/LandingIntegrations";
import { LandingTestimonials } from "./landing/LandingTestimonials";
import { LandingAvailability } from "./landing/LandingAvailability";
import { LandingPhilosophy } from "./landing/LandingPhilosophy";
import { LandingCTA } from "./landing/LandingCTA";
import { LandingFooter } from "./landing/LandingFooter";
export function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const handleCreateLink = () => {
        navigate(user ? "/onboarding/event?mode=anonymous&fresh=1" : "/d/create");
    };
    return (_jsx("div", { className: "lp-root", children: _jsxs("div", { className: "lp-page", children: [_jsx(LandingNav, { onCreateLink: handleCreateLink }), _jsxs("main", { children: [_jsx(LandingHero, { onCreateLink: handleCreateLink }), _jsx(LandingHowItWorks, {}), _jsx(LandingWorkflow, {}), _jsx(LandingCoordination, {}), _jsx(LandingIntelligence, {}), _jsx(LandingIntegrations, {}), _jsx(LandingTestimonials, {}), _jsx(LandingAvailability, {}), _jsx(LandingPhilosophy, {}), _jsx(LandingCTA, { onCreateLink: handleCreateLink })] }), _jsx(LandingFooter, {})] }) }));
}
