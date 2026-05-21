# DOCUMENT-5
## AI Surface Generation Design Context Pack

## 1) Design Context Pack Purpose

### Why this exists
This pack is the persistent generation context for AI-assisted frontend materialization. It ensures future generated surfaces evolve the product without breaking continuity in visual language, interaction tone, and operational calm.

### AI-generation problems it prevents
- Style drift across generated screens.
- Tier fragmentation into “different products.”
- Enterprise dashboard syndrome (telemetry-heavy UI).
- Provider-centric information architecture.
- Overexposure of orchestration internals.
- Settings explosion and configuration-first UX.

### Continuity guarantees it enforces
- Stable emotional identity across all tiers and surfaces.
- Stable topology and composition rhythm across new/updated pages.
- Stable interaction choreography: calm by default, escalation only by need.
- Stable trust communication: impact-first, recoverability-second, technical detail-last.

### Stable frontend qualities
- Human-centered scheduling language.
- Capability-before-configuration hierarchy.
- Progressive disclosure over operational dumping.
- Cohesive product shell and navigation memory.

### Relationship model
- Product philosophy sets the “why” (calm coordination).
- UX choreography sets the “how” (continuity, recoverability, low-interruption flow).
- Surface architecture sets the “where” (layered visibility and bounded density).
- AI materialization executes the “what” (concrete cards/flows/states) under these constraints.

---

## 2) Existing Visual DNA Extraction

### Concise visual-DNA summary
Current frontend expresses a warm, soft, editorial-operational aesthetic: rounded panels, restrained contrast, gentle gradients, clear sectional framing, and calm status badges. Information is grouped into digestible cards with strong heading hierarchy and moderate whitespace.

### Continuity signals to preserve
- **Topology system**: shell + sectional canvas + card clusters; clear side/main separation on desktop.
- **Card philosophy**: cards are contextual containers, not data grids; each card has one primary purpose.
- **Spacing rhythm**: generous vertical rhythm between sections; compact but breathable within cards.
- **Typography hierarchy**: conversational headers with selective emphasis (`<em>`), compact metadata labels, readable body text.
- **Visual density**: medium-low by default; density increases only inside scoped zones (lists, timelines, editors).
- **Interaction energy**: low-energy controls; primary CTA is singular per section; secondary actions stay quiet.
- **Page rhythm**: intro/summary zone → operational zone → recovery/advanced zone.
- **Grouping philosophy**: user intent groups first (Meetings, Availability, Integrations), infrastructure groups second.
- **Operational calm traits**: success/warn/danger states are present but visually restrained.
- **Transition behavior**: no high-motion theatrics; state transitions are functional and low-friction.

### Structural visual rules for generation
- One screen should not present multiple competing “hero” blocks.
- At most one primary alert stripe visible per region by default.
- Keep status indicators compact and adjacent to impacted context.
- Use segmented cards rather than full-page dense tables for core scheduling workflows.

### Emotional continuity rules
- Language and layout should feel supportive, not supervisory.
- Never let monitoring visuals dominate coordination tasks.

---

## 3) Product Emotional Identity

### Required emotional qualities
- Calm
- Trustworthy
- Coordinated
- Lightweight
- Understandable
- Assistive
- Operationally reassuring

### Emotional guardrails
- Always prioritize user confidence over system impressiveness.
- Frame complexity as managed, not urgent.
- Preserve a “quietly in control” tone even during degraded states.

### Emotional anti-patterns
- Alarm-first UI for non-critical states.
- Constant warning saturation.
- Provider/system branding overpowering user tasks.
- “Ops war room” layouts for everyday scheduling work.

### Escalation-emotion hierarchy
1. Inform quietly (normal variance, stale risk low).
2. Advise action (recoverable degradation with user impact).
3. Interrupt intentionally (high-impact failure or blocked workflow).
4. Confirm recovery (return to calm baseline quickly).

---

## 4) Surface Composition Principles

### Composition hierarchy rules
- Intent first: “What the user is trying to do now.”
- Confidence second: “Can this be trusted right now.”
- Mechanics third: “If needed, why and how to recover.”

