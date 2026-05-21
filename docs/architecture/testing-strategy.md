# Testing Strategy — Frontend Modernization

> **Authority:** governs all test additions during the modernization initiative.
> **Purpose:** prevent test sprawl, anchor invariants in the right test layer, and keep CI signal high.
> **Status:** binding through Phase 6.

The repo has no test runner today. This document defines what we will test, what we will not, and how we will keep the suite honest. The corresponding tooling decisions land in Phase 0 alongside the first tests.

---

## Philosophy

Tests in this codebase exist for two reasons:

1. **Lock behavior that the audit identified as load-bearing.** These tests are listed in `behavioral-invariants.md`. They are the most expensive tests to lose and the most valuable ones to write first.
2. **Detect unintended UI drift during the modernization.** A migration that swaps `<button>` for `<Button>` should not change pixels; a migration that "improves" the calendar grid should not move slot positions.

Tests do **not** exist to:
- Exercise every branch of every function. Coverage targets are not a goal of this phase.
- Replace manual QA on flows that have no captured invariant.
- Re-test what the type system already guarantees.

When in doubt, ask: "if this test passes a year from now, will it tell me something I needed to know?" If not, do not write it.

---

## Test layers

Four layers, in order of cost-to-write (cheap → expensive):

| Layer | Tool | What it covers | Owns |
|---|---|---|---|
| Unit / behavior | `vitest` (chosen in Phase 0) | Pure functions, reducers, hooks under React Testing Library. | The §6 risk map. All entries in `behavioral-invariants.md`. |
| Component visual | Playwright `toHaveScreenshot` (optionally via Storybook + Chromatic) | `ui/` primitives at the variant level. | Geometry invariants for primitives. Reduced-motion. |
| Route visual | Playwright `toHaveScreenshot` | Each route at desktop; flagged routes also at mobile/tablet. | Cross-component layout, container widths, page-level rhythm. |
| End-to-end | Playwright | Golden-path flows (login, booking lifecycle, guest cancel) and CLS measurement. | Multi-step behavior + Cumulative Layout Shift budget. |

A finding does not belong in two layers. If a route-visual test would catch a regression, do not also write a unit test for it. If a unit test would catch it, do not also snapshot it visually.

---

## Visual baseline criteria

A surface earns a visual baseline when **all** of the following hold:

1. It is on a route enumerated in the modernization plan §0.6, **or** it is a `ui/` primitive variant.
2. It has a stable geometry — meaning, given fixed inputs and a fixed viewport, it renders the same pixels every time. Surfaces that depend on `Date.now()`, network jitter, or animation mid-frame need to be stabilized (fixed clock, stubbed fetch, paused animation) before snapshotting.
3. A regression there would be hard to detect from a unit test.

