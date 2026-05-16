# Behavioral Invariants — Frontend Modernization

> **Status:** binding. Every invariant below must hold at every point during the modernization initiative. A pull request that violates an invariant must be rejected on review.
>
> **Authority:** companion to `bunnycal-frontend-constitution-v4.md`. The constitution defines the philosophy; this document names the specific file-level behaviors that encode that philosophy today. When the two appear to conflict, the constitution wins on intent and this document wins on the concrete enforcement point — escalate the conflict, do not silently resolve it.
>
> **Test discipline:** every invariant must be locked in by a snapshot test before its enforcing surface is migrated. Invariants without tests are wishes. The "Test" field below names the test that owns each invariant; tests marked `(pending Phase 0)` must land before Phase 1 begins.

## How to use this document

- Reading the codebase and unsure whether a behavior is intentional? Search this file for the file:line. If it appears here, the behavior is load-bearing.
- About to edit a file mentioned here? Re-read the invariant first. If your edit changes the behavior named in the invariant, stop and escalate.
- About to delete a `// eslint-disable` or "weird-looking" guard near a file:line mentioned here? It is probably the enforcement. Do not delete it.

---

## 1. Booking identity must survive reschedule

**Statement:** Rescheduling a confirmed booking mutates only the `startTime`. The booking continues to be the same booking from the user's perspective. If the backend issues a new `bookingId` in the reschedule response, the frontend must adopt the new ID atomically with the removal of the old one — no window in which both exist or neither exists.

**Constitution alignment:** §14 (Rescheduling Governance: "moving continuity, NOT destructive replacement"), §10 (Workflow Continuity Governance).

**Enforced today at:** `src/modules/guest-booking/useGuestBookingActions.ts` reschedule path.

**Test:** `useGuestBookingActions.reschedule` — given an active booking + valid token, `rescheduleBooking({ startTime })` returns the rescheduled record and the local store reflects the new ID before any UI render observes the old one *(pending Phase 0)*.

---

## 2. Guest capability-token source precedence: URL > localStorage > error

**Statement:** When `GuestManageBookingPage` mounts, the capability token must be read from the URL `?token=...` parameter first. Only if the URL has no token may the page fall back to `localStorage` (via `loadGuestManageToken(bookingId)`). If neither yields a token, the page must show an explicit error state — never silently fall through.

**Constitution alignment:** §17 (Synchronization UX Governance — "avoid raw infrastructure terminology" applies to error states), §18 (Reliability UX Rules).

**Enforced today at:** `src/pages/guest-booking/GuestManageBookingPage.tsx:20-27` (read order) and `:51` (URL cleanup happens *after* the token has been read, not before).

**Test:** `GuestManageBookingPage.tokenSource` — three cases: (a) URL only → URL token used and URL is cleaned; (b) localStorage only → storage token used; (c) URL + storage with different values → URL wins; (d) neither → error state *(pending Phase 0)*.

---

## 3. Hold expiration is client-authoritative

**Statement:** The hold-expiry transition (`HELD → EXPIRED`) is driven exclusively by the local countdown. No server poll, no server `expired` push, no clock-skew probe may compete with it. When the countdown reaches zero, the FSM `EXPIRE` event fires exactly once.

**Constitution alignment:** §16 (Reliability Philosophy — "reduce fears around missed meetings"), §24 (State Architecture Governance — transient interaction state is client-owned).

**Enforced today at:** `src/hooks/useCountdown.ts:14-18` (the only call site that fires the callback); `src/pages/HeldView.tsx:16` (subscribes the callback to `send({ type: "EXPIRE" })`); `src/state/bookingMachine.ts:170-171` (the EXPIRE handler).

**Test:** `bookingMachine.expire` — a `HELD` state receiving an `EXPIRE` event transitions to `EXPIRED` and nulls the hold. Separately, `useCountdown.fires-once` — countdown reaching 0 calls `onExpire` exactly once even if the component re-renders *(pending Phase 0)*.

---

## 4. Synchronization completion is backend-authoritative

