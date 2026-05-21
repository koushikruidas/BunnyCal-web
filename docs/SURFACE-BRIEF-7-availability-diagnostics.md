# SURFACE BRIEF 7
## Availability Diagnostics

### 1. Surface Purpose
- Fundamental purpose: explain why availability outcomes are degraded and guide safe recovery.
- Primary user intent: answer “why are slots not appearing as expected, and how do I fix it?”
- Operational role: exception analysis and remediation guidance for availability confidence.
- Emotional role: reduce uncertainty without creating technical panic.

### 2. User Mental Model
- User framing: “This is a troubleshooting guide for scheduling outcomes, not a telemetry console.”
- Reinforced concepts: user-impacted symptom, likely cause, recommended action, recovery status.
- Hidden concepts: orchestration graph internals, low-level sync event streams, provider API traces.
- Abstraction rule: symptom-to-action narrative before diagnostic internals.

### 3. Emotional Goal
- Target feel: reassuring, precise, non-judgmental.
- Reinforced state: “I can recover availability safely with clear guidance.”
- Avoid: alarmist incident posture, dense technical panic walls, blame-oriented messaging.

### 4. Information Hierarchy
- Primary information: current availability issue, impacted scope, recommended first action.
- Secondary information: likely cause categories, confidence level, recovery progress.
- Contextual information: related surfaces affected and linked remediation paths.
- Hidden/advanced information: deep trace details, provider-specific error codes, historical incident logs.
- Visibility rule: always anchor diagnostics to user-facing scheduling impact.

### 5. Surface Topology
- Layout hierarchy: issue summary -> guided remediation steps -> contextual cause detail -> advanced diagnostics.
- Grouping strategy: by symptom severity and recovery pathway, not raw subsystem.
- Section rhythm: “what is wrong” -> “what to do now” -> “why this happened.”
- Navigation relationship: contextual routes to availability sources, integrations, and accounts.
- Composition philosophy: guided troubleshooting flow over free-form log exploration.

### 6. Operational Trust Visibility
- Trust visibility: explicit confidence statement on issue scope and recovery status.
- Degraded states: framed as impact windows and affected booking reliability.
- Stale/recovery states: progress indicators for retry/relink/revalidation.
- Escalation thresholds: inline hints for minor drift -> step-level warning -> hard interrupt only for booking safety risk.
- Interruption behavior: diagnostics should support recovery, not block unrelated workflows.

### 7. Interaction Choreography
- Low-energy interactions: run checks, apply suggested fixes, refresh diagnosis.
- Escalation interactions: confirm high-impact remediation only.
- Progressive disclosure behavior: advanced technical traces hidden under explicit “technical details.”
- Expansion/collapse behavior: reveal one cause cluster at a time to avoid overload.
- Interruption hierarchy: issue badge -> guided warning step -> blocking notice only when necessary.
- Recovery patterns: short remediation loops with immediate status feedback.

### 8. Progressive Sophistication Model
- Free: core issue explanation and essential guided recovery.
- Pro: richer cause confidence, broader remediation options, deeper context.
- Enterprise: cross-entity diagnostics, governance-aware remediation, expanded audit depth.
- Invariant: same calm troubleshooting narrative and user-first language across tiers.

### 9. Mobile / Responsive Behavior
- Density collapse behavior: issue summary and first recovery action pinned at top.
- Hierarchy simplification: step-by-step flow with one active remediation focus.
- Orchestration simplification: advanced traces hidden by default behind explicit expand.
- Trust visibility prioritization: recovery status and booking impact first.
- Mobile expansion behavior: sequential cards/panels, not stacked telemetry grids.

### 10. AI Generation Constraints
- Must preserve: symptom-first narrative, guided recovery flow, contextual trust visibility.
- Must avoid: persistent log walls, KPI-heavy diagnostics dashboards, provider-first troubleshooting.
- Dangerous mistakes: presenting technical traces before recommended action.
- Orchestration leaks to prevent: exposing orchestration pipeline topology as baseline UI content.

### 11. Generation Validation Checklist
- Does the surface explain impact before causes and internals?
- Is there an immediate, clear first recovery action?
- Are technical details optional and progressively revealed?
- Does trust visibility support confidence rather than fear?
- Would non-technical users know how to proceed?

### 12. Surface-Specific Risks
- Drift risk: diagnostics becomes an operations command center.
- Leakage risk: low-level error vocabulary dominates user flow.
- Trust risk: constant warning emphasis creates diagnostic anxiety.
- Density risk: parallel issue stacks create cognitive overload.
- Tier risk: enterprise diagnostics fragment the base troubleshooting journey.
