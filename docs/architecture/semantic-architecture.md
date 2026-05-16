# Semantic Architecture — Canonical Frontend Entities

> **Status:** binding architectural reference.
> **Authority:** anchors constitution §6 (Canonical Frontend Domain Entities) and §7 (Domain Ownership Rules) to concrete TypeScript shapes and file locations in `kairo-web`.
> **Companion docs:** `frontend-layering.md` (layering rules), `behavioral-invariants.md` (file-level invariants), `~/.claude/plans/...` (modernization plan §4, incremental lift schedule).

This document is the single source of truth for *what entities the frontend models*. It defines (a) the canonical name for each entity, (b) where it is encoded today, (c) where it must converge, and (d) which side of the backend/frontend ownership boundary owns it. It does **not** redesign types. It records and constrains them.

---

## 1. Why this document exists

The audit identified that the frontend models several scheduling entities implicitly — across `services/types.ts`, FSM state, Context providers, and ad-hoc literal strings in pages. The constitution names the entities; this document binds those names to TypeScript and to ownership.

Three failures this document prevents:

1. **Semantic drift.** Two features modeling "the same thing" with different shapes (e.g., `attemptGuestName` in the FSM vs `guestName` in the server response).
2. **Status-string ambiguity.** Code comparing against `"CANCELLED"` in one file and `BookingLifecycleStatus.CANCELLED` in another, then silently mismatching after a refactor.
3. **Authority confusion.** Frontend code that "completes" a sync, "expires" a booking server-side, or "claims" a draft — all of which are server-owned actions.

---

## 2. The nine canonical entities

For each entity: canonical name, current TS shapes, definition sites, ownership, mutation authority, and the file under `domain/` it will lift into (per the incremental-lift schedule).

### 2.1 `Booking`

The scheduled coordination instance. The single most important entity in the system. The frontend models two facets of it simultaneously:

- **Server-state Booking** — the booking as the server knows it (lifecycle status, identity, sync metadata).
- **In-flight Booking** — the booker's current attempt to create a booking (FSM state, selected slot, hold, idempotency attempt).

These are **separate concerns and must remain separate types** even after the Phase 5 unification. Collapsing them would put server lifecycle and client interaction state into one shape and re-introduce the orchestration ambiguity the FSM exists to prevent.

| Facet | Current TS | Site | Owner |
|---|---|---|---|
| Server-state | `HostMeetingResponse` | `services/types.ts:83-100` | Backend |
| Server-state (post-confirm) | `PublicConfirmResponse` | `services/types.ts:61-74` | Backend |
| Server-state (post-hold) | `HoldResponse` | `services/types.ts:55-59` | Backend |
| In-flight FSM context | `BookingContextData` | `state/bookingMachine.ts:12-30` | Frontend (transient) |
| Lifecycle status (server) | `BookingStatus` | `services/types.ts:1` | Backend |
| FSM state (frontend) | `BookingState` | `state/bookingMachine.ts:3-10` | Frontend |

**`BookingStatus` vs `BookingState` — they are not the same and must not be merged.**

- `BookingStatus = "INITIATED" | "HELD" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "RESCHEDULED"` describes the *server* lifecycle of a booking record.
- `BookingState = "EVENT" | "SLOTS" | "DETAILS" | "HELD" | "CONFIRMED" | "CANCELLED" | "EXPIRED"` describes the *frontend interaction machine* that creates a booking. `EVENT`, `SLOTS`, `DETAILS` are pre-server states; they have no corresponding server status.

The two intersect at `HELD`, `CONFIRMED`, `CANCELLED`, `EXPIRED` (semantically aligned) but their *meaning* and *authority* differ. The FSM allowlist (`bookingMachine.ts:69-77`) is the single source of truth for legal transitions.

**Lift target:** `domain/booking.ts` (Phase 5). Will export both `Booking` (server) and `BookingMachineState` (frontend), clearly separated.

**Behavioral invariants tied to this entity:** #1, #3, #4, #7, #8, #12 in `behavioral-invariants.md`.

