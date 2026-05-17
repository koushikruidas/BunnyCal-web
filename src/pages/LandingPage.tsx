import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import "./landing/landing.css";
import { LandingNav }           from "./landing/LandingNav";
import { LandingHero }          from "./landing/LandingHero";
import { LandingHowItWorks }    from "./landing/LandingHowItWorks";
import { LandingWorkflow }      from "./landing/LandingWorkflow";
import { LandingCoordination }  from "./landing/LandingCoordination";
import { LandingIntelligence }  from "./landing/LandingIntelligence";
import { LandingIntegrations }  from "./landing/LandingIntegrations";
import { LandingTestimonials }  from "./landing/LandingTestimonials";
import { LandingAvailability }  from "./landing/LandingAvailability";
import { LandingPhilosophy }    from "./landing/LandingPhilosophy";
import { LandingCTA }           from "./landing/LandingCTA";
import { LandingFooter }        from "./landing/LandingFooter";

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateLink = () => {
    navigate(user ? "/onboarding/event" : "/d/create");
  };

  return (
    <div className="lp-root">
      <div className="lp-page">
        <LandingNav onCreateLink={handleCreateLink} />
        <main>
          <LandingHero         onCreateLink={handleCreateLink} />
          <LandingHowItWorks   />
          <LandingWorkflow     />
          <LandingCoordination />
          <LandingIntelligence />
          <LandingIntegrations />
          <LandingTestimonials />
          <LandingAvailability />
          <LandingPhilosophy   />
          <LandingCTA          onCreateLink={handleCreateLink} />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
