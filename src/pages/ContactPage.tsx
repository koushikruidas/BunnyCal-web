import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/state/AuthContext";
import "./landing/landing.css";
import { LandingNav } from "./landing/LandingNav";
import { LandingFooter } from "./landing/LandingFooter";

export function ContactPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateLink = () => {
    navigate(user ? "/onboarding/event?mode=anonymous&fresh=1" : "/d/create");
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lp-root">
      <div className="lp-page">
        <LandingNav onCreateLink={handleCreateLink} />
        <main>
          <section className="lp-legal">
            <div className="lp-container">
              <header className="lp-legal-head">
                <h1 className="lp-h1">Contact Us</h1>
                <p className="lp-legal-sub">We'd love to hear from you.</p>
              </header>

              <article className="lp-prose">
                <h2 className="lp-h2" style={{ borderBottom: "none", paddingBottom: 0 }}>
                  Contact Bunnycal
                </h2>
                <p>
                  If you have questions, feedback, support requests, or issues using
                  Bunnycal, feel free to contact us.
                </p>

                <section>
                  <h2 className="lp-h2">Support Email</h2>
                  <p>
                    <a href="mailto:support@bunnycal.io">support@bunnycal.io</a>
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Response Time</h2>
                  <p>We typically respond within 24–48 hours.</p>
                </section>

                <section>
                  <h2 className="lp-h2">What You Can Contact Us About</h2>
                  <ul>
                    <li>Account or login issues</li>
                    <li>Calendar sync problems</li>
                    <li>Scheduling issues</li>
                    <li>Feature requests</li>
                    <li>Bug reports</li>
                    <li>Privacy or security concerns</li>
                    <li>General feedback</li>
                  </ul>
                </section>

                <section>
                  <h2 className="lp-h2">Thank You</h2>
                  <p>Thank you for using Bunnycal.</p>
                  <p>
                    We appreciate your support and feedback as we continue improving the
                    platform.
                  </p>
                </section>
              </article>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