**Statement:** `CALENDAR_SYNC_IN_PROGRESS` and `STALE_CALENDAR_DATA` are server-owned states. The frontend may *display* them, may *poll faster* while they hold, and may *render reassuring copy* — but it must never mark sync complete locally. Sync transitions to `CONNECTED` only when the server says so.

**Constitution alignment:** §7 (Domain Ownership Rules — "Backend Owns synchronization authority"), §17 (Synchronization UX Governance), §25 (forbidden: "optimistic synchronization completion").

**Enforced today at:** `src/state/IntegrationContext.tsx:46-54` (normalization map); `src/hooks/useAvailability.ts:64` (polling cadence switch).

**Test:** `IntegrationContext.normalize` — every server status string maps to exactly one of `connected | syncing | failed | disconnected`. `useAvailability.cadence` — when `data.status === "CALENDAR_SYNC_IN_PROGRESS"`, poll interval is 20s; otherwise 45s *(pending Phase 0)*.

---

## 5. OAuth fragment token extraction completes before any route effect

**Statement:** On every mount that lands a `#accessToken=...` (or `?accessToken=...`) URL, the access token must be extracted, persisted, and removed from the URL synchronously within the same tick, before any other effect that reads `authInitialized` or `user` fires. Deferring this into a later effect leaks the token into browser history.

**Constitution alignment:** §16 (Reliability Philosophy), §18 (Reliability UX Rules — "Is my calendar healthy?" is gated by this flow completing cleanly).

**Enforced today at:** `src/App.tsx:74-92`. `setAccessToken` + `history.replaceState` are sequenced inside a single `useEffect` body that runs at mount.

**Test:** `App.oauthRedirect` — when the app mounts with `?accessToken=X` in the URL, after the first effect tick (a) the token is in `apiClient` memory, (b) the URL no longer contains the token, (c) any subsequent navigation to `/dashboard` succeeds without re-reading the URL *(pending Phase 0)*.

---

## 6. Auth hydration completes before `ProtectedRoute` redirect logic

**Statement:** `AuthContext` initializes in this exact order: (1) `hydrateAccessTokenFromStorage()`, (2) `refreshUser()`, (3) set `authInitialized = true`. `ProtectedRoute` reads `authInitialized && !user` as its redirect gate. Inverting the order produces a redirect loop on every cold start with a valid token.

**Constitution alignment:** §10 (Workflow Continuity Governance — sessions persist across reload).

**Enforced today at:** `src/state/AuthContext.tsx:81-87`; `src/App.tsx:35-57` (`ProtectedRoute`).

**Test:** `AuthContext.hydrationOrder` — observe the sequence of state updates during initial mount with a stored token; assert `authInitialized` flips to `true` only after `refreshUser` resolves *(pending Phase 0)*.

---

## 7. Idempotency key is generated at hold-time, never at render-time

**Statement:** The booking idempotency key is generated only inside `requestHold` and only when no matching attempt key already exists for the current `(slot, email, name)` tuple. The key is reused across retries of the same tuple. Any change to slot or guest identity invalidates the attempt fields in the FSM, forcing the next hold to generate a fresh key.

