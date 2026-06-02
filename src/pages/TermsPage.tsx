import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/state/AuthContext";
import "./landing/landing.css";
import { LandingNav } from "./landing/LandingNav";
import { LandingFooter } from "./landing/LandingFooter";

export function TermsPage() {
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
                <h1 className="lp-h1">Terms and Conditions</h1>
                <p className="lp-legal-sub">Last updated: June 2026</p>
              </header>

              <article className="lp-prose">
                <p>Welcome to Bunnycal.</p>
                <p>
                  By accessing or using{" "}
                  <a href="https://bunnycal.io" target="_blank" rel="noopener noreferrer">
                    https://bunnycal.io
                  </a>{" "}
                  and related services, you agree to these Terms and Conditions.
                </p>

                <section>
                  <h2 className="lp-h2">Use of the Service</h2>
                  <p>Bunnycal provides scheduling and calendar-related functionality.</p>
                  <p>
                    You agree to use the service only for lawful purposes and in compliance
                    with applicable laws and regulations.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">User Accounts</h2>
                  <p>
                    You are responsible for maintaining the security of your account and
                    connected third-party accounts.
                  </p>
                  <p>You are responsible for any activity that occurs under your account.</p>
                </section>

                <section>
                  <h2 className="lp-h2">Third-Party Integrations</h2>
                  <p>Bunnycal may integrate with third-party services such as:</p>
                  <ul>
                    <li>Google</li>
                    <li>Microsoft</li>
                    <li>Zoom</li>
                  </ul>
                  <p>
                    Your use of those services may also be governed by their respective
                    terms and privacy policies.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Service Availability</h2>
                  <p>
                    We may modify, suspend, or discontinue parts of the service at any time
                    without prior notice.
                  </p>
                  <p>
                    We do not guarantee uninterrupted or error-free operation of the
                    service.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Acceptable Use</h2>
                  <p>You agree not to:</p>
                  <ul>
                    <li>Abuse or misuse the platform</li>
                    <li>Attempt unauthorized access to systems or accounts</li>
                    <li>Interfere with service operation</li>
                    <li>Use the service for unlawful or harmful activities</li>
                  </ul>
                </section>

                <section>
                  <h2 className="lp-h2">Intellectual Property</h2>
                  <p>
                    Bunnycal and its related branding, software, and content are owned by
                    Bunnycal unless otherwise stated.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Limitation of Liability</h2>
                  <p>
                    To the maximum extent permitted by law, Bunnycal shall not be liable for
                    indirect, incidental, or consequential damages arising from the use of
                    the service.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Termination</h2>
                  <p>
                    We may suspend or terminate access to the service if these Terms are
                    violated.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Changes to the Terms</h2>
                  <p>
                    We may update these Terms from time to time. Continued use of the service
                    after updates constitutes acceptance of the revised Terms.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Contact</h2>
                  <p>For questions regarding these Terms, contact:</p>
                  <p>
                    <a href="mailto:support@bunnycal.io">support@bunnycal.io</a>
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
