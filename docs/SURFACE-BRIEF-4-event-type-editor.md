# SURFACE BRIEF 4
## Event Type Editor

### 1. Surface Purpose
- Fundamental purpose: help users define how a booking experience should work for a specific event type.
- Primary user intent: answer “how should this meeting be offered and experienced?”
- Operational role: configure scheduling behavior, constraints, and participant expectations.
- Emotional role: make setup feel guided, safe, and manageable.

### 2. User Mental Model
- User framing: “I am shaping a booking experience, not programming a scheduling engine.”
- Reinforced concepts: event intent, participant experience, offer rules, confidence.
- Hidden concepts: rule resolution engines, provider-specific constraint translation, orchestration internals.
- Abstraction rule: present decisions in user language tied to booking outcomes.

### 3. Emotional Goal
- Target feel: creative but controlled, structured without heaviness.
- Reinforced state: “I can confidently publish this event type.”
- Avoid: form fatigue, settings overload, enterprise-policy intimidation.

### 4. Information Hierarchy
- Primary information: event identity, booking behavior essentials, publish readiness.
- Secondary information: optional enhancements, automation toggles, advanced timing nuance.
- Contextual information: validation warnings tied to impacted sections.
- Hidden/advanced information: conflict diagnostics, edge-case overrides, policy internals.
- Visibility rule: booking impact and readiness always visible before advanced configuration.

### 5. Surface Topology
- Layout hierarchy: event overview -> core behavior sections -> confidence/readiness layer -> advanced options.
- Grouping strategy: by user intent stages (define, schedule, protect, communicate), not system modules.
- Section rhythm: “what this event is” -> “how booking works” -> “what could fail.”
- Navigation relationship: links to availability, integrations, and accounts only when context requires.
- Composition philosophy: staged configuration flow with sectional checkpoints over one long settings wall.

### 6. Operational Trust Visibility
- Trust visibility: readiness indicators embedded per section plus overall publish confidence.
- Degraded states: surfaced as actionable blockers/warnings in the relevant section.
- Stale/recovery states: if dependencies changed, show concise revalidation prompts.
- Escalation thresholds: inline suggestion -> section-level blocker -> publish interrupt if unsafe.
- Interruption behavior: interrupt only when publishing would create unreliable booking behavior.

### 7. Interaction Choreography
- Low-energy interactions: inline edits, toggles, section save/auto-save cues, quick preview access.
- Escalation interactions: confirmation for destructive changes or irreversible participant impact.
- Progressive disclosure behavior: advanced options collapsed behind “refine behavior.”
- Expansion/collapse behavior: open only current configuration cluster to reduce cognitive load.
- Interruption hierarchy: field hint -> section warning -> publish gate.
- Recovery patterns: every blocker includes precise remediation in-place.

### 8. Progressive Sophistication Model
- Free: core event setup with basic readiness and publishing confidence.
- Pro: deeper control over booking nuance and richer conditional behavior.
- Enterprise: policy overlays, compliance/governance constraints, organizational defaults.
- Invariant: same editor structure and emotional clarity regardless of tier.

### 9. Mobile / Responsive Behavior
- Density collapse behavior: present one configuration stage at a time.
- Hierarchy simplification: prioritize event basics and publish readiness at top.
- Orchestration simplification: hide complex dependency explanations by default.
- Trust visibility prioritization: show active blockers before optional enhancements.
- Mobile expansion behavior: staged accordion flow instead of giant stacked settings sheet.

### 10. AI Generation Constraints
- Must preserve: intent-led grouping, staged progression, readiness-centered guidance.
- Must avoid: giant unstructured forms, provider-driven sections, always-open advanced settings.
- Dangerous mistakes: mixing high-risk controls with basic fields without guardrails.
- Orchestration leaks to prevent: exposing internal rule-engine language in primary UI.

### 11. Generation Validation Checklist
- Does the editor feel like booking design rather than backend configuration?
- Are core decisions visible before advanced tuning?
- Is publish confidence clear and section-linked?
- Are interruptions limited to meaningful risk moments?
- Can non-technical users complete setup without operational confusion?

### 12. Surface-Specific Risks
- Drift risk: editor becomes an exhaustive settings console.
- Leakage risk: orchestration/rule internals replace user-facing language.
- Trust risk: too many warnings discourage publishing confidence.
- Density risk: single-page settings sprawl creates decision paralysis.
- Tier risk: advanced enterprise controls fracture baseline interaction flow.
