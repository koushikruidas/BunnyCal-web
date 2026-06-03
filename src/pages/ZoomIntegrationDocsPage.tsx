import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { LandingFooter } from "./landing/LandingFooter";
import { LandingNav } from "./landing/LandingNav";
import "./landing/landing.css";

const SUPPORT_EMAIL = "support@bunnycal.io";

function usePageMetadata() {
  useEffect(() => {
    window.scrollTo(0, 0);

    const previousTitle = document.title;
    document.title = "BunnyCal Zoom Integration Documentation";

    const ensureMeta = (name: string, content: string) => {
      let meta = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      const previous = meta?.getAttribute("content") ?? null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
      return () => {
        if (previous === null) {
          meta?.remove();
          return;
        }
        meta.content = previous;
      };
    };

    const ensureCanonical = (href: string) => {
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      const previous = link?.href ?? null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = href;
      return () => {
        if (previous === null) {
          link?.remove();
          return;
        }
        link.href = previous;
      };
    };

    const restoreDescription = ensureMeta(
      "description",
      "Public documentation for BunnyCal Zoom integration setup, usage, removal, and support.",
    );
    const restoreCanonical = ensureCanonical(`${window.location.origin}/docs/zoom`);

    return () => {
      document.title = previousTitle;
      restoreDescription();
      restoreCanonical();
    };
  }, []);
}

