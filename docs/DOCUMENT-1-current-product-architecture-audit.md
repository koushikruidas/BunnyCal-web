# DOCUMENT-1
## Current Product Architecture Audit

## Primary Answer
The frontend currently thinks it is building an **individual host scheduling workspace** that publishes **public booking links**, with **Google Calendar as the primary calendar truth source**, **Zoom as optional conferencing augmentation**, and a **single-user, single-workspace, low-configuration operating model**.  
It optimizes for “publish quickly, stay simple, trust backend reconciliation,” while exposing only selected operational complexity (sync/lifecycle banners) when hidden assumptions break.

---

## SECTION-A — Current Product Mental Model

### Observed conceptual flow
`Sign in (Google OAuth)`  
→ `Hydrate host identity`  
→ `Create one event type through guided onboarding`  
→ `Optionally connect Google/Zoom`  
→ `Publish public link`  
→ `Operate from dashboard (meetings, availability, integrations)`  
→ `Guests self-serve booking + manage token operations`

### Mandatory, optional, implicit, hardcoded
- Mandatory:
  - Authenticated host identity for `/dashboard/*` and primary onboarding.
  - Event type creation before meaningful booking-link utility.
  - Public booking route depends on `username + eventTypeSlug`.
- Optional:
  - Integrations are optional in onboarding copy and progression.
  - Guests can book in degraded/no-provider scenarios if backend returns slots.
- Implicit:
  - One active host workspace at a time (no workspace selector, no org context).
  - Host identity and booking ownership are singular and globally scoped to current user.
  - Public booking lifecycle is linear and finite-state driven (event→slot→details→hold→confirm).
- Hardcoded mentally:
  - Calendar provider emphasis is Google; conferencing emphasis is Zoom.
  - Legacy/provider expansion exists in types/capabilities, but core host UX still foregrounds Google+Zoom pair.
  - Dashboard framing is “Host workspace,” not “team,” “org,” or “multi-tenant environment.”

### Provider hierarchy assumptions
- Calendar is treated as scheduling substrate; conferencing is secondary decoration on confirmed bookings.
- Google calendar status influences multiple surfaces:
  - Onboarding location gating (`GOOGLE_MEET` option disabled if Google disconnected).
  - Integrations health summaries.
  - Sync badge semantics in meetings.
- Zoom is treated as optional external link generator, not core availability authority.

### Ownership, identity, account assumptions
- Identity model: one authenticated principal controls one workspace.
- Account model: no explicit separation between personal account and workspace account.
- Booking management model:
  - Host operations are authenticated.
  - Guest operations are tokenized (`manageToken`) and route/query-driven.
- OAuth return intent system assumes redirection continuity and browser-local sessionStorage continuity.

### Architectural implications
- Product semantics are “solo operator scheduling cockpit,” not collaborative calendar infrastructure.
- Cross-provider abstractions exist but are partially UX-materialized, creating a split between conceptual flexibility and operational defaulting.

### Scaling risks
- Multi-workspace, delegated admin, or team-hosted event models face conceptual mismatch.
- Provider-neutral expansion will collide with Google/Zoom-biased microcopy, gating logic, and status narratives.

---

## SECTION-B — Current Product Domains

### 1) Auth Domain
- Responsibility in frontend: route protection, session hydration, unauthorized interception, post-auth intent restoration.
- Framing: auth is global shell precondition for host area; public booking bypasses it.
- Boundary blur:
  - Auth domain also handles timezone sync side effects (`updateMyTimezone`), which is profile/locale behavior, not pure auth.
- Implication:
  - Auth context becomes identity+profile reconciler.
- Risk:
  - Adding richer profile/workspace boundary could overburden auth lifecycle.

### 2) Onboarding Domain (Authenticated Host)
- Responsibility: event blueprint capture, weekly rhythm, overrides, integration enablement, publish trigger.
- Framing: onboarding is effectively a “new event type wizard,” not account setup.
- Boundary blur:
  - Writes availability rules (global-ish scheduling primitives) during event onboarding.
  - Integration step governs capabilities used by event location choices.
- Implication:
  - Domain conflates per-event and workspace-level scheduling concepts.
- Risk:
  - Multiple event archetypes with divergent policies could strain this blended model.

