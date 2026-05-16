# Refactor Recommendations — Catalogue of Identified Issues

> **Status:** binding architectural reference.
> **Scope:** this document catalogues every refactor concern the audit surfaced. It is **not a backlog and not an action queue.** Each entry names the phase that owns the fix, the binding invariant if any, and the rationale for the prescribed timing.
> **Companion docs:** `semantic-architecture.md` (entities), `component-hierarchy.md` (layer assignment), `behavioral-invariants.md` (file-level invariants), modernization plan §6 (risk map).

Discipline reminder: **issues are not "low-hanging fruit."** Each one was introduced because something else was hard; fixing one without understanding the cause re-creates the original problem in a new shape. The phase ownership column exists so that fixes happen in context, not opportunistically.

---

## How to read this document

Each issue has four fields:

- **Severity** — `critical` (touches an invariant), `high` (significant tech debt, behavior-adjacent), `medium` (consolidation), `low` (cosmetic / aesthetic).
- **Phase** — when the fix lands, per the modernization plan.
- **Action** — the prescribed remedy, terse.
- **Why this phase** — rationale for the timing.

---

## A. Giant components

Audit found three pages whose internal responsibility count exceeds what is reviewable as a single unit.

### A1. `pages/DashboardPage.tsx` (922 LOC)

| Field | Value |
|---|---|
| Severity | High |
| Phase | 4 |
| Action | Carve into `features/dashboard/sections/{Meetings,EventTypes,Availability,Integrations,Settings}Section.tsx` + `features/dashboard/DashboardShell.tsx`. Wrap `window.setInterval` + `document.hidden` polling in `features/dashboard/hooks/useDocumentVisibilityPolling.ts`. Consolidate 6 inline formatters into `shared/time/*`. |
| Why this phase | Dashboard sits between Onboarding (Phase 3) and Booking (Phase 5). Carving earlier would race with the auth/onboarding migration; carving later would block the booking flow's reliance on a clean integration view. Phase 4 is the only safe window. |
| Invariants touched | #9 (silent refresh single-flight — preserve), #10 (external-delete bucketing — preserve), #11 (integration cache refresh triggers — preserve all four), #13 (availability polling cadence — preserve) |

Five concerns currently entangled in this file:
1. Sidebar nav + user menu (`:400-442`)
2. Meetings list, tabs, hide/restore, 15s polling, cancel modal (`:444-580`)
3. Event types CRUD + URL copy (`:710-753`)
4. Availability weekly rules + override panel CRUD (`:583-700, 639-900`)
5. Integrations status, connect/disconnect, OAuth return reconciliation (`:754+`)

20+ `useState` calls and four refresh paths intersect in `:207-250` (mount fetch + visibility polling). The carve PR must preserve every refresh trigger and every polling cadence verbatim.

### A2. `pages/SlotsView.tsx` (194 LOC)

| Field | Value |
|---|---|
| Severity | Medium |
| Phase | 5 |
| Action | Extract date picker → `features/booking/components/DatePicker.tsx`; extract slot list rendering → composes `components/CalendarGrid` + `components/SlotButton`; pull date-derived state into `features/booking/hooks/`. |
| Why this phase | Touches the booking FSM state. Cannot move before the FSM relocates from `state/bookingMachine.ts` to `domain/booking.ts` (Phase 5). |
| Invariants touched | #3, #4, #7, #8, #12 (all booking-FSM-adjacent) |

### A3. `pages/OnboardingEventPage.tsx` (185 LOC)

| Field | Value |
|---|---|
| Severity | Medium |
| Phase | 3 |
| Action | Extract stepper navigation, integration selection sub-panel, and the event details form into `features/onboarding/EventStep.tsx`. Reuse the equivalent extraction in `features/draft-onboarding/EventStep.tsx` (shared shell — see Issue C1). |
| Why this phase | Onboarding is the natural phase. Both authenticated and draft variants migrate together so the shared shell can land in one PR. |
| Invariants touched | none directly; preserve sessionStorage keying (`onboarding-draft:${userId}`) verbatim |

---

## B. Orchestration coupling

Audit found four places where multiple distinct concerns share a single effect chain or state-management surface.