### 2.2 `EventType`

A reusable scheduling configuration owned by a host. Three current shapes for three views:

| View | Current TS | Site |
|---|---|---|
| Public (booker sees this) | `PublicEventInfoResponse` | `services/types.ts:12-21` |
| Host summary (list view) | `EventTypeSummaryResponse` | `services/types.ts:76-81` |
| Creation payload | `CreateEventTypeRequest` | `services/types.ts:102-114` |

**Ownership:** entirely backend. Frontend never invents or "completes" event types.

**`EventType` is NOT onboarding, NOT booking lifecycle, NOT scheduling state** (per constitution §6). It is the configuration; the booking flow consumes it, draft onboarding builds it.

**Lift target:** `domain/eventType.ts` (Phase 4, when dashboard event-types section migrates).

### 2.3 `AvailabilityRule`

Recurring scheduling availability — a weekly time window for a single day-of-week.

| Variant | Current TS | Site |
|---|---|---|
| Authenticated request | `AvailabilityRuleRequest` | `services/types.ts:125-129` |
| Bulk upsert payload | `BulkAvailabilityRulesUpsertRequest` | `services/types.ts:131-133` |
| Draft-onboarding variant | `DraftAvailabilityRule` | `services/types.ts:152-156` |

Note: `AvailabilityRuleRequest` and `DraftAvailabilityRule` are structurally identical today. They are kept separate because their *origin* differs (authenticated host vs unauthenticated draft) and the server treats them as distinct payloads.

**`DayOfWeek`** is the enumerated key (`MONDAY..SUNDAY`, `services/types.ts:116-123`). Frontend must never substitute lowercase or short forms.

**Ownership:** entirely backend. Frontend reads, edits via the host UI, sends the canonical payload.

**Lift target:** `domain/availability.ts` (Phase 4). Will hold `AvailabilityRule`, `AvailabilityOverride`, and `DayOfWeek` together.

### 2.4 `AvailabilityOverride`

A per-date exception to the weekly rule. Vacations, custom hours, "I'm not available that day."

| Variant | Current TS | Site |
|---|---|---|
| Create payload | `AvailabilityOverrideCreateRequest` | `services/types.ts:135-141` |
| Response | `AvailabilityOverrideResponse` | `services/types.ts:143-150` |
| Draft-onboarding variant | `DraftOverride` | `services/types.ts:158-163` |

**API quirk preserved on purpose:** both `available` and `isAvailable` exist on the override types. This reflects backend payload inconsistency that the frontend tolerates by reading whichever is present. **Do not "fix" this by collapsing to one field** — it is the API contract today; a backend fix is the only correct path.

**Ownership:** backend. Frontend reads, edits via UI, sends the canonical payload.

**Lift target:** `domain/availability.ts` (Phase 4).

### 2.5 `CalendarConnection`

The provider synchronization relationship between a host's account and an external calendar (Google, Microsoft, Zoom).

| Concept | Current TS | Site |
|---|---|---|
| Server status map (raw) | `CalendarStatusMap` | `services/types.ts:222-224` |
| Provider identifier (frontend) | `IntegrationProviderId` | `state/IntegrationContext.tsx:9` |
| UI status (normalized) | `IntegrationUiStatus` | `state/IntegrationContext.tsx:10` (`"connected" \| "disconnected" \| "syncing" \| "failed"`) |
| Normalization function | `normalizeStatus` | `state/IntegrationContext.tsx:46-55` |

**The normalization in `IntegrationContext.tsx:46-55` is load-bearing.** It collapses ~8 server status strings into 4 UI states. This collapse is governance — preserving it preserves UI semantics:
- `CONNECTED | ACTIVE | AVAILABLE` → `connected`
- `CALENDAR_SYNC_IN_PROGRESS | SYNCING | STALE_CALENDAR_DATA` → `syncing`
- `CALENDAR_NOT_CONNECTED | DISCONNECTED | INACTIVE` → `disconnected`
- anything containing `ERROR` or `FAIL` → `failed`

