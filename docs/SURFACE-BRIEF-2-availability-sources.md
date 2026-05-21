# SURFACE BRIEF 2
## Availability Sources

### 1. Surface Purpose
- Fundamental purpose: help users understand and control what influences offered availability.
- Primary intent: answer “which sources affect my bookable times, and is this reliable right now?”
- Operational role: source participation clarity and confidence tuning.
- Emotional role: reduce ambiguity without exposing orchestration burden.
- Coordination emphasis: support scheduling decisions, not infrastructure inspection.

### 2. User Mental Model
- User framing: “These are availability influences, not infrastructure integrations.”
- Reinforced concepts: blocking sources, visibility sources, confidence state.
- Hidden concepts: provider orchestration topology, sync mechanics, participant pipelines.
- Abstraction rule: source effect and trust first; technical mechanism optional and deferred.

### 3. Emotional Goal
- Target feel: clear, steady, low-friction.
- Reinforced state: “I understand what affects my schedule.”
- Avoid: multi-calendar overwhelm, provider-first complexity, operational stress.

### 4. Information Hierarchy
- Primary:
  - Source participation role.
  - Overall availability confidence.
  - Immediate actionable issues.
- Secondary:
  - Source-level health and last-known confidence indicators.
- Contextual:
  - Degraded-source impact statements.
- Hidden/advanced:
  - Deep source diagnostics and orchestration detail.
- Visibility rule: impact and next step must always be visible before technical detail.

### 5. Surface Topology
- Layout hierarchy: source summary -> role-based source groups -> contextual confidence notes -> optional diagnostics.
- Grouping strategy: by participation role/impact, not by raw provider taxonomy.
- Section rhythm: “what affects availability” -> “is it healthy” -> “what to do.”
- Navigation relationship: linked from availability and integrations, but remains user-intent surface.
- Composition philosophy: role cards + scoped status rows; avoid matrix-style control planes.

### 6. Operational Trust Visibility
- Trust visibility: confidence state per role cluster and per affected source.
- Degraded states: explicit impact on slot reliability.
- Stale/recovery states: concise “may lag / retry / reconnect” messaging.
- Escalation:
  - Low: inline source indicator.
  - Medium: role-cluster warning with action.
  - High: blocking only when source state invalidates safe scheduling decisions.
- Interruption: prefer local notices over global alerts.

### 7. Interaction Choreography
- Low-energy: expand source detail, quick filter by role, refresh confidence.
- Escalation: reconnect/disconnect confirmations only when destructive or high-impact.
- Progressive disclosure: advanced source diagnostics collapsed by default.
- Expansion/collapse: one source detail pane at a time on narrow layouts.
- Recovery: every degraded state offers immediate, proximal remediation.

### 8. Progressive Sophistication Model
- Free: clear role model + basic confidence.
- Pro: richer source-level participation controls and more nuanced confidence context.
- Enterprise: governance visibility for source policies and organization constraints.
- Invariant: same conceptual model and calm tone across tiers.

### 9. Mobile / Responsive Behavior
- Density collapse: show role summary first, then expandable source cards.
- Hierarchy simplification: one confidence narrative per viewport section.
- Orchestration simplification: no source internals in default mobile view.
- Trust prioritization: source impact statements above secondary metadata.
- Expansion: drill-down panels rather than multi-column source tables.

### 10. AI Generation Constraints
- Must preserve:
  - Role-based participation clarity.
  - Impact-first trust language.
  - Multi-calendar calmness.
  - Context before mechanics in every section.
- Must avoid:
  - Provider-centric hero design.
  - Dense source matrix control walls.
  - Persistent diagnostics panels.
  - Jargon-heavy source state labels.
  - Enterprise-console framing patterns.

### 11. Generation Validation Checklist
- Can users immediately tell which sources influence availability?
- Is source confidence tied to user impact?
- Is provider identity secondary to source role?
- Are advanced details hidden by default but accessible?
- Does the surface reduce confusion instead of increasing source anxiety?

### 12. Surface-Specific Risks
- Mental-model risk: source roles collapse into provider lists.
- Leakage risk: orchestration wording exposed as primary UI language.
- Density risk: multi-source complexity turns into grid overload.
- Trust risk: stale/degraded signals become noisy and omnipresent.
- Tier risk: enterprise controls fragment the core role-based model.