function CopyStepsButton({ title, steps }: { title: string; steps: string[] }) {
  const handleCopy = async () => {
    const text = `${title}\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Unable to copy section steps", error);
    }
  };

  return (
    <button type="button" className="lp-doc-copy" onClick={() => void handleCopy()}>
      Copy steps
    </button>
  );
}

function StepList({ steps, title }: { steps: string[]; title: string }) {
  return (
    <div className="lp-doc-steps-card">
      <div className="lp-doc-card-head">
        <h3 className="lp-doc-h3">{title}</h3>
        <CopyStepsButton title={title} steps={steps} />
      </div>
      <ol className="lp-doc-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="lp-doc-step-index">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ZoomIntegrationDocsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  usePageMetadata();

  const handleCreateLink = () => {
    navigate(user ? "/onboarding/event?mode=anonymous&fresh=1" : "/d/create");
  };

  return (
    <div className="lp-root">
      <div className="lp-page">
        <LandingNav onCreateLink={handleCreateLink} />
        <main>
          <section className="lp-legal lp-docs">
            <div className="lp-container">
              <nav className="lp-breadcrumbs" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span>/</span>
                <span>Docs</span>
                <span>/</span>
                <span aria-current="page">Zoom</span>
              </nav>

              <header className="lp-legal-head lp-docs-head">
                <p className="lp-legal-sub">Public integration guide</p>
                <h1 className="lp-h1">BunnyCal Zoom Integration Documentation</h1>
                <p className="lp-docs-sub">
                  Setup, usage, removal, and support details for Zoom as a conferencing provider in BunnyCal.
                </p>
              </header>

              <div className="lp-docs-layout">
                <aside className="lp-docs-nav" aria-label="Section navigation">
                  <a href="#overview">Overview</a>
                  <a href="#adding-the-zoom-integration">Adding the Zoom Integration</a>
                  <a href="#using-the-zoom-integration">Using the Zoom Integration</a>
                  <a href="#removing-the-zoom-integration">Removing the Zoom Integration</a>
                </aside>

                <article className="lp-prose lp-doc-prose">
                  <section id="overview">
                    <h2 className="lp-h2">Overview</h2>
                    <p>
                      BunnyCal allows users to connect their Zoom account and automatically generate Zoom meeting links for scheduled bookings.
                      Zoom is used only as a conferencing provider within the BunnyCal scheduling workflow.
                    </p>
                  </section>

                  <section id="adding-the-zoom-integration">
                    <h2 className="lp-h2">Adding the Zoom Integration</h2>

                    <div className="lp-doc-block">
                      <h3 className="lp-doc-h3">Prerequisites</h3>
                      <ul>
                        <li>A BunnyCal account is required</li>
                        <li>A Zoom account is required</li>
                        <li>A Google Calendar or Microsoft Outlook Calendar account should already be connected for availability and calendar management</li>
                      </ul>
                    </div>

                    <div className="lp-doc-block">
                      <StepList
                        title="Steps to Connect Zoom"
                        steps={[
                          "Log into BunnyCal",
                          "Navigate to Settings → Integrations",
                          "Click “Connect Zoom”",
                          "You will be redirected to the Zoom OAuth authorization screen",
                          "Approve the requested permissions",
                          "After authorization, you will be redirected back to BunnyCal",
                        ]}
                      />
                    </div>

                    <div className="lp-doc-grid">
                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Expected Result</h3>
                        <ul>
                          <li>Your Zoom account will be connected successfully</li>
                          <li>Zoom can now be selected as a conferencing provider during event type creation</li>
                        </ul>
                      </div>

                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Troubleshooting</h3>
                        <ul>
                          <li>Ensure popups are enabled</li>
                          <li>Ensure the correct Zoom account is used</li>
                          <li>Retry authorization if connection fails</li>
                          <li>Disconnect and reconnect integration if needed</li>
                        </ul>
                      </div>
                    </div>

                    <div className="lp-doc-card lp-doc-support">
                      <h3 className="lp-doc-h3">Support Contact</h3>
                      <p>
                        If you need help with the Zoom connection flow, contact{" "}
                        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                      </p>
                    </div>
                  </section>

                  <section id="using-the-zoom-integration">
                    <h2 className="lp-h2">Using the Zoom Integration</h2>

                    <div className="lp-doc-card">
                      <h3 className="lp-doc-h3">Use Case</h3>
                      <p>Google Calendar and Microsoft Outlook Calendar are used for:</p>
                      <ul>
                        <li>Availability calculation</li>
                        <li>Free/busy scheduling</li>
                        <li>Calendar synchronization</li>
                      </ul>
                      <p>Zoom is used only for conferencing link generation.</p>
                    </div>

                    <div className="lp-doc-block">
                      <StepList
                        title="Creating an Event Type with Zoom"
                        steps={[
                          "Navigate to Event Types",
                          "Click “Create Event Type”",
                          "Configure: Event name, Duration, Availability settings",
                          "Select connected calendars for: Availability calculation, Projection calendar synchronization",
                          "In the conferencing section, select Zoom",
                          "Save the event type",
                        ]}
                      />
                    </div>

                    <div className="lp-doc-grid">
                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Booking Flow</h3>
                        <p>When an invitee books a meeting:</p>
                        <ul>
                          <li>BunnyCal automatically creates a Zoom meeting</li>
                          <li>The Zoom joining link is added to: Booking confirmation, Calendar invitations</li>
                        </ul>
                      </div>

                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Supported Features</h3>
                        <ul>
                          <li>Automatic Zoom meeting creation</li>
                          <li>Automatic meeting updates during rescheduling</li>
                          <li>Automatic meeting deletion during cancellation</li>
                          <li>Zoom joining link synchronization</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section id="removing-the-zoom-integration">
                    <h2 className="lp-h2">Removing the Zoom Integration</h2>

                    <div className="lp-doc-grid">
                      <StepList
                        title="Disconnect Zoom from BunnyCal"
                        steps={[
                          "Log into BunnyCal",
                          "Navigate to Settings → Integrations",
                          "Locate Zoom integration",
                          "Click “Disconnect Zoom”",
                        ]}
                      />

                      <StepList
                        title="Revoke Access from Zoom"
                        steps={[
                          "Log into Zoom",
                          "Navigate to: Zoom App Marketplace → Manage → Installed Apps",
                          "Locate BunnyCal",
                          "Click “Remove”",
                        ]}
                      />
                    </div>

                    <div className="lp-doc-grid">
                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Effects of De-Authorization</h3>
                        <ul>
                          <li>BunnyCal will no longer create Zoom meetings</li>
                          <li>Existing Zoom meetings will not be updated</li>
                          <li>Zoom links will no longer be attached to bookings</li>
                        </ul>
                      </div>

                      <div className="lp-doc-card">
                        <h3 className="lp-doc-h3">Data Handling</h3>
                        <ul>
                          <li>Remove stored Zoom OAuth tokens after disconnect</li>
                          <li>Users can reconnect Zoom anytime</li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </article>
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
