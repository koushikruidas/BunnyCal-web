# SURFACE BRIEF 5
## Linked Accounts

### 1. Surface Purpose
- Fundamental purpose: let users manage personal and team identities used across scheduling services.
- Primary user intent: answer “which account identity is connected and safe to use?”
- Operational role: account-level ownership, permissions awareness, and reassignment/recovery.
- Emotional role: account confidence without security panic.

### 2. User Mental Model
- User framing: “These are my usable account identities, not raw authentication internals.”
- Reinforced concepts: account ownership, active role, trust status, replace/reconnect actions.
- Hidden concepts: token refresh cycles, credential storage mechanics, provider API semantics.
- Abstraction rule: identity clarity and impact first, internals deferred.

### 3. Emotional Goal
- Target feel: secure, transparent, calm.
- Reinforced state: “I know which account is in use and can fix issues safely.”
- Avoid: credential anxiety, technical alarmism, bureaucratic enterprise friction.

### 4. Information Hierarchy
- Primary information: account identity, active usage context, trust/health state.
- Secondary information: last verified time, role labels, linked surface usage.
- Contextual information: account risk or stale state tied to impacted account row.
- Hidden/advanced information: low-level auth diagnostics, provider debug metadata.
- Visibility rule: show ownership and impact before technical status detail.

### 5. Surface Topology
- Layout hierarchy: identity summary -> linked account list -> contextual risk notices -> advanced diagnostics.
- Grouping strategy: by scheduling usage context and ownership, not provider branding.
- Section rhythm: “who is linked” -> “is it reliable” -> “what action is needed.”
- Navigation relationship: deep links to integrations and affected event/booking contexts.
- Composition philosophy: identity cards with concise trust strips over dense permission grids.

### 6. Operational Trust Visibility
- Trust visibility: account-level confidence markers and lightweight global identity health summary.
- Degraded states: local row warnings with exact remediation path.
- Stale/recovery states: clear “re-verify / relink” guidance with impact statement.
- Escalation thresholds: inline note -> account-level warning -> interruption only if account is unsafe for active operations.
- Interruption behavior: avoid modal disruption unless user action could break live scheduling continuity.

### 7. Interaction Choreography
- Low-energy interactions: view account details, rename labels, refresh verification.
- Escalation interactions: confirm unlink/reassign actions with explicit impact.
- Progressive disclosure behavior: detailed permissions and diagnostics hidden behind “account details.”
- Expansion/collapse behavior: focused detail panel for one account at a time.
- Interruption hierarchy: inline status cue -> account warning banner -> destructive confirmation.
- Recovery patterns: quick relink/reassign flows anchored at affected account.

### 8. Progressive Sophistication Model
- Free: essential linked account visibility and basic reliability state.
- Pro: richer role context, smarter reassignment cues, expanded trust depth.
- Enterprise: organization-level ownership rules, delegated administration, audit visibility.
- Invariant: same calm identity model and interaction grammar across tiers.

### 9. Mobile / Responsive Behavior
- Density collapse behavior: account summary first, expandable account rows second.
- Hierarchy simplification: one active identity focus per viewport segment.
- Orchestration simplification: no auth-internal terminology in default mobile state.
- Trust visibility prioritization: unsafe accounts surfaced above secondary metadata.
- Mobile expansion behavior: progressive detail drawers instead of multi-column permission layouts.

### 10. AI Generation Constraints
- Must preserve: identity clarity, impact-linked trust visibility, low-friction recovery.
- Must avoid: security telemetry dashboards, provider-first hierarchy, permission table overload.
- Dangerous mistakes: foregrounding credential mechanics over user ownership understanding.
- Orchestration leaks to prevent: exposing token/session lifecycle as primary content.

### 11. Generation Validation Checklist
- Is it immediately clear which accounts are linked and active?
- Are trust issues tied to specific accounts with direct recovery actions?
- Is provider identity secondary to ownership and usage context?
- Are advanced security details hidden but accessible?
- Does the surface feel secure without feeling alarming?

### 12. Surface-Specific Risks
- Drift risk: page turns into auth admin console rather than account clarity surface.
- Leakage risk: technical auth status dominates primary messaging.
- Trust risk: over-warning causes false urgency and user hesitation.
- Density risk: permission-heavy layouts overwhelm small teams and solo hosts.
- Tier risk: enterprise controls overshadow simple account maintenance patterns.