### Surface balancing principles
- Capability surfaces should present outcomes before controls.
- Configuration controls should remain contextual, not omnipresent.
- Advanced/diagnostic detail must be nested behind progressive disclosure.

### Visual calmness rules
- Limit simultaneous high-salience elements (large badges, alerts, CTA contrast).
- Avoid multi-column dense telemetry blocks in core surfaces.
- Keep scannability via short rows, grouped meta, and clear action edge.

### Orchestration abstraction rules
- Show scheduling effect, not orchestration topology.
- Use user-language entities (“availability sources,” “meeting readiness”) over provider internals.

---

## 5) Interaction Choreography Rules

### Low-energy defaults
- Passive status updates and subtle refresh affordances.
- Explicit user-triggered mutation actions (connect/disconnect/save) with clear pending states.
- Optimistic continuity where safe; fall back to explicit retry only when needed.

### Escalation behavior
- Escalate in-place before modal interruption.
- Use confirmation dialogs for irreversible actions only.
- After escalation, provide immediate “next safe action.”

### Interruption hierarchy
1. Inline hint.
2. Section-level notice.
3. Blocking dialog (destructive/high-risk actions).

### Recovery philosophy
- Recoverability must be visible on the same surface as the issue.
- “Retry / reconnect / continue with limitations” should be explicit options.

### Degraded-state rules
- Degraded does not equal blocked by default.
- Allow continuity where business-safe; annotate confidence level clearly.

### Contextual diagnostics
- Diagnostics appear on-demand, scoped to the impacted object/card.
- No global persistent diagnostics rail in everyday mode.

---

## 6) Operational Trust Materialization Rules

### Trust communication pattern
1. Impact statement.
2. User implication.
3. Recovery path.
4. Optional technical detail.

### State patterns
- **Stale**: “Recent calendar changes may not yet affect availability.”
- **Degraded**: “Availability is currently based on internal scheduling signals.”
- **Reconnect needed**: “Calendar connection needs attention to restore sync confidence.”
- **Lifecycle divergence**: “External calendar event changed; local booking remains visible.”

### Escalation thresholds
- Low: informative badge + optional detail.
- Medium: section-level warning + direct action.
- High: explicit blocking when user action would be unsafe/inconsistent.

### Interruption rules
- Only block when proceeding can produce incorrect commitments or failed mutation guarantees.
- Otherwise, preserve flow and annotate risk.

### Context visibility rules
- Show trust state where decisions are made (slot choice, event publish, meeting action).
- Avoid duplicating the same warning in multiple persistent zones.

### Terminology rule
- Always prefer user-impact language over internal-state language.

---

## 7) Tier Materialization Constraints

### One-product rule
Free/Pro/Enterprise are depth layers inside one UX system, not separate products or navigation trees.

### Invariants across tiers
- Same emotional language.
- Same visual identity.
- Same interaction choreography.
- Same top-level IA memory.

### Tier differentiation model
- **Free**: simpler capability envelope, minimal diagnostics, high abstraction.
- **Pro**: expanded controls and richer trust visibility, still user-intent centered.
- **Enterprise**: deeper governance/operational visibility with strict progressive disclosure.

### Prohibited tier behavior
- No “enterprise-only admin shell.”
- No different visual grammar per tier.
- No fragmented terminology by plan level.

---

## 8) Availability Source UX Rules

### Foundational mental model
Users should understand: “These calendars affect my availability outcomes.”

### Participation clarity rules
- Distinguish source roles in plain language:
  - Blocking source (prevents slots).
  - Visibility source (informational/read context).
- Keep provider names secondary to role semantics.

### Source-health visibility
- Health appears as confidence state per source group, not as provider telemetry panel.
- Show source impact summary before technical source status.

### Degraded participation handling
- Explain what remains reliable.
- Explain what may lag.
- Offer immediate remediation path without forcing workflow exit.

### Orchestration abstraction boundaries
- Do not expose sync mechanics, renewal protocols, or provider job semantics in primary flow.
- Expose advanced mechanics only in optional diagnostics layers.

### Multi-calendar calmness rules
- Collapse complex source sets into role-based clusters by default.
- Expand source detail only on user request.

