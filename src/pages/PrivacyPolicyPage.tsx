import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/state/AuthContext";
import "./landing/landing.css";
import { LandingNav } from "./landing/LandingNav";
import { LandingFooter } from "./landing/LandingFooter";

export function PrivacyPolicyPage() {
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
                <h1 className="lp-h1">Privacy Policy</h1>
                <p className="lp-legal-sub">Last updated: June 2026</p>
              </header>

              <article className="lp-prose">
                <p>
                  Welcome to Bunnycal ("Bunnycal", "we", "our", or "us").
                </p>
                <p>
                  This Privacy Policy explains how Bunnycal collects, uses, and protects
                  your information when you use our website and services at{" "}
                  <a href="https://bunnycal.io" target="_blank" rel="noopener noreferrer">
                    https://bunnycal.io
                  </a>
                  .
                </p>

                <section>
                  <h2 className="lp-h2">Information We Collect</h2>
                  <p>When you use Bunnycal, we may collect:</p>
                  <ul>
                    <li>Your name and email address</li>
                    <li>Account profile information</li>
                    <li>
                      Calendar information from connected providers such as Google Calendar
                      or Microsoft Outlook Calendar
                    </li>
                    <li>Scheduling and availability data</li>
                    <li>Authentication and access tokens required to connect calendar providers</li>
                    <li>
                      Technical information such as browser type, IP address, device
                      information, and usage logs
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="lp-h2">How We Use Information</h2>
                  <p>We use the collected information to:</p>
                  <ul>
                    <li>Provide scheduling and calendar functionality</li>
                    <li>Authenticate users</li>
                    <li>Sync and display connected calendar events</li>
                    <li>Improve the performance and reliability of Bunnycal</li>
                    <li>Respond to support requests</li>
                    <li>Send service-related emails and notifications</li>
                  </ul>
                </section>

                <section>
                  <h2 className="lp-h2">Calendar Data Usage</h2>
                  <p>
                    Bunnycal accesses calendar data solely to provide scheduling and
                    availability features requested by the user.
                  </p>
                  <p>
                    We do not sell calendar data or personal information to third parties.
                  </p>
                  <p>We do not use calendar data for advertising purposes.</p>
                </section>

                <section>
                  <h2 className="lp-h2">Third-Party Services</h2>
                  <p>Bunnycal may integrate with third-party providers including:</p>
                  <ul>
                    <li>Google</li>
                    <li>Microsoft</li>
                    <li>Zoom</li>
                    <li>Amazon Web Services (AWS)</li>
                  </ul>
                  <p>
                    These services may process data as required to provide authentication,
                    hosting, email delivery, and calendar integrations.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Data Storage and Security</h2>
                  <p>
                    We take reasonable measures to protect user information and secure
                    connected accounts. However, no internet-based service can guarantee
                    complete security.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Data Retention</h2>
                  <p>
                    We retain user information only for as long as necessary to provide the
                    service and comply with legal obligations.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Account Deletion</h2>
                  <p>Users may request account or data deletion by contacting:</p>
                  <p>
                    <a href="mailto:support@bunnycal.io">support@bunnycal.io</a>
                  </p>
                  <p>
                    We will make reasonable efforts to delete user data within a reasonable
                    timeframe.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Children's Privacy</h2>
                  <p>Bunnycal is not intended for children under the age of 13.</p>
                </section>

                <section>
                  <h2 className="lp-h2">Changes to This Policy</h2>
                  <p>
                    We may update this Privacy Policy from time to time. Updated versions
                    will be posted on this page.
                  </p>
                </section>

                <section>
                  <h2 className="lp-h2">Contact</h2>
                  <p>
                    If you have any questions about this Privacy Policy, please contact:
                  </p>
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