### B1. `DashboardPage` effect chain (polling + visibility + localStorage + 4 fetches)

| Field | Value |
|---|---|
| Severity | High |
| Phase | 4 |
| Action | See A1. The carve into sections naturally decouples the four concerns — meetings polling lives in `MeetingsSection`, integration refresh stays in `IntegrationContext`, availability polling stays in `useAvailability`, hidden-meeting localStorage moves into `MeetingsSection` local state. |
| Why this phase | Same window as A1. |
| Invariants touched | #11, #13 |

Today's entanglement (DashboardPage.tsx:207-250): meetings poll fires `loadMeetings` every 15s and on `visibilitychange`; availability fetch fires on mount and on user.id change; integration refresh fires on mount, focus, OAuth return, query param. **All four pathways can interleave**; the only deduplication is `IntegrationContext.inFlightRef`. The carve makes the responsibilities visible without changing the interleaving.

### B2. `IntegrationContext` — 4 refresh triggers, 1 dedupe ref

| Field | Value |
|---|---|
| Severity | High |
| Phase | 4 (in the same PR as A1/B1) |
| Action | Preserve all four refresh paths (`mount`, `focus`, `OAuth return`, `query param`) and the `inFlightRef` single-flight guard. Add a unit test pinning concurrent-trigger behavior to one in-flight fetch (lives in the §6-risk-map snapshot suite). |
| Why this phase | Cannot land in isolation — Dashboard migration is the consumer that surfaces fragility, so the test belongs there. |
| Invariants touched | #11 |

Don't try to reduce the four triggers. Each exists for a reason: mount = cold start, focus = tab-return reconciliation, OAuth return = after-redirect refresh, query param = after-callback URL cleanup. Removing any one causes a stale-status regression in a specific edge case.

### B3. `AuthContext` — mount + visibility timezone sync (double-sync)

| Field | Value |
|---|---|
| Severity | Low |
| Phase | 4 (incidental) or 6 (cleanup) |
| Action | Document the intentional duplication; do not collapse. The mount path catches initial hydration; the visibility path catches timezone changes during a long session. |
| Why this phase | Not blocking. If untouched through Phase 5, leave it; if a Phase 4 dashboard PR touches this code anyway, add a code comment explaining the duplication. |
| Invariants touched | #6 (hydration order — do not invert) |

### B4. `BookingContext` — dual persistence (reducer + sessionStorage)