### 3) Dashboard Operations Domain
- Responsibility: runtime command center for meetings/availability/event types/integrations/settings.
- Framing: workspace cockpit with lightweight observability.
- Boundary blur:
  - Meetings view contains integration lifecycle diagnostics.
  - Availability view mixes policy editing, rendered live meetings, and synthetic insights.
- Implication:
  - Domain centralizes operations at cost of strict bounded contexts.
- Risk:
  - Enterprise-level operational detail may outgrow this blended panel model.

### 4) Integrations Domain
- Responsibility: provider status retrieval, connect/disconnect orchestration, caching, capability exposure.
- Framing: integrations as optional enhancement but operationally critical for trust.
- Boundary blur:
  - OAuth pending recovery and cross-route redirection logic embedded here.
- Implication:
  - Integrations context is part provider registry, part navigation recovery layer.
- Risk:
  - Provider proliferation increases complexity in a context already mixing transport, UX state, and redirect semantics.

### 5) Public Booking Domain
- Responsibility: guest booking state machine, slot discovery, hold/confirm/cancel/reschedule.
- Framing: deterministic transactional flow with confidence messaging (“held,” “re-verify,” “safe expiry”).
- Boundary blur:
  - Booking flow includes optional guest sign-in prompt for continuity, blending anonymous/public with identity onboarding.
- Implication:
  - Guest UX is transactional-first, account-optional.
- Risk:
  - Advanced guest scenarios (multiple attendees, pooled hosts, policy branching) are not modeled.

### 6) Guest Manage Domain
- Responsibility: token-resolved booking retrieval and mutation (cancel/reschedule).
- Framing: self-service post-booking control plane.
- Boundary blur:
  - Relies on query params + local token persistence + route aliases, mixing security transport and UX convenience.
- Implication:
  - Token ergonomics prioritized over strict single-entry canonicality.
- Risk:
  - Token lifecycle/rotation semantics are frontend-fragile if backend contract changes.

### 7) Draft-Host Parallel Domain
- Responsibility: no-auth draft scheduling link creation/management with local token persistence.
- Framing: lightweight parallel product track for pre-claim or unauthenticated host creation.
- Boundary blur:
  - Reuses integration context and onboarding shell concepts while using distinct API/token model.
- Implication:
  - Two product minds coexist: authenticated workspace vs draft-host bootstrap flow.
- Risk:
  - Divergent assumptions can produce migration friction when unifying host models.

### Missing/under-modeled domains
- No explicit workspace/team membership domain.
- No explicit policy/governance domain (permissions, approvals, audit control).
- No explicit diagnostics/incident domain despite surfacing lifecycle anomalies.

---

## SECTION-C — Current Navigation Philosophy

### Why navigation is shaped this way
- Navigation encodes a **host operations hierarchy**:
  - Meetings first (default `/dashboard`) = daily operational urgency.
  - Availability second = supply control.
  - Event Types = offer configuration.
  - Integrations = infrastructure dependency management.
  - Settings = low-frequency global control.

### Product priorities inferred
- Immediate host awareness of upcoming meetings is top priority.
- Configuration is progressive and secondary to day-to-day execution.
- Integrations are treated as enabling infrastructure, not first-run hard gate.

### User-journey assumptions
- User returns frequently for operations, not only initial setup.
- Primary loop is: monitor meetings → adjust availability → refine templates → occasionally touch integrations.
- Separate onboarding route implies “creation flow” distinct from “operations flow.”

### Mental sequencing assumptions
- Public booking path is route-centric and permalink-based.
- Authenticated host path is shell-centric and workspace-based.
- Legacy aliases (`/settings`, `/availability`, `/integrations`) redirect into dashboard subsections, reinforcing single-shell worldview.

### Discoverability and hidden complexity strategy
- Discoverability: major domains exposed in sidebar; advanced states appear inline via badges/banners/dialogs.
- Hidden complexity: provider-specific and lifecycle edge cases mostly collapsed into status labels and warnings, not dedicated troubleshooting IA.

### Architectural implications
- Navigation strongly reinforces singleton workspace mental model.
- Domain expansion (multi-workspace, role-based sub-areas) has no current IA scaffolding.

### Scaling risks
- As operational complexity grows, single-layer sidebar may force overloaded pages rather than bounded subflows.

---

## SECTION-D — Current State Architecture

