# STEP-5: Frontend Implementation Audit & Production Evolution Plan

## A. Full Frontend Implementation Audit (Pre-Implementation)

### A1) Existing Provider Assumptions (Critical)
1. Google-first auth is hardcoded.
- Evidence: `api.getGoogleOAuthUrl()` in `src/services/api.ts` and direct usage in `src/pages/LoginPage.tsx`, `src/pages/DetailsView.tsx`.
- Risk: violates `/auth/providers` + `/auth/link/{provider}` contract-first onboarding/login model.

2. Integration provider unions are constrained.
- Evidence: `CalendarProviderId = "google"`, `ConferencingProviderId = "zoom"` in `src/state/IntegrationContext.tsx`.
- Risk: blocks future providers and creates provider-branching inside UI code.

3. Dashboard integrations UI is provider-specific (Google/Zoom labels and tiles).
- Evidence: `src/pages/DashboardPage.tsx` integration section.
- Risk: provider-directory drift, not capability-first orchestration.

4. Onboarding event setup still carries explicit Google/Zoom behavior.
- Evidence: `src/pages/OnboardingEventPage.tsx`, `src/state/OnboardingContext.tsx` defaults to `GOOGLE_MEET`.
- Risk: provider-coupled onboarding logic and copy.

### A2) Current Availability Architecture
1. Host-facing availability sources surface is not implemented as a dedicated production route.
- Evidence: current sections are `meetings`, `availability`, `event-types`, `integrations`, `settings` in `src/pages/DashboardPage.tsx`.
- Risk: cannot map structural/high-fidelity topology to scalable surface modules.

2. Public availability polling is status-string based and partially local-behavior-driven.
- Evidence: `useAvailability` interval depends on `CALENDAR_SYNC_IN_PROGRESS` in `src/hooks/useAvailability.ts`.
- Risk: local timing semantics can drift from backend orchestration policy.

### A3) State Management Audit
1. Context state is fragmented by feature and partially legacy.
- Evidence: `AuthContext`, `IntegrationContext`, `OnboardingContext`, `BookingContext`.
- Risk: cross-surface trust semantics and tier behavior can diverge.

2. JS + TS dual files exist across core modules.
- Evidence: parallel `*.js` and `*.tsx`/`*.ts` files in `src/`.
- Risk: behavioral drift and accidental edits in wrong source path.

3. Integration status normalization is defensive but still stringly typed.
- Evidence: `readStatusString`, `normalizeStatus`, `coerceProviderAwareMap` in `src/state/IntegrationContext.tsx`.
- Risk: implicit fallbacks can hide contract mismatch and weaken deterministic UI states.

### A4) Integration Architecture Audit
1. Good baseline: provider-aware status endpoints already consumed.
- Evidence: `/integrations/calendar/status/providers` + `/integrations/conferencing/status` usage in `IntegrationContext`.

2. Gap: capability model not fully driving rendering decisions.
- Evidence: UI still hardcodes provider tiles and connectability (`IntegrationCard` checks google/zoom).

3. Gap: diagnostics/trust model is scattered (meeting actions + dashboard + integrations).
- Evidence: `src/lib/meetingActions.ts`, dashboard inline logic, integration banners.

### A5) Responsive & Density Audit
1. Large monolithic dashboard with mixed surfaces in one file.
- Evidence: `src/pages/DashboardPage.tsx`.
- Risk: mobile collapse consistency and progressive disclosure rules become difficult to enforce.

2. Provider-specific mini-tiles increase density as integrations grow.
- Evidence: integration tiles and logos in dashboard integration area.
- Risk: 20+ calendar scale failure and telemetry-like clutter.

### A6) Tiering Assumptions Audit
1. No explicit tier capability gating layer.
- Evidence: no centralized tier policy resolver used for surface composition.
- Risk: Enterprise depth likely to fork UI identity instead of progressive deepening.

### A7) Diagnostics Handling Audit
1. Lifecycle/sync states are mapped in utility functions but can leak backend language.
- Evidence: `getLifecycleState`, `getSyncState` in `src/lib/meetingActions.ts`.
- Risk: orchestration terminology exposure if reused directly in primary surfaces.

2. Diagnostics governance policy (collapsed by default, curiosity-driven) is not codified as shared primitives.

### A8) Orchestration Leakage Risk Audit Summary
- Highest risk modules:
  1. `DashboardPage` integration and status presentation.
  2. `OnboardingEventPage` provider-coupled options.
  3. `LoginPage` Google-only authentication entry.
  4. `IntegrationCard` provider-hardcoded connectability.