**Constitution alignment:** §7 (Domain Ownership Rules — "Backend Owns ... reconciliation authority"; idempotency is the frontend's contribution to that reconciliation), §13 (Booking Interaction Governance — booking must feel trustworthy and recoverable).

**Enforced today at:** `src/hooks/useBookingActions.ts:7-11` (key generator); `:44-50` (reuse vs. regenerate decision); `src/state/bookingMachine.ts:128-133` and `:138-142` (attempt fields reset on `SELECT_DATE` and `SELECT_SLOT`).

**Test:** `useBookingActions.idempotency` — four cases: (a) first hold generates a key; (b) retry with same slot+email+name reuses; (c) slot change generates a new key; (d) name or email change generates a new key *(pending Phase 0)*.

---

## 8. FSM transitions are allowlist-gated

**Statement:** Every event sent to the booking reducer must appear in the `allowed` map for the current state, or the reducer returns the context unchanged. Illegal events are silently no-op'd by design — this is the safety net for races where a stale UI dispatches into a moved-on machine.

**Constitution alignment:** §24 (State Architecture Governance), §25 (forbidden: "duplicated orchestration semantics").

**Enforced today at:** `src/state/bookingMachine.ts:69-77` (allowlist); `:100-104` (the guard).

**Adding a new event:** must be added to both the allowlist (per state) and the switch (per type). Either alone is a bug.

**Test:** `bookingMachine.allowlist` — for every `(state, eventType)` pair not in the allowlist, the reducer returns the input context by reference equality *(pending Phase 0)*.

---

## 9. Silent refresh is single-flight

**Statement:** Concurrent 401 responses must collapse into a single in-flight `/auth/refresh` request. The shared promise must be observable to all callers; subsequent 401s arriving while the promise is pending await the same resolution.

**Constitution alignment:** §16 (Reliability Philosophy — "reduce fears around ... synchronization failures"), §38 (Performance Budgets — refresh stampedes inflate perceived latency).

**Enforced today at:** `src/lib/authenticatedApiClient.ts:57-100`. The `refreshPromise` module-scoped variable is the lock.

**Test:** `authenticatedApiClient.refreshSingleFlight` — fire N parallel requests that each receive a 401; assert `/auth/refresh` is called once; all N callers receive the new token *(pending Phase 0)*.

---

## 10. `TERMINAL_EXTERNAL_DELETE` bucketing is preserved verbatim

**Statement:** Two server lifecycle states — `TERMINAL_EXTERNAL_DELETE` and `EXTERNALLY_CANCELLED` — must collapse to the same UI lifecycle tone (`bad`) and the same `kind` (`TERMINAL_EXTERNAL_DELETE`). This is a deliberate UX decision documented in commit `e10de28`, not a coincidence.

**Constitution alignment:** §17 (Synchronization UX Governance — calm operational clarity); §18 (Reliability UX Rules — users should not have to distinguish two flavors of "the calendar event went away").

**Enforced today at:** `src/lib/meetingActions.ts:93-103`.

**Test:** `meetingActions.bucketing` — both server states produce identical `LifecycleViewState` outputs *(pending Phase 0)*.

---

## 11. Draft-host token has no TTL

**Statement:** Tokens stored by `modules/draft-host/tokenStore.ts` are valid indefinitely until the holder either (a) claims the draft into a real account, or (b) explicitly clears them. Do not add expiry, do not add rotation, do not silently invalidate.

**Constitution alignment:** §10 (Workflow Continuity Governance — drafts must survive arbitrary delays before claim); §14 (Rescheduling Governance, by analogy — claim is "moving continuity").

**Enforced today at:** `src/modules/draft-host/tokenStore.ts`. The claim endpoint is not yet implemented (`src/pages/draft-host/DraftClaimPage.tsx:11` placeholder).

**Test:** `tokenStore.draft.noTTL` — assert there is no `expiresAt`, `validUntil`, or equivalent field in the persisted record *(pending Phase 0)*.

**When the backend claim endpoint lands:** this invariant is revised, not deleted — the new wording specifies the claim flow's TTL semantics.

---

## 12. SessionStorage hydration of in-flight booking survives OAuth bounce

**Statement:** The booking machine state — including `attemptIdempotencyKey` — is persisted to sessionStorage and restored on remount. The key is scoped to `${username}/${eventTypeSlug}` and versioned. The version number must not be bumped during the modernization, because doing so invalidates in-flight bookings in users' browsers.

**Constitution alignment:** §10 (Workflow Continuity Governance — "Users must never lose ... meeting continuity"); §13 (Booking Interaction Governance — booking must feel low-friction across reload).

**Enforced today at:** `src/state/BookingContext.tsx:17` (version constant); `:116` (key composition); `:115-192` (hydrate + persist effects); `src/state/bookingMachine.ts:188-203` (`HYDRATE_FROM_STORAGE` handler).

**Test:** `BookingContext.hydration` — write a HELD state with idempotency key K to sessionStorage; mount a fresh provider for the same `(username, slug)`; assert the restored state has `state === "HELD"` and `attemptIdempotencyKey === K` *(pending Phase 0)*.

---

## 13. Availability polling cadence switches on status

**Statement:** `useAvailability` polls at 20s when the most recent response has `status === "CALENDAR_SYNC_IN_PROGRESS"`, otherwise at 45s. Both cadences are load-bearing — the faster cadence is what makes "sync is in progress, hang tight" feel responsive; the slower cadence is what keeps the dashboard from generating background load.

**Constitution alignment:** §17 (Synchronization UX Governance), §38 (Performance Budgets).

**Enforced today at:** `src/hooks/useAvailability.ts:64`.

**Test:** `useAvailability.cadence` — fake timers; mount with sync-in-progress response → next poll at 20s; mount with normal response → next poll at 45s *(pending Phase 0)*.

---

## 14. Status string equality is unified atomically

**Statement:** Today `BookingLifecycleStatus` (constants/bookingStatus.ts) and FSM `BookingState` (bookingMachine.ts:3-10) coexist with scattered string literals (`"CONFIRMED"`, `"CANCELLED"`, `"RESCHEDULED"`, `"ACTIVE"`) across pages. Unification of these into a single source of truth must land in **one commit during Phase 5**, behind the FSM snapshot tests. A partial migration — one file normalized while another keeps `=== "CANCELLED"` — silently breaks equality checks and is the most likely source of a silent regression.

**Constitution alignment:** §5 (Domain Modeling Philosophy — "canonical semantic entities"); §6 (Canonical Frontend Domain Entities — `MeetingLifecycleState`).

**Enforced today at:** `src/constants/bookingStatus.ts`; `src/state/bookingMachine.ts:3-10`; literal usages in `src/pages/BookingPage.tsx`, `src/pages/ConfirmedView.tsx`, `src/pages/guest-booking/GuestManageBookingPage.tsx`.

**Test:** `lifecycle.statusEquality` — exercise every comparison site after the unification commit; assert all equality comparisons against the new canonical type pass *(pending Phase 5 — this is the only invariant in this document whose locking test lands later than Phase 0)*.

---

## 15. Visual stability invariants for temporal UX

**Statement:** Layout shift in a scheduling product is a correctness bug. Five sub-invariants:
1. **No layout shift on data load.** Skeletons match post-load geometry exactly.
2. **Calendar cell geometry is fixed** across empty / partial / full slot states. (`src/components/CalendarGrid.tsx`)
3. **Slot positions are stable** across refresh — sort is deterministic; arriving slots never reflow existing ones above them. (`src/components/SlotButton.tsx`)
4. **Modals anchor to viewport center,** never to a triggering element. (`src/components/ConfirmDialog.tsx:40` today; `ui/controls/Modal` after Phase 1.)
5. **Form fields reserve error-message height** — the error slot has min-height so error text does not push siblings.

**Constitution alignment:** §26 (Data Loading Governance — "Forbidden: layout-shifting loading states"); §29 (Visual Rhythm Governance); §38 (Performance Budgets — "Layout shift target: near-zero"); §40 (Rendering Governance — "minimize layout shifting").

**Test:** `cls.routes` — Playwright CLS measurement on every route returns < 0.05. Per-component visual snapshot tests detect any geometry regression on skeleton/loaded swap *(pending Phase 0; lives in the visual-snapshot suite, not the behavior-snapshot suite)*.

---

## Appendix — change discipline

- **Adding an invariant:** lands in the same PR as the test that locks it. Cite the constitution clause it enforces.
- **Modifying an invariant:** allowed only when the underlying behavior intentionally changes. The PR must update the test, link the constitution clause that justifies the change, and call out the migration impact in the description.
- **Removing an invariant:** allowed only when the enforcing code is being removed entirely. Document the rationale here in a stricken-through block; do not delete the section silently.
