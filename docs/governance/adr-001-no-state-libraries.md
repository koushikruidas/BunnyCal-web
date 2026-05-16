# ADR-001 — No client-state or server-state libraries during modernization

**Status:** Accepted
**Date:** 2026-05-16
**Decision owners:** frontend modernization initiative (branch `feature/bunnycal-ux-modernization`)
**Supersedes:** none

## Context

The bunnyCal frontend (kairo-web) is entering a behavior-preserving modernization. The existing architecture has three properties that are unusually clean for a product of this size:

1. **No global client-state library.** State is held in four narrowly-scoped React Contexts (`AuthContext`, `BookingContext`, `IntegrationContext`, `OnboardingContext`) plus localized `useState` per page.
2. **No server-state cache library.** Data fetching is performed via a small façade (`services/api.ts`) over three transport clients (`lib/authenticatedApiClient.ts`, `publicApiClient.ts`, `draftApiClient.ts`), called from action hooks (`useBookingActions`, `useAvailability`, `useGuestBookingActions`).
3. **A real finite state machine** (`state/bookingMachine.ts`) owns the booking lifecycle. The reducer is the authority on what transitions are legal.

These properties are not accidents — they are what makes the booking flow's idempotency, hold semantics, and OAuth-bounce recovery work correctly today (see `behavioral-invariants.md` items 3, 7, 8, 12). Introducing a centralized client store or a server-state cache during the modernization would compete with the FSM for authority, change polling/retry/dedupe semantics in non-obvious ways, and create exactly the kind of "duplicated orchestration semantics" the constitution forbids in §24 and §25.

This ADR records two binding prohibitions for the duration of the modernization initiative.

## Decision

### Prohibition A — Client-state libraries (binding for all phases)

> **Global client-state libraries — Zustand, Redux, Redux Toolkit, Jotai, Recoil, MobX, Valtio, Effector, XState (as a global store), and equivalents — are prohibited for the duration of the modernization initiative.**

Exceptions require *all* of the following:
1. A documented cross-feature synchronization requirement that React Context demonstrably cannot serve. (Re-renders alone do not qualify; measure first.)
2. The existing orchestration boundaries (`services/` → `state/` → `features/`) remain intact.
3. The candidate state genuinely cannot be locally contained in a Context or `useState`.
4. Explicit human approval.
5. A follow-up ADR documenting the introduction.

### Prohibition B — Server-state libraries (binding for Phases 1–5)

> **React Query (TanStack Query), SWR, RTK Query, Apollo cache, urql cache, Relay, and equivalent server-state abstractions are prohibited during Phases 1–5 of the modernization.**

No exceptions during this window. The prohibition lifts after Phase 6 cleanup completes, at which point a server-state library may be considered as a discrete initiative with its own ADR, migration plan, and behavior-snapshot regression sweep.

Why the time-boxed prohibition: a server-state library is a *behavior-changing* dependency, not a *behavior-preserving* one. It re-implements:
- request lifecycle (when a request starts, when it deduplicates, when it cancels)
- retry policy (today: none; React Query: exponential backoff by default)
- cache invalidation (today: explicit refetch in effects; React Query: stale-time + refetch-on-focus)
- polling (today: setInterval with status-aware cadence in `useAvailability.ts:64`; React Query: `refetchInterval` + window-focus default)
- the contract between hooks and Context (today: hooks dispatch into Context; with React Query, Context becomes a thin wrapper over the query cache)

Replacing the existing pattern *during* the modernization means the migration is simultaneously preserving UI behavior, refactoring data-flow semantics, and learning a new library. The risk surface in §6 of the audit document expands beyond what snapshot tests can reasonably cover.

## Consequences

### Positive

- The booking FSM (`state/bookingMachine.ts`) remains the sole authority on lifecycle state. No race between the FSM and a query cache for "what is the truth right now."
- The polling cadence switch in `useAvailability.ts:64` continues to be a one-line concern, not a `refetchInterval` callback hidden behind a query options object.
- The silent-refresh single-flight (`authenticatedApiClient.ts:57-100`, invariant #9) keeps its single concrete location. A query library would re-implement this and the two implementations would drift.
- The audit's risk map (§6 of the modernization plan) remains stable through Phases 1–5. Snapshot tests cover behavior; we don't need to also cover a cache layer's behavior.
- The modernization branch's `package.json` diff stays small, which keeps review surface focused on UI changes.

### Negative

- Per-feature data-fetching boilerplate continues (loading flags, error flags, manual refetch). This is the cost being paid in exchange for behavior preservation.
- If, during Phase 4 (Dashboard), we find that the meetings-polling + integrations-status-refresh + availability-polling combination would benefit from a unified cache layer, we cannot adopt one inside Phase 4 — we must either complete Phase 5 first or open a one-off ADR with explicit human approval.
- Onboarding contributors who are accustomed to React Query / Zustand will need to be pointed at this ADR.

### Neutral

- The architecture remains "old fashioned" by 2026 React-ecosystem standards. The constitution (§22) explicitly values *semantic consistency and synchronization integrity* over architectural fashion. This trade-off is intentional.

## Detection & enforcement

Any of the following in a pull request must trigger review failure:

1. A new dependency in `package.json` whose name appears in either prohibition list above.
2. An import of `@tanstack/react-query`, `swr`, `zustand`, `redux`, `@reduxjs/toolkit`, `jotai`, `recoil`, `mobx`, `mobx-react`, `valtio`, `effector`, or `@apollo/client`.
3. A new global store object outside `src/state/` that holds cross-feature state.

The end-to-end gate before merging the modernization branch to `main` includes the check `grep -E '(zustand|redux|jotai|recoil|mobx|valtio|effector|react-query|@tanstack/react-query|^swr$)' package.json` returning zero matches.

When the prohibition lifts (post Phase 6), this ADR is superseded by a new ADR — it is not edited in place.

## References

- `docs/governance/bunnycal-frontend-constitution-v4.md` §22 (Frontend Architecture Philosophy), §24 (State Architecture Governance), §25 (Optimistic Update Governance — forbidden patterns), §49 (Frontend Modernization Strategy — "behavior-preserving UX evolution NOT uncontrolled frontend rewriting").
- `docs/governance/behavioral-invariants.md` items #3, #7, #8, #9, #12, #13.
- Modernization plan at `~/.claude/plans/you-are-working-on-parsed-hippo.md` §0.2 and §0.3.
