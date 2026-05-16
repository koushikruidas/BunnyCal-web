import type { ReactNode } from "react";
import { SplitPane, Stack, Inline } from "@/ui/layout";
import { Button } from "@/ui/controls";
import clsx from "@/lib/clsx";

/**
 * Shared wizard scaffold for the authenticated onboarding flow and the
 * anonymous draft-onboarding flow. Per `docs/architecture/refactor-recommendations.md`
 * §C1: the two flows share UI layout (stepper aside + main panel + footer)
 * but **must not** share state — each flow wires its own provider's step
 * state into the props below.
 *
 * StepShell is presentational only:
 *   - Renders the 2-column responsive layout via SplitPane (aside hidden < md)
 *   - Renders the stepper aside, eyebrow + title, optional error, children,
 *     and Back / Next | Publish footer
 *   - Does not own step state, navigation, or API calls — the consuming page
 *     drives those and passes handlers down
 */

export interface StepShellProps {
  /** Step labels, top to bottom. The current implementation expects 5. */
  steps: string[];
  /** Index of the active step (0-based). */
  currentStep: number;
  /** Predicate used to mark sidebar items as "complete" (emerald tint). */
  stepComplete: (index: number) => boolean;
  /** Invoked when the user clicks a stepper item. The consumer is
   * responsible for syncing this with `?step=N` URL state. */
  onStepChange: (index: number) => void;

  /** Optional inline error rendered between the title and content. */
  error?: string | null;

  /** Back-button handler. Disabled when `currentStep === 0` or publishing. */
  onBack: () => void;
  /** Next-button handler. Shown when `currentStep < steps.length - 1`. */
  onNext: () => void;
  /** Publish-button handler. Shown on the last step. */
  onPublish: () => void;
  /** Disables Back and shows "Publishing..." on the publish button. */
  publishing: boolean;
  /** Label for the publish button when idle. Defaults to "Publish event". */
  publishLabel?: string;

  /** Step content. Each step block is responsible for its own internal
   * spacing (e.g. `mt-6 space-y-4` on the outermost div), matching the
   * pre-migration markup. */
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
  publishLabel = "Publish event",
  children,
}: StepShellProps) {
  const isLast = currentStep === steps.length - 1;

  return (
    <SplitPane
      aside={
        <Stepper
          steps={steps}
          currentStep={currentStep}
          stepComplete={stepComplete}
          onStepChange={onStepChange}
        />
      }
      asideWidth="default"
      gap={5}
    >
      <div className="rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Step {currentStep + 1} of {steps.length}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">{steps[currentStep]}</h1>
        {error && <p className="mt-3 text-sm text-[#dc2626]">{error}</p>}
        {children}
        <Inline gap={3} align="center" justify="between" className="mt-8">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={currentStep === 0 || publishing}
          >
            Back
          </Button>
          {isLast ? (
            <Button
              variant="primary"
              onClick={onPublish}
              disabled={publishing}
            >
              {publishing ? "Publishing..." : publishLabel}
            </Button>
          ) : (
            <Button variant="primary" onClick={onNext}>
              Next
            </Button>
          )}
        </Inline>
      </div>
    </SplitPane>
  );
}

interface StepperProps {
  steps: string[];
  currentStep: number;
  stepComplete: (index: number) => boolean;
  onStepChange: (index: number) => void;
}

function Stepper({ steps, currentStep, stepComplete, onStepChange }: StepperProps) {
  return (
    <div className="rounded-3xl border border-[#dbe4f8] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Onboarding</p>
      <Stack as="ol" gap={2} className="mt-4 text-sm">
        {steps.map((label, i) => {
          const isActive = currentStep === i;
          const isComplete = stepComplete(i);
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={isActive ? "step" : undefined}
                className={clsx(
                  "w-full rounded-xl border px-3 py-2 text-left",
                  isActive
                    ? "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-[#e5e7eb] text-[#6b7280]",
                )}
              >
                {i + 1}. {label}
              </button>
            </li>
          );
        })}
      </Stack>
    </div>
  );
}
