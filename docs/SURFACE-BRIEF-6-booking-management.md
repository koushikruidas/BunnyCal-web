# SURFACE BRIEF 6
## Booking Management

### 1. Surface Purpose
- Fundamental purpose: help users review, adjust, and resolve booked interactions across their schedule.
- Primary user intent: answer “what is booked, what changed, and what needs intervention?”
- Operational role: lifecycle coordination of bookings and participant-facing outcomes.
- Emotional role: stable control over commitments and changes.

### 2. User Mental Model
- User framing: “This is my commitments workspace, not an operations event log.”
- Reinforced concepts: booking state, participant impact, next safe action.
- Hidden concepts: lifecycle event pipelines, provider mutation internals, sync queue mechanics.
- Abstraction rule: commit outcome and participant clarity before backend state detail.

### 3. Emotional Goal
- Target feel: dependable, composed, action-oriented.
- Reinforced state: “I can resolve booking changes without chaos.”
- Avoid: incident-console anxiety, alert fatigue, over-technical lifecycle language.

### 4. Information Hierarchy
- Primary information: booking timeline/list, current state, immediate action options.
- Secondary information: participant details, event context, schedule metadata.
- Contextual information: conflict/degradation notices on impacted bookings.
- Hidden/advanced information: mutation traces, provider sync diagnostics, edge-case audit details.
- Visibility rule: user-facing commitment impact always above system mechanics.

### 5. Surface Topology
- Layout hierarchy: booking overview -> state-grouped bookings -> local trust/recovery cues -> advanced diagnostics.
- Grouping strategy: by lifecycle relevance (upcoming, changed, past-actionable), not provider source.
- Section rhythm: “what is happening” -> “what changed” -> “what should I do.”
- Navigation relationship: connects to event types, availability, and integrations through contextual actions.
- Composition philosophy: actionable booking rows/cards over analytic dashboards.

### 6. Operational Trust Visibility
- Trust visibility: localized confidence markers per booking and per state cluster.
- Degraded states: highlighted where booking reliability may be affected.
- Stale/recovery states: recovery prompts with explicit participant impact.
- Escalation thresholds: inline confidence note -> booking-level warning -> interrupt only for unsafe commit mutations.
- Interruption behavior: preserve browsing/action continuity unless irreversible risk exists.

### 7. Interaction Choreography
- Low-energy interactions: filter by state, quick reschedule/cancel, view booking details.
- Escalation interactions: confirmations for participant-impacting or irreversible actions.
- Progressive disclosure behavior: deep lifecycle diagnostics hidden behind explicit detail view.
- Expansion/collapse behavior: per-booking detail expansion, not persistent diagnostic panes.
- Interruption hierarchy: row status cue -> contextual warning -> confirmation/interruption modal.
- Recovery patterns: every degraded booking offers direct retry/recover path in context.

### 8. Progressive Sophistication Model
- Free: core booking list, basic state confidence, standard lifecycle actions.
- Pro: richer state segmentation, smarter remediation, more nuanced trust context.
- Enterprise: governance controls, org policy overlays, expanded audit/exception visibility.
- Invariant: same booking-centric mental model and emotional tone across tiers.

### 9. Mobile / Responsive Behavior
- Density collapse behavior: prioritize actionable upcoming/changed bookings first.
- Hierarchy simplification: state tabs and one booking detail focus at a time.
- Orchestration simplification: hide technical lifecycle layers in default view.
- Trust visibility prioritization: show participant-impacting issues before metadata.
- Mobile expansion behavior: detail sheets with progressive sections, no telemetry stacks.

### 10. AI Generation Constraints
- Must preserve: booking-first hierarchy, participant-impact framing, contextual trust.
- Must avoid: KPI-heavy lifecycle dashboards, provider-origin sorting as primary structure.
- Dangerous mistakes: promoting diagnostics above actionable booking operations.
- Orchestration leaks to prevent: exposing internal mutation states as default user vocabulary.

### 11. Generation Validation Checklist
- Does the surface prioritize commitment coordination over system monitoring?
- Are booking actions always near the booking state context?
- Is trust signaling informative but not dominant?
- Are advanced diagnostics optional and non-intrusive?
- Would hosts feel in control during schedule changes?

### 12. Surface-Specific Risks
- Drift risk: booking management morphs into operational incident board.
- Leakage risk: provider/system state terminology replaces user-centered language.
- Trust risk: frequent warnings reduce confidence in normal scheduling activity.
- Density risk: too many state dimensions create scanning fatigue.
- Tier risk: enterprise governance layers obscure core lifecycle actions.
