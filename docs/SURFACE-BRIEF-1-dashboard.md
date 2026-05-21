# SURFACE BRIEF 1
## Dashboard

### 1. Surface Purpose
- Fundamental purpose: coordinate a host’s day-to-day scheduling operations with confidence.
- Primary user intent: understand “what needs attention now” and take the next scheduling action quickly.
- Operational role: summarize meeting flow, scheduling readiness, and immediate actions.
- Emotional role: provide calm command of current commitments, not operational surveillance.

### 2. User Mental Model
- User framing: “This is my scheduling coordination center.”
- Reinforced concepts: upcoming commitments, scheduling readiness, clear next actions.
- Hidden concepts: provider orchestration mechanics, sync job internals, telemetry pipelines.
- Abstraction rule: show outcome confidence (“ready / needs attention”), not backend process state.

### 3. Emotional Goal
- Target feel: calm, focused, reassuring, lightweight.
- Reinforced state: “I am in control of my schedule.”
- Avoid:
  - Operational alarm fatigue.
  - Telemetry-heavy first impression.
  - Enterprise command-center tension.

### 4. Information Hierarchy
- Primary information:
  - Next/near-term meetings.
  - Today/upcoming workload.
  - Top-level scheduling confidence.
- Secondary information:
  - Event type readiness.
  - Integration readiness summary.
- Contextual information:
  - Degraded/stale/conflict notices tied to impacted list/cards.
- Hidden/advanced information:
  - Lifecycle anomalies, sync nuance, recovery diagnostics behind progressive reveal.

### 5. Surface Topology
- Layout hierarchy: summary band -> active coordination list -> contextual trust overlays -> optional deep detail.
- Grouping strategy: intent-based groups (Meetings, Availability, Event Types, Integrations), not infra groups.
- Section rhythm: “what’s next” first, “what to adjust” second, “why confidence changed” third.
- Navigation relationship: dashboard anchors cross-surface actions; never duplicates full configuration surfaces.
- Composition philosophy: compact action cards and scoped lists over dense metric grids.

### 6. Operational Trust Visibility
- Trust visibility style: compact confidence chips/badges near impacted content.
- Degraded states: visible in local context first (meeting row, summary card), not as global takeover.
- Stale/recovery states: phrased by user impact and next step.
- Escalation thresholds:
  - Low: inline confidence hint.
  - Medium: section-level warning + direct remediation action.
  - High: interrupt only if commitment mutation is unsafe.
- Interruption behavior: preserve continuity unless user is blocked from safe action.

### 7. Interaction Choreography
- Low-energy interactions: filter/tab switching, detail peeking, refresh/retry, one-click next actions.
- Escalation interactions: confirm destructive actions only (cancel, disconnect).
- Progressive disclosure: advanced diagnostics collapsed; expanded on explicit user request.
- Expansion/collapse: “details” reveals scoped metadata, not global debug mode.
- Interruption hierarchy: inline note -> section alert -> modal confirmation.
- Recovery patterns: provide immediate remediation path where issue appears.

### 8. Progressive Sophistication Model
- Free: clear coordination summary + basic trust signals + core actions.
- Pro: richer confidence context (more nuanced readiness states), deeper scheduling summaries.
- Enterprise: additional policy/governance overlays and expanded operational context.
- Invariant: same emotional tone, same IA memory, same calm-first behavior.

### 9. Mobile / Responsive Behavior
- Density collapse: prioritize next meeting, today summary, and one primary action cluster.
- Hierarchy simplification: reduce simultaneous sections; use progressive stack.
- Orchestration simplification: confidence summary text replaces detailed status clusters.
- Trust prioritization: one top contextual trust banner per viewport region.
- Expansion behavior: details open in lightweight panels; avoid stacked diagnostic walls.

### 10. AI Generation Constraints
- Must preserve:
  - Capability-first hierarchy.
  - Coordination-first information order.
  - Contextual trust (not global telemetry).
- Must avoid:
  - KPI-heavy operational grids as hero.
  - Persistent multi-provider diagnostic rail.
  - Provider logos dominating primary surface identity.
  - Enterprise-console visual density patterns.

### 11. Generation Validation Checklist
- Does the first screenful answer “what should I do next”?
- Is trust shown near affected items instead of dominating the page?
- Does language describe scheduling impact, not system internals?
- Is there exactly one clear primary directional action in major regions?
- Would a non-technical host feel guided rather than monitored?

### 12. Surface-Specific Risks
- UX drift risk: dashboard becomes telemetry center instead of coordination center.
- Orchestration leakage risk: status terminology drifts into provider/system jargon.
- Enterprise overload risk: governance widgets displace core scheduling tasks.
- Trust risk: too many warnings dilute signal salience.
- Density risk: summary cards multiply into noisy operational collage.

