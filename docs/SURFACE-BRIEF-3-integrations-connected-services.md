# SURFACE BRIEF 3
## Integrations / Connected Services

### 1. Surface Purpose
- Fundamental purpose: let users connect, monitor, and manage services that enable scheduling workflows.
- Primary user intent: answer “are my connected services ready for booking operations?”
- Operational role: service readiness management and recovery entry points.
- Emotional role: confidence that connections are dependable without technical burden.

### 2. User Mental Model
- User framing: “These are services my scheduling system uses, not systems I must operate.”
- Reinforced concepts: connected capability, readiness state, remediation path.
- Hidden concepts: OAuth internals, token lifecycle details, provider job orchestration.
- Abstraction rule: show service outcome reliability, hide infrastructure mechanics by default.

### 3. Emotional Goal
- Target feel: controlled, clear, low-stress.
- Reinforced state: “I can trust my connected services and fix issues quickly.”
- Avoid: provider complexity theater, authentication anxiety, enterprise-console pressure.

### 4. Information Hierarchy
- Primary information: connection state, scheduling impact, immediate actions.
- Secondary information: last sync confidence, permission scope summary, account label.
- Contextual information: degraded warnings tied to affected service rows.
- Hidden/advanced information: token/error diagnostics, historical incident detail.
- Visibility rule: always show user impact and next step before technical detail.

### 5. Surface Topology
- Layout hierarchy: connection overview -> grouped service cards/list -> contextual warnings -> advanced detail on demand.
- Grouping strategy: by scheduling function (calendar, conferencing, messaging, payments), not provider dominance.
- Section rhythm: “what is connected” -> “what is healthy” -> “what requires action.”
- Navigation relationship: links outward to related surfaces (availability, booking, accounts) as context actions.
- Composition philosophy: capability-centric service modules over dense ops matrices.

### 6. Operational Trust Visibility
- Trust visibility: compact state markers on each service plus a lightweight global readiness summary.
- Degraded states: surfaced where service is listed, with direct remediation.
- Stale/recovery states: plain-language status with retry and reconnect pathways.
- Escalation thresholds: inline hint -> service-level warning -> interrupt only for unsafe scheduling impact.
- Interruption behavior: no full-page takeover unless user cannot safely continue.

### 7. Interaction Choreography
- Low-energy interactions: connect, disconnect, refresh, expand service detail.
- Escalation interactions: confirmation only for destructive actions or account-level disconnect.
- Progressive disclosure behavior: advanced permissions/diagnostics hidden behind explicit “details.”
- Expansion/collapse behavior: expand one service context at a time on dense views.
- Interruption hierarchy: inline row state -> section alert -> modal only when needed.
- Recovery patterns: remediation appears at point-of-failure with one clear next action.

### 8. Progressive Sophistication Model
- Free: core service connection and simple readiness/trust signals.
- Pro: deeper service-level reliability context and richer remediation guidance.
- Enterprise: policy constraints, org-level governance visibility, expanded audit context.
- Invariant: same interaction grammar, calm tone, and capability-first framing across tiers.

### 9. Mobile / Responsive Behavior
- Density collapse behavior: summarize readiness first, service cards second, advanced details hidden.
- Hierarchy simplification: one service focus at a time with progressive drill-down.
- Orchestration simplification: suppress infrastructure detail in default mobile state.
- Trust visibility prioritization: show affected-service impact above metadata.
- Mobile expansion behavior: slide-over/panel detail instead of multicolumn tables.

### 10. AI Generation Constraints
- Must preserve: capability-first grouping, contextual trust, and recoverability paths.
- Must avoid: provider-logo hero emphasis, auth telemetry dashboards, persistent error walls.
- Dangerous mistakes: treating connection internals as primary content.
- Orchestration leaks to prevent: exposing job/token lifecycle as default user workflow.

### 11. Generation Validation Checklist
- Does this surface prioritize scheduling capability over provider mechanics?
- Is trust visibility contextual and action-oriented rather than dominant?
- Are degraded states recoverable from the same context?
- Does tier depth expand sophistication without changing product identity?
- Would a non-technical host understand what to do next?

### 12. Surface-Specific Risks
- Drift risk: integrations page becomes provider directory instead of capability governance.
- Leakage risk: auth/sync internals become primary narrative.
- Trust risk: warnings over-amplify and create service anxiety.
- Density risk: too many services collapse into noisy operational tables.
- Tier risk: enterprise governance crowds out core connection clarity.