### Global state assumptions
- `AuthContext`: single user session truth, hydration lifecycle, unauthorized redirect policy.
- `IntegrationContext`: provider-aware status maps + capabilities + cached state; optimistic normalization for backend shape variance.
- `OnboardingContext`: session-scoped wizard draft keyed by user id, defaulting to pre-opinionated event template.
- `BookingContext` + state machine: transaction-grade public booking progression with recoverable redirect persistence.

### Singleton assumptions
- One current user, one workspace surface, one shared integration state graph.
- One active onboarding draft per user per browser session.
- One current booking transaction per route context.

### Hardcoded relationships
- Calendar/conferencing split is structural in context and UI.
- Google/Zoom pathway gets explicit first-class helpers and presentation affordances.
- Legacy fallback behavior infers kind/status heuristically when provider metadata is incomplete.

### Backend trust assumptions
- Frontend trusts backend to reconcile slot validity at hold/confirm boundaries.
- Frontend trusts backend lifecycle/status enums and maps unknown values into coarse UX buckets.
- Frontend tolerates schema drift with coercion (`status/state/connectionStatus`, mixed `available/isAvailable`) instead of strict validation failure.

### Synchronization assumptions
- Polling + focus/visibility refresh are primary consistency mechanisms.
- Short-lived local/session caches bridge OAuth and transient disconnects.
- “Staleness” is represented but not deeply inspectable by user.

### Fallback and resilience behavior
- Public slots fetch preserves prior data on error but blocks progression logic if selection invalidates.
- Integration context falls back from provider-aware endpoint to legacy status endpoint.
- OAuth pending recovery attempts route restoration when provider ignores `returnTo`.

### Architectural implications
- State architecture favors continuity and graceful degradation over strict contract enforcement.
- Contracts are treated as “eventually coherent” rather than immediately deterministic.

### Scaling risks
- Heuristic coercion can hide hard contract breaks in multi-provider expansion.
- Browser-local storage as continuity fabric may fragment across devices/contexts.

---

## SECTION-E — Current UX Philosophy

### Core philosophy inferred
- **Simplicity-first, opinionated defaults, operational calm.**
- UX emphasizes confidence language (“quietly synced,” “held safely,” “no collisions”) over exposing system internals.

### Complexity intentionally hidden
- Provider protocol differences, webhook/push mechanics, reconciliation internals.
- Granular sync pipeline stages.
- Distinction between local booking truth and external provider truth until mismatch surfaces.

### Complexity selectively exposed
- Sync/lifecycle badges and anomaly banners when state is degraded or mismatched.
- Integration connect/disconnect control with limited diagnostics.
- Guest token problems explicitly surfaced when management link state fails.

### Flexibility intentionally sacrificed
- Fixed onboarding defaults:
  - hold duration, min notice, max advance, slot interval coupling, buffers.
- Narrow initial provider storytelling (Google/Zoom dominant).
- Simplified availability model for host comprehension.

### UX debt and abstraction leakage
- Leakage appears in lifecycle mismatch messaging (“external removed, local remains ...”).
- Capability expansion exists in type layer but not fully reflected in intuitive UX pathways.
- Some “configured” actions route back into onboarding instead of dedicated edit surfaces, reflecting wizard-centric legacy.

### Architectural implications
- Product voice and UX aim to shield scheduling-system complexity.
- When shield breaks, user receives symptoms, not full causal model.

### Scaling limitations
- Advanced operators may outgrow opaque diagnostics.
- Enterprise compliance/observability expectations are not native to current UX posture.

---

## SECTION-F — Current Complexity Exposure

### 1) Provider sync complexity
- Handling now:
  - Status normalization into `connected/disconnected/syncing/failed`; periodic refresh.
- Simplification strategy:
  - Collapse many backend/provider states into a small UI taxonomy.
- Risk:
  - False equivalence across providers can obscure materially different failure semantics.

### 2) Multi-calendar conflict complexity
- Handling now:
  - Calendar list can be displayed (Google), selection disabled pending backend endpoint.
- Simplification strategy:
  - Represent future control as read-only presentational hint.
- Risk:
  - Users infer control exists while behavior remains backend-fixed.

### 3) Conferencing ownership complexity
- Handling now:
  - Conferencing provider chosen in event setup; join/action links built from returned URLs.
- Simplification strategy:
  - Location and conferencing conceptually bundled.
- Risk:
  - Ownership and fallback behavior unclear when conferencing provider disconnects post-booking.

### 4) Sync failure and stale data complexity
- Handling now:
  - Slot statuses (`SYNC_IN_PROGRESS`, `STALE`, `NOT_CONNECTED`) mapped to empty states/warnings.
