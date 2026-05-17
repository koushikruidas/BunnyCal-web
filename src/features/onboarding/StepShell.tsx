import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useAuth } from "@/state/AuthContext";
import "../../pages/onboarding/onboarding.css";

const STEP_META = [
  {
    label: "Basic details",
    hint: "Name & description",
    asideTitle: (<>Let's set up your <em>booking link.</em></>),
    blurb: "Just a name and a short note. Invitees will see this when they open your link.",
  },
  {
    label: "Event setup",
    hint: "Location & duration",
    asideTitle: (<>How long, <em>and where shall we meet?</em></>),
    blurb: "Pick where the meeting happens, and the gentle length that suits the conversation.",
  },
  {
    label: "Availability",
    hint: "Weekly rhythm",
    asideTitle: (<>The shape of <em>your week.</em></>),
    blurb: "Quiet mornings, soft afternoons, no Fridays — define the rhythm you actually live by.",
  },
  {
    label: "Integrations",
    hint: "Calendars & Zoom",
    asideTitle: (<>Quietly synced <em>across your calendars.</em></>),
    blurb: "Connect the calendars that hold your real life. BunnyCal reads them, never writes without your nod.",
  },
  {
    label: "Review & publish",
    hint: "Share your link",
    asideTitle: (<>Almost there. <em>Take a calm look.</em></>),
    blurb: "A last gentle look before your link goes live. You can adjust anything later from the dashboard.",
  },
];

export interface StepShellProps {
  steps: string[];
  currentStep: number;
  stepComplete: (index: number) => boolean;
  onStepChange: (index: number) => void;
  error?: string | null;
  onBack: () => void;
  onNext: () => void;
  onPublish: () => void;
  publishing: boolean;
  publishLabel?: string;
  children: ReactNode;
}

export function StepShell({
  steps,
  currentStep,
  stepComplete,
  onStepChange,
  error,
  onBack,
  onNext,
  onPublish,
  publishing,
  publishLabel = "Publish gently",
  children,
}: StepShellProps) {
  const { user } = useAuth();
  const brandHref = user ? "/dashboard" : "/";
  const isLast = currentStep === steps.length - 1;
  const meta = STEP_META[currentStep] ?? STEP_META[0];

  return (
    <div className="onb">
      {/* ── Left aside ── */}
      <aside className="onb-aside">
        <Link to={brandHref} className="onb-brand">
          <div style={{
            width: 45, height: 45, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(150deg, var(--lilac-soft), var(--peach-soft))",
            border: "1px solid var(--border)",
            display: "grid", placeItems: "center",
          }}>
            <BunnyMark size={26} />
          </div>
          <span className="onb-brand-name">
            <BrandWordmark style={{ fontFamily: "var(--sans)", fontWeight: 600 }} />
          </span>
        </Link>

        <div>
          <div className="onb-count">Step {currentStep + 1} of {steps.length}</div>
          <h1 className="onb-title">{meta.asideTitle}</h1>
          <p className="onb-blurb">{meta.blurb}</p>
        </div>

        <ol className="onb-steps">
          {STEP_META.slice(0, steps.length).map((s, i) => {
            const isDone = stepComplete(i) && i !== currentStep;
            const isActive = i === currentStep;
            return (
              <li
                key={s.label}
                className={"onb-step" + (isDone ? " done" : isActive ? " active" : "")}
                onClick={() => isDone && onStepChange(i)}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="marker" aria-hidden="true">
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.4L4.6 9L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <div className="label">{s.label}</div>
                  <div className="hint">{s.hint}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="onb-foot">
          <div className="row">
            <span className="dot"></span>
            Your draft is saved as you go.
          </div>
          <div className="row" style={{ color: "var(--plum-400)", fontSize: "12.5px" }}>
            About three calm minutes.
          </div>
        </div>
      </aside>

      {/* ── Right main ── */}
      <main className="onb-main">
        <div className="onb-body">
          {error && <p className="onb-error">{error}</p>}
          {children}
        </div>

        <footer className="onb-footer">
          <div className="saved">
            <span className="dot"></span>
            Saved · synced just now
          </div>
          <div className="actions">
            {currentStep > 0 && (
              <button
                className="onb-btn onb-btn-secondary onb-btn-sm"
                onClick={onBack}
                disabled={publishing}
              >
                ← Back
              </button>
            )}
            {!isLast ? (
              <button className="onb-btn onb-btn-primary onb-btn-sm" onClick={onNext}>
                Continue
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button
                className="onb-btn onb-btn-primary onb-btn-sm"
                onClick={onPublish}
                disabled={publishing}
              >
                {publishing ? "Publishing…" : publishLabel}
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