---

## 9) Dashboard Generation Rules

### Emotional role
Dashboard is a coordination center for scheduling confidence and actions, not an operations console.

### Visibility layering
1. Current coordination state (today/upcoming/health summary).
2. Actionable workflows (meetings, availability, event types).
3. Contextual trust insights.
4. Advanced diagnostics (collapsed by default).

### Provider visibility restraint
- Provider names are supporting metadata, not top-level dashboard architecture.

### Diagnostics restraint
- No persistent telemetry walls.
- Diagnostics appear only when variance is material.

### Action hierarchy
- One primary directional action per major region.
- Secondary actions remain compact and contextual.

### Density rules
- Keep above-the-fold density moderate.
- Dense lists are acceptable only in scoped panels.

### Dashboard anti-patterns
- Grid of system metrics dominating scheduling actions.
- Persistent red/yellow state bands across entire page.
- Provider-logo-heavy hero sections.

---

## 10) Event Type Surface Rules

### Focus model
Event type surfaces represent scheduling intent and host experience promises.

### Visualization priorities
- Meeting experience summary (duration, cadence, availability behavior).
- Confidence summary (readiness/trust state).
- Advanced behavior controls progressively disclosed.

### Provider-awareness abstraction
- Show outcome dependencies (“requires connected conferencing for auto-links”).
- Avoid orchestration wiring language.

### Advanced progression
- Start with core behavior.
- Reveal advanced scheduling controls in bounded sections.
- Keep defaults opinionated and reversible.

### Configuration restraint
- Prevent long ungrouped forms.
- Segment by intent: timing, availability, meeting experience, confidence.

---

## 11) Identity & Linked Account Rules

### Identity UX goals
- Continuity-oriented.
- Trust-oriented.
- Human-oriented.

### Materialization rules
- Identity cards should emphasize user continuity (“you are connected as…”).
- Reauthentication surfaces should be clear, minimal, and forward-progressive.
- Linked accounts should show effect and confidence, not credential mechanics.

### Provider relationship visibility
- Present provider linkage as capability relationship, not account administration tooling.

### Organization-context visibility
- If org context appears, keep it in continuity framing (workspace membership, role clarity), not infra policy framing.

---

## 12) Mobile & Responsive Generation Rules

### Mobile density constraints
- Prioritize single-thread task flow.
- Collapse non-critical metadata and diagnostics into expandable panels.

### Multi-calendar simplification
- Default to summarized source confidence.
- Expand to per-source details only on demand.

### Trust visibility prioritization
- Surface top trust state near primary action.
- Avoid stacked warning cards.

### Orchestration simplification
- No provider-mechanic exposition in primary mobile views.

### Mobile escalation behavior
- Use concise inline notices first.
- Use full-screen interruption only for destructive or blocked commitments.

---

## 13) AI Generation Anti-Patterns

### Prohibited surface archetypes
- Enterprise telemetry dashboards as default host views.
- Provider administration consoles disguised as user scheduling pages.
- Settings-first experiences for routine actions.

### Prohibited UX behaviors
- Persistent multi-alert noise.
- Technical-state-first messaging.
- Excessive modal churn for recoverable issues.
- Fragmented tier-specific navigation trees.

### Prohibited structural patterns
- Dense KPI walls above user tasks.
- Unbounded card sprawl without hierarchy.
- Multi-provider matrix tables as default interaction model.

### Prohibited terminology styles
- “Synchronization projection,” “orchestration participant,” “provider job state” in primary UX copy.
- Internal enum-like language exposed as user-facing labels.

### Anti-pattern examples
- BAD: “Projection synchronization stale; participant delta unresolved.”
- GOOD: “Recent calendar changes may take a moment to appear in availability.”

---

## 14) Surface-Specific Generation Blueprints

### Dashboard
- Purpose: daily coordination and confidence.
- Emotional goal: calm situational awareness.
- Density target: medium-low above fold, medium in scoped lists.
- Trust level: summary always visible; detail progressive.
- Sophistication progression: deeper operational confidence by tier, same IA.
- Escalation: section-level unless action-blocking.
- Mobile: summary + next actions first.
- Expansion: diagnostics panel collapsed by default.