- Simplification strategy:
  - User messaging avoids deep causal diagnostics.
- Risk:
  - Operational decision-making under degraded states remains guess-driven.

### 5) Timezone normalization complexity
- Handling now:
  - Browser timezone auto-synced to backend; UI displays local/browser zones in multiple places.
- Simplification strategy:
  - Prefer “current browser zone is truth for display.”
- Risk:
  - Host/workspace timezone intent can be silently overridden by client environment changes.

### 6) Availability merging complexity (rules + overrides + live meetings)
- Handling now:
  - Rules and overrides edited in frontend; live meetings overlay rendered.
- Simplification strategy:
  - Visual rhythm metaphor with limited conflict explanation.
- Risk:
  - Users may conflate rendered overlay with authoritative scheduling policy computation.

### 7) Attendee/host identity ambiguity in public flows
- Handling now:
  - Optional guest sign-in enrichment layered atop public transaction flow.
- Simplification strategy:
  - Treat identity as convenience enhancement.
- Risk:
  - Boundaries between authenticated guest memory and anonymous token flows are implicit.

### 8) Disconnected and partial integration states
- Handling now:
  - “Proceed without integrations” is explicitly allowed; degraded flags and warnings appear.
- Simplification strategy:
  - Preserve flow momentum over strict prerequisites.
- Risk:
  - Product promise (“never collide”) depends on conditions users may not fully grasp.

### 9) External lifecycle divergence complexity
- Handling now:
  - Lifecycle states mapped to labels; mismatch warnings logged/rendered.
- Simplification strategy:
  - Keep primary booking status while showing external anomalies as side-channel metadata.
- Risk:
  - Dual truth model (local vs provider) introduces semantic ambiguity for cancellation/finality.

### 10) OAuth return continuity complexity
- Handling now:
  - Auth/integration intents persisted in session storage; post-return path resolution.
- Simplification strategy:
  - Browser-local continuity mechanisms hide redirect intricacies.
- Risk:
  - Multi-tab/device transitions can break intent restoration assumptions.

---

## SECTION-G — Current Backend/Frontend Coupling Assumptions

### Hidden API assumptions
- Endpoint shape flexibility is assumed:
  - wrapped/unwrapped responses,
  - provider map envelopes vs flat maps,
  - alternate status field names,
  - duplicate boolean semantics (`available` vs `isAvailable`).
- Frontend assumes backend may drift and compensates client-side rather than failing fast.

### Frontend-derived heuristics
- Provider kind inference from map presence for legacy disconnect helper.
- Status interpretation via string patterning (`includes("ERROR")`, enum aliasing).
- Lifecycle inference from multiple optional flags (`actionRequired`, `reconcileSuppressed`, lifecycle state token).

### Coupling tightness
- High coupling in booking transaction semantics:
  - hold/confirm/cancel/reschedule endpoints and token/idempotency behavior directly drive state machine.
- High coupling in integration state semantics:
  - UX badges and control availability depend on backend-provided status/capability flags.
- Moderate coupling in auth redirect semantics:
  - Frontend relies on backend OAuth callback patterns but has local recovery scaffolding.

### Fragile contracts
- Draft host creation parsing is defensive and multi-path, indicating unstable/variable response contracts.
- Guest manage experience depends on token propagation conventions in links and query parameters.
- Meetings lifecycle UX depends on provider metadata fields that may not be consistently populated.

### Resilience gaps
- Unknown states are tolerated, but often translated to generic “pending/disconnected/warn,” reducing diagnostic precision.
- Some user actions are enabled/disabled by inferred status rather than explicit backend capability contract on each action surface.

### Migration risks (current-state)
- Provider abstraction exists at type/context layer but UI semantics remain partially provider-specific.
- Contract normalization logic in frontend could mask backend inconsistencies during migration, delaying detection of systemic issues.
- Parallel draft-host and authenticated-host tracks depend on different trust/token models; convergence may expose latent assumption conflicts.

---

## Consolidated Product-Mind Statement
Today’s frontend encodes a product mind of:  
**“A calm, single-host scheduling workspace that publishes reusable public booking links, optionally syncs with Google Calendar and Zoom, prioritizes frictionless setup and operational simplicity, and trusts backend reconciliation while surfacing only selective diagnostics when external state diverges.”**