## B. Production Frontend Evolution Strategy (No UI Implementation Yet)

### 1) Frontend Implementation Architecture Plan
Create a surface-based app architecture with contract adapters:
1. `src/domain/contracts/`:
- Swagger-aligned DTO typings, enums, and runtime guards.
2. `src/domain/adapters/`:
- Convert backend payloads to UI-safe, orchestration-abstracted view models.
3. `src/domain/policies/`:
- Tier policy, trust visibility policy, escalation policy.
4. `src/surfaces/`:
- `dashboard`, `availability-sources`, `integrations`, `event-type-editor`, `linked-accounts`, `booking-management`, `availability-diagnostics`, `governance`.
5. `src/shell/`:
- shared app shell, sidebar/topbar, brand primitives, responsive layout scaffolding.

### 2) Component Hierarchy Plan
1. Shell level:
- `AppShell`, `WorkspaceSidebar`, `SurfaceHeader`, `TrustStrip`.
2. Surface level:
- each surface owns composition-only containers.
3. Domain UI blocks:
- `SourceRoleGroup`, `SourceCard`, `CapabilityLane`, `BookingRow`, `DiagnosticsStepper`.
4. Policy-aware utilities:
- `TrustBadge`, `EscalationNotice`, `ProgressiveSection`.
5. Brand reuse requirement:
- use existing `BunnyMark` + `BrandWordmark` from onboarding/dashboard primitives, no new logo implementation.

### 3) State-Management Evolution Strategy
Use backend-driven server state + thin UI state:
1. Introduce query layer (React Query or equivalent) for route-contract data.
2. Keep local context only for transient UI choreography (expanded card, selected tab, active sheet).
3. Introduce normalized provider/calendar store shape:
- keyed by provider id + calendar id.
4. Centralize status enum mapping in one adapter layer, never in individual surfaces.
5. Add explicit contract mismatch logging path (non-blocking + typed fallback).

### 4) Provider Abstraction Strategy
1. Replace provider unions with backend-driven identifiers (`string` + capability metadata).
2. Render by role/capability first:
- blocking, visibility-only, booking-destination.
3. Provider branding remains secondary metadata only.
4. Remove provider-specific flow branching from components.
5. Keep connect/disconnect flows contract-driven via `/auth/providers`, `/auth/link/{provider}`, and integration connect endpoints.

### 5) Tier-Aware Rendering Architecture
1. Add `TierPolicyResolver`:
- inputs: user/org/session onboarding payload + backend tier signals.
- outputs: visibility depth, diagnostics depth, governance sections.
2. Free/Pro/Enterprise share same layout skeleton and interaction grammar.
3. Tier adds depth panels and controls progressively; never replaces base surface identity.

### 6) Responsive Implementation Strategy
1. Mobile-first zoning rules per surface:
- one primary stream + one contextual block.
2. Max one sticky trust/escalation element per viewport.
3. Advanced diagnostics always behind expandable sheet/accordion.
4. No multi-column diagnostics on mobile.
5. Define explicit density budgets per breakpoint.

### 7) Backend Integration Map
Auth + session:
1. `GET /auth/session` -> session context hydration.
2. `GET /auth/providers` -> provider options for sign-in/onboarding.
3. `POST /auth/link/{provider}` -> provider linking initiation.
4. Existing integration connect callbacks remain transport layer, not UI-owned semantics.

Availability + bookings:
1. `GET /public/{username}/{eventTypeSlug}/availability`.
2. `POST /public/{username}/{eventTypeSlug}/book`.
3. `POST /public/{username}/{eventTypeSlug}/book/{bookingId}/confirm|cancel|reschedule`.
4. `GET /api/bookings/hosts/{hostId}/meetings`.

Integrations:
1. `GET /integrations/calendar/status/providers`.
2. `GET /integrations/conferencing/status`.
3. `GET /integrations/{kind}/{provider}/connect`.
4. `DELETE /integrations/{kind}/{provider}`.

Availability rules/overrides:
1. `/api/availability/rules/bulk`.
2. `/api/availability/overrides` + `/{id}`.

### 8) Progressive Disclosure Implementation Strategy
1. Default layer: coordination summary and immediate actions.
2. Secondary layer: localized trust context.
3. Advanced layer: diagnostics drawer/sheet (collapsed by default).
4. Governance layer (tier/policy-dependent): shown only in contextual sections.
5. Enforce maximum 2 nested expansions; deeper details open a detail pane.