### Availability Sources
- Purpose: explain and manage what affects availability.
- Emotional goal: clarity without orchestration burden.
- Density target: medium with role-based grouping.
- Trust level: per-role confidence + impact.
- Progression: Free summarized, Pro richer controls, Enterprise governance overlays.
- Escalation: source-impact warnings contextual.
- Mobile: grouped summary cards, expandable source detail.
- Expansion: advanced source diagnostics on demand.

### Integrations / Connected Services
- Purpose: maintain capability readiness.
- Emotional goal: controlled, non-technical confidence.
- Density target: low-medium.
- Trust level: capability state and recovery path.
- Progression: deeper status detail by tier, same emotional framing.
- Escalation: connect/reconnect prompts only when impact exists.
- Mobile: single-column service cards with compact status.
- Expansion: advanced metadata hidden under “details.”

### Event Type Editor
- Purpose: define scheduling behavior intent.
- Emotional goal: purposeful and understandable control.
- Density target: medium segmented sections.
- Trust level: readiness badge + affected behaviors.
- Progression: advanced controls reveal progressively.
- Escalation: inline validation first; blocking only on invalid publish.
- Mobile: step-grouped editing with sticky primary action.
- Expansion: advanced behavior toggles nested per section.

### Linked Accounts
- Purpose: maintain identity continuity and connected capability.
- Emotional goal: trust and ownership clarity.
- Density target: low-medium.
- Trust level: account continuity + reauth needs.
- Progression: role/org context grows by tier.
- Escalation: reauth prompts contextual, not global panic.
- Mobile: compact account cards with one primary action each.
- Expansion: security/history details behind secondary views.

### Booking Management
- Purpose: attendee/host booking adjustments with confidence.
- Emotional goal: recoverable and predictable control.
- Density target: medium.
- Trust level: booking state + mutation confidence.
- Progression: richer diagnostics only for advanced tiers.
- Escalation: confirm destructive actions; keep continuity path obvious.
- Mobile: summary-first then action cards.
- Expansion: slot diagnostics optional.

### Availability Diagnostics
- Purpose: explain confidence anomalies only when needed.
- Emotional goal: informative, non-alarming.
- Density target: low by default, medium when expanded.
- Trust level: impact and resolution guidance.
- Progression: Enterprise includes deeper root-cause grouping.
- Escalation: only material anomalies visible by default.
- Mobile: short anomaly stack with expandable detail.
- Expansion: technical details in collapsed advanced area.

### Governance Surfaces (future-safe)
- Purpose: policy and oversight without breaking product coherence.
- Emotional goal: controlled sophistication, not admin-console anxiety.
- Density target: medium; avoid telemetry-heavy layouts.
- Trust level: policy impact summary before policy mechanics.
- Progression: appears as additional depth layer, not separate system.
- Escalation: policy conflicts surfaced contextually near affected workflows.
- Mobile: high-level policy summaries with deferred deep views.
- Expansion: audit/advanced governance views behind explicit navigation depth.

---

## 15) Final Generation Governance Principles

### Every generated surface must preserve
- Operational calm.
- Emotional continuity.
- Trust-oriented hierarchy.
- Progressive sophistication.
- Orchestration abstraction.
- Human-centered scheduling language.
- One-product coherence across tiers.

### Every generated surface must avoid
- Infrastructure anxiety.
- Telemetry overload.
- Provider-first UX hierarchy.
- Orchestration terminology leakage.
- Enterprise fragmentation.
- Configuration bloat and settings sprawl.

### Canonical generation test
Before accepting any AI-generated surface, validate:
1. Does it feel like the same product emotionally?
2. Does it prioritize user coordination over system mechanics?
3. Does trust communication follow impact → recoverability → technical detail?
4. Does tier depth evolve sophistication without identity drift?
5. Would a non-technical host still feel confident and in control?

### Final principle
The frontend must continuously materialize as a **calm scheduling coordination environment** with progressively deeper sophistication, without ever feeling like infrastructure software, telemetry tooling, or provider administration UI.