| Field | Value |
|---|---|
| Severity | Critical |
| Phase | **Never** (this is intentional architecture, not a defect) |
| Action | Do not consolidate. Do not bump the version constant at `:17`. Document the dual persistence as load-bearing in `behavioral-invariants.md` (invariant #12 — already done). |
| Why this phase | sessionStorage hydration is the mechanism that survives OAuth-mid-booking redirects. Removing it would break booking recovery for any user who connects an integration while in `DETAILS` or `HELD`. |
| Invariants touched | #4, #7, #12 |

This entry exists specifically to prevent a future agent from "tidying up" the dual persistence. **It is not a refactor candidate. It is the architecture.**

---

## C. Semantic duplication

Audit found five places where the codebase has multiple implementations of the same concept.

### C1. Parallel onboarding stacks

| Field | Value |
|---|---|
| Severity | Medium |
| Phase | 3 |
| Action | Extract a shared `features/onboarding/StepShell.tsx` (Stepper + step layout + nav). Both `features/onboarding/*Step` and `features/draft-onboarding/*Step` consume it. **State stays separate** — `OnboardingContext` (authenticated) and `DraftOnboardingProvider` have different shapes (`hostEmail`/`hostDisplayName`) and different lifecycles (authenticated user vs unauthenticated draft slug). Do not merge them. |
| Why this phase | The two stacks must migrate together; carving one without the other forks the visual identity. |
| Invariants touched | none directly; preserve both sessionStorage keys verbatim (`onboarding-draft:${userId}`, `draft-onboarding-state`) |

The audit identified ~90% UI overlap between `pages/Onboarding*` and `pages/draft-onboarding/Draft*`. The shared shell extraction recovers the duplication at the UI layer without forcing semantic merge at the state layer.

### C2. Three `randomKey()` implementations

| Field | Value |
|---|---|
| Severity | Low |
| Phase | 5 (consolidated with the FSM lift) |
| Action | Consolidate into `lib/random.ts` (single export `randomKey()`). Three callers update imports: `useBookingActions.ts:7-11`, `modules/guest-booking/useGuestBookingActions.ts:6-10`, `pages/DashboardPage.tsx:30-35`. |
| Why this phase | All three callers touch idempotency-related code paths. Consolidating earlier risks a half-migration that silently changes one caller's key-generation contract. |
| Invariants touched | #7 (idempotency timing — preserve the call sites' semantics) |

### C3. Two tokenStores (`draft-host` vs `guest-booking`)

| Field | Value |
|---|---|
| Severity | Low |
| Phase | Deferred — no consolidation |
| Action | Leave as-is. The two stores have similar shape but different *lifecycles* (`draft-host` token: no TTL, pre-claim, single-host scope; `guest-booking` token: capability token, URL > storage precedence, per-booking scope). Consolidating into a generic tokenStore would force one to inherit the other's lifecycle quirks. |
| Why this phase | Two ~40 LOC modules are easier to reason about than one generic store with conditional behavior. Leave the duplication. |
| Invariants touched | #2 (guest token precedence), #11 (draft token has no TTL) |

### C4. Six inline date/time formatters in `DashboardPage`

| Field | Value |
|---|---|
| Severity | Low |
| Phase | 4 |
| Action | Promote `formatRelativeDay`, `formatWindow`, `to12h`, `humanDate`, `statusBadge`, `toneBadge` (all in `DashboardPage.tsx:37-93`) into `shared/time/` (formatters) and `features/dashboard/lib/badgeMapping.ts` (status badge mapping). The `statusBadge`/`toneBadge` mapping is feature-local — it does not belong in `shared/`. |
| Why this phase | Phase 4 owns DashboardPage carving; formatter consolidation happens naturally in the same PR. |
| Invariants touched | none — pure logic refactor; behavior must be byte-identical |

### C5. Status string scatter (`BookingStatus` vs `BookingState` vs literals)

| Field | Value |
|---|---|
| Severity | High |
| Phase | 5 |
| Action | Land the full unification sweep in **one commit**. Replace every literal (`"CONFIRMED"`, `"CANCELLED"`, `"RESCHEDULED"`, `"ACTIVE"`) with the canonical enum import. Keep `BookingStatus` (server) and `BookingState` (FSM) as separate types — see `semantic-architecture.md` §2.1. |
| Why this phase | A partial unification — one file normalized, another still using a literal `=== "CANCELLED"` — silently breaks comparisons. The full sweep must be atomic, and Phase 5 is the only phase that touches every relevant file. |
| Invariants touched | #14 (status string atomic unification — already documented as a Phase 5 invariant) |

Today's scatter:
- `constants/bookingStatus.ts` defines `BookingLifecycleStatus`
- `services/types.ts:1` defines `BookingStatus` (different)
- `state/bookingMachine.ts:3-10` defines `BookingState` (FSM)
- `pages/BookingPage.tsx`, `pages/ConfirmedView.tsx`, `pages/guest-booking/GuestManageBookingPage.tsx`, `modules/guest-booking/useGuestBookingActions.ts:25` all use string literals
- `pages/DashboardPage.tsx` mixes literal usage with `BookingLifecycleStatus` import

---

## D. State ownership problems

Audit found four cases where state lives in the wrong layer or its ownership is unclear.

### D1. `DashboardPage` 20+ `useState` (no reducer)

| Field | Value |
|---|---|
| Severity | Medium |
| Phase | 4 |
| Action | Section state lives in section components. Cross-section state (user, integration status) reads from existing Contexts. Where a section has more than 5 pieces of related state, prefer `useReducer` over more `useState`s. |
| Why this phase | Same as A1 — only justifiable inside the dashboard carve. |
| Invariants touched | none directly; preserve all polling and refresh behaviors per A1 |

### D2. `IntegrationContext.statusMap` cached in localStorage

| Field | Value |
|---|---|
| Severity | Low (intentional) |
| Phase | Never — preserve |
| Action | The cache is decoration, not authority. Every cached read is paired with a server refresh on the next opportunity. Document this in the file. |
| Why this phase | Removing the cache regresses cold-start UX without behavioral benefit. |
| Invariants touched | #11 (cache + 4 refresh triggers) |

### D3. `BookingContext` idempotency key persisted in sessionStorage

| Field | Value |
|---|---|
| Severity | Critical |
| Phase | Never — preserve |
| Action | Do not move the key out of sessionStorage. The idempotency key must survive OAuth-mid-booking redirects (a user who connects Google between `DETAILS` and `HELD` must come back to the same attempt). |
| Why this phase | Removing this is a regression to the server's replay logic. |
| Invariants touched | #4, #7, #12 |

### D4. Hidden-meeting IDs in localStorage (per-user, not synced)

| Field | Value |
|---|---|
| Severity | Low |
| Phase | 4 (incidental) |
| Action | Move the keys + I/O into `features/dashboard/sections/MeetingsSection.tsx` as section-local state. localStorage stays; this is a user-local UI preference and does not belong on the server. |
| Why this phase | Dashboard carve. |
| Invariants touched | none |

---

## E. Accessibility & visual stability gaps

These are not "issues to schedule" — they are quality gates that every phase must meet. Recorded here for catalogue completeness.

| Gap | Where | Phase that fixes |
|---|---|---|
| `<img>` without `alt` (`Avatar.tsx`) | `components/Avatar.tsx` | Whenever Avatar is touched (likely Phase 4) |
| Form labels without `htmlFor` | scattered | Phases 3 (onboarding) + 4 (dashboard settings) — `ui/Field` enforces this for new code |
| Icon-only buttons without `aria-label` | scattered | Phase 4 |
| Missing focus trap in non-`ConfirmDialog` overlays | none today (caught by `ui/Dialog`) | Phase 1 ✅ (`ui/Dialog` ships with focus trap) |
| CLS on data-load (skeleton geometry mismatch) | DashboardPage, SlotsView | Phases 4 + 5 — `ui/Skeleton` enforces same geometry |
| Form-field error message pushing siblings down | scattered forms | Phases 3 + 5 — `ui/Field` reserves error-slot height |

---

## F. What is **not** on this list (and why)

To prevent scope creep, three categories of "obvious" refactors that are explicitly excluded:

1. **Folder reorganization that does not change imports.** Moving `CalendarGrid` from `components/` to `components/booking/` for "tidiness" — no. The layering is logical, not directory-based. Such moves create import churn for zero behavioral benefit.

2. **Replacing the existing API client with a more "modern" pattern.** The `services/api.ts` façade over the three transport clients is the cleanest layer in the codebase. ADR-001 prohibits server-state libraries during Phases 1–5; this includes any "modernization" of fetching.

3. **Introducing a state machine library (XState et al.).** The hand-rolled FSM in `bookingMachine.ts` is short, comprehensible, and load-bearing. ADR-001's client-state-library prohibition includes "XState as a global store." A library would not improve behavior and would obscure the allowlist.

If a refactor proposal does not appear in sections A–E above, it is out of scope for this modernization. Out-of-scope improvements are a *separate initiative* — and they wait until Phase 6 completes.

---

## Phase ownership summary

| Phase | Issues owned |
|---|---|
| 2 (Landing + Login) | none from this catalogue (auth migrations + token tests live in Phase 0) |
| 3 (Onboarding + Draft) | A3 (OnboardingEventPage carve), C1 (parallel onboarding stack shell) |
| 4 (Dashboard) | A1 (DashboardPage carve), B1 (effect-chain decoupling), B2 (IntegrationContext test), B3 (incidental AuthContext doc), C4 (formatter consolidation), D1 (sectional state ownership), D4 (hidden-meeting state location), various A11y gaps |
| 5 (Booking + Guest-Manage) | A2 (SlotsView carve), C2 (randomKey consolidation), C5 (status string unification) |
| Never (preserve as-is) | B4 (BookingContext dual persistence), C3 (two tokenStores), D2 (integration cache), D3 (idempotency key persistence) |
| Deferred | C3 considered later only if cross-feature need emerges |