**Ownership:** server-state-owned. Frontend caches the status map in localStorage for resilience, but the cache is **decoration**, not authority. Every cached read must be paired with a server refresh on the next opportunity (mount, focus, OAuth return, query param — see `IntegrationContext.tsx:133-184`).

**Synchronization authority:** backend-only. The frontend may *display* `syncing` and *poll faster* while it holds (`useAvailability.ts:64`) but must never transition out of `syncing` locally. (Behavioral invariant #4.)

**Lift target:** `domain/calendarConnection.ts` (Phase 4).

### 2.6 `Participant`

A scheduling actor. Today the frontend models two participant roles implicitly without naming them as participants:

| Role | Current TS | Site |
|---|---|---|
| Host (authenticated user) | `UserDto` | `services/types.ts:3-10` |
| Guest (booker) | `{ guestName, guestEmail }` fields | scattered across `PublicBookRequest:51-52`, `HostMeetingResponse:88-89`, FSM `attemptGuestName/Email` (`bookingMachine.ts:28-29`) |
| Draft host | `{ hostEmail, hostDisplayName }` | `modules/draft-onboarding/state.tsx:8-9` |

**Participant is not a first-class entity in code today.** It is the constitution's name for the role abstraction; the codebase encodes the two roles as separate types. Do not unify into a single `Participant` discriminated union — the host vs guest distinction is load-bearing (auth model differs, capability tokens differ, lifecycle responsibility differs).

**Lift target (deferred):** participants stay near their consumers (`UserDto` near auth, guest fields inside `Booking`). A `domain/participant.ts` may emerge later if cross-role logic appears, but not in this modernization initiative.

### 2.7 `ScheduleWindow`

A time-bound scheduling opportunity. Represented today as `{ start, end }` ISO-string pairs in several places:

| Use | Current TS | Site |
|---|---|---|
| Open slot | `SlotDto` (`{ slotId, start, end, available }`) | `services/types.ts:23-28` |
| Confirmed meeting time | `startTime`/`endTime` on `HostMeetingResponse` | `services/types.ts:86-87` |
| Hold expiry | `expiresAt` on `HoldResponse` | `services/types.ts:55-59` |

`ScheduleWindow` is **not a named type today**. The constitution lists it as a canonical entity, but the codebase intentionally inlines `{ start, end }` pairs in the consumers that need them. **Do not introduce a `ScheduleWindow` type** unless a real cross-feature need emerges — premature abstraction here would create a useless wrapper.

If multiple features need to operate on opaque windows (e.g., calendar geometry calculations), a `domain/scheduleWindow.ts` may be introduced at that point. Today, no.

### 2.8 `RescheduleSession`

A continuity-preserving meeting transition. Per constitution §14: rescheduling is **moving continuity**, not destructive replacement.

Today's encoding:

| Concept | Current TS | Site |
|---|---|---|
| Reschedule request | `PublicRescheduleRequest` (`{ startTime }`) | `services/types.ts:226-228` |
| Reschedule action | `rescheduleBooking()` | `modules/guest-booking/useGuestBookingActions.ts` |
| Status indication | `BookingStatus.RESCHEDULED` | `services/types.ts:1` |

**There is no first-class `RescheduleSession` type today.** The booking carries forward its `bookingId` (per behavioral invariant #1 — booking identity must survive reschedule); the reschedule request is a thin payload. This intentional minimalism reflects that the backend owns the continuity contract.

**Lift target:** `domain/booking.ts` (Phase 5) — colocated with `Booking` since reschedule is a booking lifecycle event. A standalone `RescheduleSession` entity is unnecessary.

### 2.9 `MeetingLifecycleState`

The canonical UI view-model for a booking's external-lifecycle situation. Distinct from `BookingStatus` (server lifecycle) and `BookingState` (FSM interaction state) — this entity describes *what the user should see and feel* about a booking's relationship with external calendar providers.

| Concept | Current TS | Site |
|---|---|---|
| Server lifecycle metadata | `LifecycleMeta` | `lib/meetingActions.ts:14-19` |
| Server sync metadata | `InvitationMeta` | `lib/meetingActions.ts:7-12` |
| UI view-model | `LifecycleViewState` (`{ kind, tone, label, detail }`) | `lib/meetingActions.ts:21-26` |
| Mapping function | `getLifecycleState()` | `lib/meetingActions.ts:93-155` |
| Sync view-model mapping | `getSyncState()` | `lib/meetingActions.ts:52-83` |

**The `getLifecycleState` function is load-bearing governance.** It encodes the constitution's premise that scheduling is a trust system — the function translates raw provider state into calm operational messaging (constitution §17). The kinds it produces today: `TERMINAL_EXTERNAL_DELETE`, `EXTERNAL_ACTION_REQUIRED`, `PROVIDER_STATE_ORPHANED`, `ACTIVE_DRIFT`, `RECONCILE_SUPPRESSED`, `PROVIDER_MISSING_EVENT`.

**External-delete bucketing (`lib/meetingActions.ts:97-104`) is preserved verbatim** — `TERMINAL_EXTERNAL_DELETE` and `EXTERNALLY_CANCELLED` collapse to one UI lifecycle. (Behavioral invariant #10.)

**Ownership:** server-state-owned (the metadata comes from the server). The view-model is a pure projection; frontend never invents lifecycle states.

**Lift target:** `domain/meeting.ts` (Phase 4) — co-located with `MeetingCard` and meeting-list view-model code.

---

## 3. Ownership boundaries

Per constitution §7, with concrete frontend pointers.

### 3.1 Backend owns

| Concern | Why backend | Frontend's role |
|---|---|---|
| Booking lifecycle transitions | Authoritative state (durability, idempotency, conflict detection) | Display + initiate via API; never assert completion locally |
| Availability calculation | Joins rules + overrides + existing bookings + DB clock | Request slots for a date; render results |
| Calendar synchronization | Coordinates with provider APIs, retries, outbox | Show status; poll faster when in-progress |
| Reconciliation (external delete, drift, suppressed) | Owns provider state truth | Project metadata through `getLifecycleState()` |
| Idempotency replay decisions | Owns the idempotency_keys table and hash check | Submit with key; trust replay response |
| Token rotation (auth) | Owns refresh-token rotation | Submit refresh; install new access token |
| Hold record creation | Owns expiry timestamp on `HoldResponse` | Display countdown; fire client EXPIRE when local clock hits 0 |

### 3.2 Frontend owns

| Concern | Why frontend | Storage location |
|---|---|---|
| FSM state during a booking attempt | Pre-server interaction state | in-memory + sessionStorage (versioned, scoped by `username/eventTypeSlug`) |
| Onboarding draft | Pre-publish content for both authenticated and draft flows | sessionStorage |
| Capability token storage | Optimization to avoid re-prompting | localStorage (URL takes precedence — invariant #2) |
| Integration status cache | Resilience across reloads | localStorage (decoration only — never authority) |
| Per-feature transient UI state (open/closed, tab selection, hover) | Pure UI ephemera | Component `useState` or feature-local Context |
| Hidden meeting IDs (dashboard) | User-local preference, not synced | localStorage |
| Timezone resolution | Browser-determined | `Intl.DateTimeFormat().resolvedOptions().timeZone`; synced to backend one-way |
| Idempotency key generation timing | Frontend controls when to start an attempt | in-memory + sessionStorage echo for OAuth-bounce survival |

### 3.3 Synchronization authority — backend always

This is so important it gets its own rule.

> Whenever the UI shows a transition between states that involve external systems (calendar provider, server lifecycle, integration health), the *backend* is the one that says when the transition has completed. The frontend may render an intermediate state, poll faster, show reassuring copy, or warn the user, but it never declares the transition complete on its own.

Concrete instances:
- Calendar sync: `IntegrationContext` may render `syncing` for arbitrarily long; only a server response transitions to `connected`.
- Booking confirmation: the `HELD → CONFIRMED` FSM transition only happens on a successful server `confirmBooking()` response (`bookingMachine.ts:166-167`).
- Reschedule: a successful server reschedule response is the only event that mutates the booking; the UI never optimistically renames the booking.
- External event lifecycle: `getLifecycleState()` projects what the *server told us*; the frontend never invents kinds.

The one explicit exception: **hold expiry is client-authoritative** (invariant #3) — because a network round-trip would be slower than the user's perception of "it expired."

### 3.4 Orchestration boundaries

Each layer owns specific orchestration concerns; crossing them is the source of most semantic drift.

| Boundary | Owner | Concrete enforcement |
|---|---|---|
| API transport selection (authenticated vs public vs draft) | `services/bookingResolver.ts` via `hostKind` | Action hooks never select the client directly |
| Cross-feature state (auth, integration, in-flight booking, onboarding draft) | `state/*Context.tsx` | Features import the Context; do not create parallel stores |
| Feature-local state (form draft, selected tab, expanded panel) | feature folder | Lives in the feature's local Context or `useState` — never in `state/` |
| Idempotency-key generation | `useBookingActions.ts:7-11, 44-50` and `useGuestBookingActions.ts` | Generated at hold/cancel/reschedule call sites only — never at render |
| Polling cadence selection | `useAvailability.ts:64` (status-driven) | Other features must not invent their own polling for the same data |
| OAuth fragment extraction | `App.tsx:74-92` (synchronous, on mount) | No other code path reads `accessToken` from URL |
| Auth intent storage | `lib/authRedirect.ts` | All pre-auth navigation intent flows through this module |

---

## 4. Domain lift schedule (incremental, no big-bang)

Per modernization plan §4 — types move to `src/domain/` only when their consuming feature migrates. This document is the canonical lift map.

| Phase | Entity | Source → Target |
|---|---|---|
| 2 (Landing + Login) | `AuthIntent` | `lib/authRedirect.ts:3-6` → `domain/auth.ts` |
| 3 (Onboarding + Draft) | `OnboardingDraft` | `state/OnboardingContext.tsx:5-13` → `domain/onboarding.ts` |
| 3 | `DraftHost` | `modules/draft-onboarding/state.tsx:7-17` → `domain/draftHost.ts` |
| 4 (Dashboard) | `EventType` | `services/types.ts:12-21, 76-81, 102-114` → `domain/eventType.ts` |
| 4 | `AvailabilityRule` + `AvailabilityOverride` + `DayOfWeek` | `services/types.ts:125-163` → `domain/availability.ts` |
| 4 | `CalendarConnection` + `IntegrationUiStatus` + normalization | `services/types.ts:222-224` + `state/IntegrationContext.tsx:9-55` → `domain/calendarConnection.ts` |
| 4 | `MeetingLifecycleState` | `lib/meetingActions.ts` → `domain/meeting.ts` |
| 5 (Booking + Guest-Manage) | `Booking` + `BookingStatus` + `BookingMachineState` + `SlotHold` + `IdempotencyAttempt` | `bookingMachine.ts:3-30`, `services/types.ts:1, 55-100, 226-228`, `constants/bookingStatus.ts` → `domain/booking.ts` |
| 5 | `GuestCapabilityToken` | `modules/guest-booking/tokenStore.ts:1-6` → `domain/capabilityToken.ts` |
| Deferred (no current need) | `Participant`, `ScheduleWindow` | Stay inlined until cross-feature need emerges |

**Hard rules** (restated from plan §4):
- No re-export bridges. A type moves; its old location is deleted in the same commit.
- No structural changes during the move. Relocation commits are pure.
- No collapse of distinct types without explicit approval (especially `BookingStatus` vs `BookingMachineState`).

---

## 5. What this document does not contain

- **Layer assignments** — see `component-hierarchy.md`.
- **Refactor priorities** — see `refactor-recommendations.md`.
- **Layering import rules** — see `frontend-layering.md`.
- **Behavior tests** — see `testing-strategy.md` and `behavioral-invariants.md`.

If a question is not answered here and not answered in those documents, stop and ask. Do not improvise architecture.