A surface does **not** earn a baseline if:
- It is a state-machine intermediate render (e.g., transient loading state with non-deterministic content). Snapshot the resolved state and the empty state instead.
- It is composed entirely of `ui/` primitives that already have their own baselines. The composition is implicitly covered.
- It exists only on `LandingPage` marketing content that the team treats as visually independent (the constitution permits the landing page's distinct identity).

---

## Required visual coverage (Phase 0 baseline capture)

Captured against the current `main` branch before any Phase 1 code lands.

**Routes — desktop (1440×900):**
- `/`, `/sign-in`
- `/onboarding/{connect,availability,event,success}`
- `/d/onboarding/{connect,availability,event,success}`
- `/d/:slug/{manage,share,claim}` (with a fixture slug)
- `/dashboard` per section: meetings (upcoming/past/cancelled tab), event-types, availability, integrations, settings
- `/book/:username/:eventTypeSlug` per FSM state: EVENT, SLOTS, DETAILS, HELD, CONFIRMED, EXPIRED, CANCELLED
- `/manage/:bookingId` per state: active, reschedule form, cancel confirmation, expired-token error

**Routes — mobile (375×812):**
- All `/onboarding/*` and `/d/onboarding/*`
- All `/dashboard` sections
- All booking FSM states (high-priority — booking is the single most pixel-sensitive surface)
- `/manage/:bookingId` active and reschedule

**Routes — tablet (768×1024):**
- `/book/:username/:eventTypeSlug` at SLOTS and DETAILS (the two states where layout density changes most)

**`ui/` primitives — captured per variant during Phase 1:**
- Each variant of each primitive in `ui/layout/` and `ui/controls/`. Captured at the moment the primitive lands, not after.

---

## Snapshot update discipline

The hardest test discipline in any project. Easy to violate, costly to recover.

**Rules:**

1. **Auto-update is forbidden on CI.** A Playwright config that runs with `--update-snapshots` in CI is a banned configuration.
2. **A snapshot update is a separate commit** from the change that caused it. The commit title is `chore(snapshots): update <surface> for <reason>`. The commit body explains *why* the pixels changed in 1–3 sentences.
3. **A snapshot update PR must include the side-by-side diff** in the description. Reviewer must see the before/after image, not just trust the change.
4. **A snapshot update that is not explained by an intentional change is a regression**, even if the code "looks fine." Stop, find the cause, then either revert or update with rationale.
5. **Never update a snapshot to make CI green** under time pressure. Hold the change until the diff is understood.

If a snapshot is flaky (passes locally, fails on CI; passes on second run), the surface is not stable enough for snapshot coverage. Stabilize the surface or remove the snapshot — do not retry-loop the test.

---

## CLS rules

Cumulative Layout Shift is treated as a correctness metric (per constitution §38 and `behavioral-invariants.md` #15).

**Budget:** every route must report CLS < 0.05 measured by Playwright after first contentful paint + 2 seconds of idle.

**Enforcement:**
- Phase 0 captures the CLS baseline per route from the current `main` branch.
- Each phase's acceptance gate re-measures and asserts the budget is not exceeded.
- A regression above 0.05 blocks the phase merge — no exceptions, no "we'll fix it later."

**Common causes to watch for during the migration:**
- Skeleton with wrong height → content snaps into place when loaded.
- Web font swap without `font-display: optional` causing text reflow.
- Lazy-loaded image without `width`/`height` attributes.
- Toast/banner appearing inside the document flow instead of as an overlay.
- Modal opening shifts the body scrollbar (need scroll-lock that compensates for scrollbar width).

---

## Motion testing rules

Motion governance lives in the modernization plan §0.4. Tests enforce it.

**Required tests:**

1. **`prefers-reduced-motion: reduce` honored.** For every animation defined in `globals.css` (`pulse-dot`, `pop`, `blink`, and any added during modernization), assert that under reduce-motion the animation either does not run or is reduced to opacity-only.
2. **Token compliance.** A lint check (CI grep) rejects `transition-duration` values that are not one of `80ms`, `140ms`, `220ms`, `360ms`. Rejects `transition-timing-function` curves that are not the four allowed curves.
3. **No motion on idle data.** A targeted test asserts that dashboard list items, meeting cards, and integration cards do not animate when data has not changed (no entrance animation on every poll tick).

**Not tested:** the *aesthetic quality* of motion. That is a review concern, not a CI concern.

---

## Invariant test ownership

Each invariant in `behavioral-invariants.md` is owned by exactly one test at exactly one layer. The mapping:

| Invariant | Test name | Layer | Phase |
|---|---|---|---|
| #1 Booking identity survives reschedule | `useGuestBookingActions.reschedule` | Unit | 0 |
| #2 Guest token precedence URL > storage | `GuestManageBookingPage.tokenSource` | Unit (component) | 0 |
| #3 Hold expiration client-authoritative | `bookingMachine.expire` + `useCountdown.firesOnce` | Unit | 0 |
| #4 Sync completion backend-authoritative | `IntegrationContext.normalize` + `useAvailability.cadence` | Unit | 0 |
| #5 OAuth fragment extraction sync-on-mount | `App.oauthRedirect` | Unit (component) | 0 |
| #6 Auth hydration order | `AuthContext.hydrationOrder` | Unit (component) | 0 |
| #7 Idempotency at hold-time | `useBookingActions.idempotency` | Unit | 0 |
| #8 FSM allowlist | `bookingMachine.allowlist` | Unit | 0 |
| #9 Silent refresh single-flight | `authenticatedApiClient.refreshSingleFlight` | Unit | 0 |
| #10 External-delete bucketing | `meetingActions.bucketing` | Unit | 0 |
| #11 Draft token no TTL | `tokenStore.draft.noTTL` | Unit | 0 |
| #12 SessionStorage hydration | `BookingContext.hydration` | Unit (component) | 0 |
| #13 Availability polling cadence | `useAvailability.cadence` | Unit | 0 |
| #14 Status string atomic unification | `lifecycle.statusEquality` | Unit | 5 |
| #15 Visual stability (CLS + geometry) | `cls.routes` + per-primitive geometry snapshots | E2E + Component visual | 0 |

**Discipline:**
- A failing invariant test must never be fixed by changing the test. The test is the spec.
- If an invariant intentionally changes, update `behavioral-invariants.md` in the same PR as the test update, with a stricken-through or replaced section explaining what changed and why.
- Adding a new invariant requires the test in the same PR.

---

## What we are deliberately not testing

Stated explicitly so the absences are intentional, not oversights:

- **Type-system guarantees.** The TS compiler is the test. Do not assert that a `BookingState` is one of the seven literal values; the type already says so.
- **`services/api.ts` against Swagger.** The Swagger contract is checked at the merge gate per modernization plan §8; no per-call schema test.
- **Visual snapshots of marketing surfaces (`LandingPage`).** Marketing has its own visual identity (constitution permits this); a snapshot here would lock a surface that intentionally evolves on its own cadence.
- **Cross-browser matrix.** Playwright runs against Chromium in CI. Manual smoke covers Safari/Firefox per phase.
- **Performance microbenchmarks.** Performance budgets in constitution §38 are validated by route-level metrics and CLS, not by component-render timing.
- **A11y completeness.** The Phase 0 baseline captures `axe` results per route; future phases must not regress. We do not gate on "100% a11y" — we gate on "no worse than the baseline plus the per-phase a11y deltas the phase introduced."

---

## References

- Constitution: `docs/governance/bunnycal-frontend-constitution-v4.md` §26 (Data Loading Governance), §32 (Accessibility Governance), §38 (Performance Budgets), §40 (Rendering Governance), §48 (Migration Safety Review Gate).
- Invariants: `docs/governance/behavioral-invariants.md` (the spec this strategy serves).
- ADR-001: `docs/governance/adr-001-no-state-libraries.md` (motivates why behavior tests must live in unit layer, not in a query-cache layer).
- Modernization plan: `~/.claude/plans/you-are-working-on-parsed-hippo.md` §0.4, §0.5, §0.6, §6, §8.