### 9) Diagnostics Governance Strategy
1. Diagnostics copy must be narrative and impact-first.
2. Trust states shown near affected item only.
3. No persistent global diagnostics rail.
4. Escalation contract:
- inline note -> local warning -> blocking interrupt only for unsafe mutation/systemic risk.
5. Add reusable `TrustPolicy` mapping from backend states to calm UI language.

### 10) Interaction Choreography Strategy
1. Prefer inline expansion over modal interruption.
2. Use confirmation modals only for destructive actions.
3. Keep remediation action proximal to issue.
4. Preserve cross-surface interaction grammar:
- same affordances for expand, resolve, reconnect, retry.

### 11) Scalability-Risk Analysis
Top risks and mitigations:
1. Provider explosion (20+ calendars):
- mitigate via role-grouped virtualized lists + collapsed metadata.
2. Trust-state proliferation:
- mitigate via aggregate chips + warning caps.
3. Tier fragmentation:
- mitigate via shared skeleton + policy resolver.
4. Route/surface monoliths:
- mitigate by splitting dashboard into surface modules.
5. JS/TS duplication drift:
- mitigate by TS source-of-truth enforcement and JS artifact strategy.

### 12) Migration-Safe Rollout Plan
Phase 0: Contract hardening
1. Add typed adapters for `/auth/session`, `/auth/providers`, `/auth/link/{provider}`, provider-aware statuses.
2. Add centralized enum/status mapping and mismatch telemetry.

Phase 1: Auth/provider abstraction
1. Replace Google-only login with provider options from `/auth/providers`.
2. Move linking to provider-agnostic flow using `/auth/link/{provider}`.

Phase 2: Integration surface decoupling
1. Refactor `IntegrationContext` provider id typing to backend-driven identifiers.
2. Replace provider-hardcoded cards with capability-driven list rendering.

Phase 3: Availability Sources production surface
1. Build dedicated `/dashboard/availability/sources` surface using role-first topology from approved materialization.
2. Keep diagnostics collapsed and contextual.

Phase 4: Dashboard decomposition
1. Split monolithic `DashboardPage` into surface containers + shared shell blocks.
2. Preserve existing emotional tone/brand components.

Phase 5: Tier policy layer
1. Introduce `TierPolicyResolver` and progressively unlock depth.
2. Validate continuity across Free/Pro/Enterprise.

Phase 6: Governance-safe expansion
1. Add enterprise governance overlays without separate console identity.
2. Enforce density budgets and escalation contract in CI UI checks.

## C. Immediate Implementation Constraints to Enforce
1. Backend is source of truth for orchestration and provider semantics.
2. No local recomputation of orchestration health.
3. No provider-first navigation or hero hierarchy.
4. Diagnostics collapsed by default on all surfaces.
5. Reuse existing brand primitives from onboarding (`BunnyMark`, `BrandWordmark`) and existing shell rhythm.

## D. Decision: Ready To Start Implementation?
Yes, with sequence constraints:
1. Start with Phase 0 and Phase 1 only.
2. Do not build new surface UI before provider abstraction and contract adapters are in place.
3. After Phase 1, begin Availability Sources surface implementation behind a route flag.

## E. High-Fidelity Reference Alignment Notes
Reference files reviewed:
- `/Users/koushikruidas/Downloads/bunnycal-1/sources-shell.jsx`
- `/Users/koushikruidas/Downloads/bunnycal-1/sources-main.jsx`
- `/Users/koushikruidas/Downloads/bunnycal-1/sources-app.jsx`
- `/Users/koushikruidas/Downloads/bunnycal-1/sources.css`

Implementation carry-forward (preserve):
1. Role-first composition:
- confidence summary -> blocking sources -> visibility-only -> destination/rule -> collapsed diagnostics -> optional governance depth.
2. Calm trust choreography:
- inline trust states per row + one contextual remedy block, no persistent diagnostics wall.
3. Progressive depth:
- diagnostics collapsed by default, governance shown as additive depth.
4. Sidebar hierarchy continuity:
- Availability -> Availability sources nesting and existing shell rhythm.

Required adaptation (do not clone statically):
1. Remove static provider sample assumptions from reference code and bind to backend contracts.\n2. Replace mock counts/status text with adapter-derived view models.\n3. Keep orchestration abstraction language (impact-first), avoid surfacing backend mechanics in primary zones.\n4. Reuse existing product primitives from codebase onboarding/dashboard:\n- `BunnyMark` and `BrandWordmark` components are the canonical logo/name source.
