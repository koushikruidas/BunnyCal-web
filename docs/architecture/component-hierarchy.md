# Component Hierarchy — Layer Assignment & Gap Map

> **Status:** binding architectural reference.
> **Authority:** projects constitution §23 (Component Layering) onto the actual `src/` tree. Layering import rules live in `frontend-layering.md`; this document is the *assignment map* — which file belongs to which layer, where it lives today, where it should live, and what is missing.

This document is a **gap map**, not a refactor plan. The refactor plan lives in the modernization plan (in `~/.claude/plans/`) and the per-phase scope. Component moves happen during their feature's migration phase, not as a bulk PR.

---

## The four layers (recap)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Route containers       <50 LOC, compose features   │
│          src/pages/*                                        │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Workflow orchestration (one folder per flow)       │
│          src/features/*  (TARGET — partially exists today)  │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Composed, domain-aware components                  │
│          src/components/*  (mixed with Layer 1 today)       │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Primitives (domain-agnostic)                       │
│          src/ui/* (post-Phase-1)  +  legacy src/components/ │
└─────────────────────────────────────────────────────────────┘
```

Dependencies point downward only. See `frontend-layering.md` for the full import-rules matrix.

---

## Layer 1 — Primitive components

> **Rule:** zero domain awareness. A Layer 1 primitive must work in any product. Token-only styling. Forbidden imports: anything from `domain`, `services`, `state`, `features`, `pages`.

### Layer 1 — current inventory

| File | Status | Notes |
|---|---|---|
| `src/ui/layout/PageShell.tsx` | ✅ canonical | Phase 1 |
| `src/ui/layout/SectionHeader.tsx` | ✅ canonical | Phase 1 |
| `src/ui/layout/Sidebar.tsx` (+ `SidebarNavItem`) | ✅ canonical | Phase 1 |
| `src/ui/layout/TopBar.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Button.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Input.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Textarea.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Select.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Field.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Dialog.tsx` | ✅ canonical | Phase 1 — replaces `components/ConfirmDialog.tsx` for callers as they migrate |
| `src/ui/controls/Badge.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Skeleton.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/EmptyState.tsx` | ✅ canonical | Phase 1 |
| `src/ui/controls/Toast.tsx` (+ `ToastViewport`) | ✅ canonical | Phase 1 |
| `src/components/Button.tsx` | 🟡 legacy | Stays until all callers swap to `ui/controls/Button`. Delete in Phase 6. |
| `src/components/Card.tsx` | 🟡 legacy primitive | Adequate; no `ui/Card` introduced in Phase 1. Reviewed for promotion in a later cycle. |
| `src/components/Avatar.tsx` | 🟡 legacy primitive | Lacks `alt`; missing a11y. Phase 4 callers will swap to a new `ui/Avatar` OR fix in place — TBD. |
| `src/components/Stepper.tsx` | 🟡 legacy primitive | Adequate. Phase 3 consumes; may promote to `ui/Stepper` if it gains variants. |
| `src/components/ErrorBanner.tsx` | 🟡 legacy primitive | Adequate. Will likely be replaced by `Toast` orchestration in callers; component itself may stay. |
| `src/components/ConfirmDialog.tsx` | 🟡 legacy | Use `ui/controls/Dialog` for new callers. Delete in Phase 6 after all callers swap. |
| `src/components/clsx.ts` | 🟡 legacy utility | Replaced by `src/lib/clsx.ts`. Delete in Phase 6 when last caller is gone. |

### Layer 1 — gaps (not introduced in Phase 1, may emerge in later cycles)

| Missing primitive | Current workaround | Phase that may introduce it |
|---|---|---|
| `Tabs` | Inlined in `DashboardPage.tsx` meetings section | Phase 4 — if Dashboard refactor demands it |
| `Menu` / `Dropdown` | Inlined user menu in `DashboardPage.tsx:432-440` | Phase 4 — same |
| `Tooltip` | None today | Introduce only when a real need lands |
| `Avatar` (in `ui/`) | `src/components/Avatar.tsx` exists | Phase 4 if a11y fix is large; otherwise patch in place |
| `Card` (in `ui/`) | `src/components/Card.tsx` exists | Deferred — adequate today |

Per the discipline rules, **none of these are speculatively built**. They land in the phase that actually needs them.

---

## Layer 2 — Composed, domain-aware components

> **Rule:** these components *know* about domain entities (Booking, EventType, AvailabilityRule, …) but do not own flow orchestration, do not call APIs directly, and do not read URL params. They receive data via props.

### Layer 2 — current inventory

| File | Domain entity it knows | Status | Notes |
|---|---|---|---|
| `src/components/CalendarGrid.tsx` | Booking (slots, dates) | ✅ correct layer | 2,690 bytes. Used by SlotsView. |
| `src/components/SlotButton.tsx` | Booking (a slot) | ✅ correct layer | 1,616 bytes. Composes with CalendarGrid. |
| `src/components/HoldRing.tsx` | Booking (hold countdown) | ✅ correct layer | 660 bytes. Wraps `useCountdown`. |
| `src/components/EventSummary.tsx` | EventType | ✅ correct layer | 2,830 bytes. |
| `src/components/integrations/IntegrationCard.tsx` | CalendarConnection | ✅ correct layer | Used by 3 sites. |

These five components are **correctly placed semantically** but live in `src/components/` next to Layer 1 primitives. They do not need to move folders — the layer is *logical*, not directory-based. (See `frontend-layering.md`: `components/` may contain both primitives and composites; the constraint is on imports, not location.)

A later cleanup may split `src/components/` into two folders (`primitives/`, `composites/`) for clarity, but that is purely cosmetic and out of scope for the modernization initiative.

### Layer 2 — gaps (extracted during their feature's phase)

| Missing composite | Why needed | Phase that introduces it |
|---|---|---|
| `MeetingCard` | DashboardPage meetings list inlines this at `:539-576` (~40 LOC) | Phase 4 |
| `WeeklyRulesEditor` | DashboardPage `:596-630` (~34 LOC of weekly availability grid) | Phase 4 |
| `OverrideEditor` | DashboardPage `:639-900` (~200 LOC of override panel) | Phase 4 |
| `SlotPicker` | Composition of CalendarGrid + slot list (currently inlined in `SlotsView.tsx`) | Phase 5 |
| `DraftManagementPanel` | DraftManagePage internals | Phase 3 |

Composites land as part of the feature shell that consumes them, in the same PR. They do not become a separate cycle.

---

## Layer 3 — Workflow orchestration

> **Rule:** features own end-to-end orchestration of a single workflow. They coordinate state (read from `state/`), API calls (via `services/`), navigation (react-router), and feature-local context. They never reach into other features.

### Layer 3 — current state

`src/features/` does not exist yet. Workflow orchestration today lives inside `src/pages/*` (the giant pages identified in the audit), inside `src/modules/*` (the proto-feature folders), and inside cross-feature `src/state/*` Contexts.

Existing proto-feature folders:

| Today's location | Target feature folder | Phase |
|---|---|---|
| `src/modules/draft-onboarding/state.tsx` | `src/features/draft-onboarding/` | Phase 3 |
| `src/modules/draft-host/tokenStore.ts` | `src/features/draft-host/` | Phase 3 |
| `src/modules/guest-booking/{useGuestBookingActions,tokenStore}.ts` | `src/features/guest-manage/` | Phase 5 |

The `src/modules/` directory is the existing convention for what should be `features/`. The modernization renames it during the phase migrations (per the [no-re-export-bridges rule](semantic-architecture.md)) — files move, imports update, the `src/modules/` directory disappears at Phase 6 cleanup.

### Layer 3 — target inventory (after Phase 5)

```
src/features/
  auth/                  ← extracted from state/AuthContext + lib/authRedirect (logic stays in state/lib; the feature shell uses them)
    LoginShell.tsx
    OAuthCallbackShell.tsx        ← extracts App.tsx OAuth fragment logic into a feature
  onboarding/            ← authenticated onboarding (Connect / Availability / Event / Success)
    OnboardingShell.tsx
    ConnectStep.tsx
    AvailabilityStep.tsx
    EventStep.tsx
    SuccessStep.tsx
    hooks/              ← feature-local hooks (replaces parts of state/OnboardingContext logic that don't need to be global)
  draft-onboarding/      ← unauthenticated onboarding (relocates from src/modules/draft-onboarding/)
    DraftOnboardingShell.tsx
    DraftOnboardingState.tsx     ← moved from src/modules/draft-onboarding/state.tsx
    ConnectStep.tsx
    AvailabilityStep.tsx
    EventStep.tsx
    SuccessStep.tsx
  draft-host/            ← manage / share / claim flows for unauthenticated hosts (relocates from src/modules/draft-host/)
    DraftManageShell.tsx
    DraftShareShell.tsx
    DraftClaimShell.tsx
    tokenStore.ts                ← moved
  booking/               ← public booking flow (extracted from BookingPage + SlotsView + HeldView + DetailsView + ConfirmedView)
    BookingShell.tsx
    SlotsStep.tsx
    DetailsStep.tsx
    HeldStep.tsx
    ConfirmedStep.tsx
    ExpiredStep.tsx
    hooks/             ← extracts useBookingActions
  guest-manage/          ← guest cancel / reschedule (relocates from src/modules/guest-booking/)
    GuestManageShell.tsx
    GuestBookingActionPanel.tsx
    useGuestBookingActions.ts
    tokenStore.ts
  dashboard/             ← extracted from the 922 LOC DashboardPage
    DashboardShell.tsx
    sections/
      MeetingsSection.tsx
      EventTypesSection.tsx
      AvailabilitySection.tsx
      IntegrationsSection.tsx
      SettingsSection.tsx
    hooks/
      useDocumentVisibilityPolling.ts  ← extracts the polling primitive from DashboardPage
      useHostMeetings.ts               ← extracts meetings fetch + polling
  integrations/          ← OAuth connect/disconnect orchestration (shared between Onboarding and Dashboard consumers)
    useIntegrationActions.ts           ← wraps IntegrationContext for action-level use
```

### Layer 3 — gaps

Every feature listed above is a **gap today**. None of them have a dedicated folder. The modernization plan Phases 2–5 are exactly the work to populate them.

The audit's most important Layer 3 gap is **`features/dashboard/`** — extracting the 922 LOC `DashboardPage.tsx` into sectional features is the single biggest payoff in code clarity, and the largest behavioral-risk concentration (5 distinct concerns in one effect chain).

---

## Layer 4 — Route containers

> **Rule:** `pages/*.tsx` files are route wrappers. They resolve URL params, apply `ProtectedRoute` if needed, and render a feature shell. Target: <50 LOC per page.

### Layer 4 — current sizes (audit)

| File | LOC | Should compose | Phase |
|---|---|---|---|
| `pages/LandingPage.tsx` | 40 | `features/auth/LandingShell` (or kept as-is — landing has independent visual identity) | Phase 2 |
| `pages/LoginPage.tsx` | 45 | `features/auth/LoginShell` | Phase 2 |
| `pages/OnboardingConnectPage.tsx` | 5 | `features/onboarding/ConnectStep` | Phase 3 |
| `pages/OnboardingAvailabilityPage.tsx` | 5 | `features/onboarding/AvailabilityStep` | Phase 3 |
| `pages/OnboardingEventPage.tsx` | 185 | `features/onboarding/EventStep` | Phase 3 (carve) |
| `pages/OnboardingSuccessPage.tsx` | 40 | `features/onboarding/SuccessStep` | Phase 3 |
| `pages/draft-onboarding/*Page.tsx` | small | `features/draft-onboarding/*Step` | Phase 3 |
| `pages/draft-host/Draft{Create,Manage,Share,Claim}Page.tsx` | small | `features/draft-host/*Shell` | Phase 3 |
| `pages/DashboardPage.tsx` | **922** | `features/dashboard/DashboardShell` (carve into sections) | Phase 4 |
| `pages/BookingPage.tsx` | 118 | `features/booking/BookingShell` | Phase 5 |
| `pages/SlotsView.tsx` | 194 | `features/booking/SlotsStep` (carve) | Phase 5 |
| `pages/HeldView.tsx` | 69 | `features/booking/HeldStep` | Phase 5 |
| `pages/DetailsView.tsx` | 121 | `features/booking/DetailsStep` | Phase 5 |
| `pages/ConfirmedView.tsx` | 167 | `features/booking/ConfirmedStep` | Phase 5 |
| `pages/guest-booking/GuestManageBookingPage.tsx` | 155 | `features/guest-manage/GuestManageShell` | Phase 5 |

Pages that are already at target size (`5–45` LOC) need no change beyond the feature shell extraction inside them.

`SlotsView`, `HeldView`, `DetailsView`, `ConfirmedView` are misnamed as "pages" — they are FSM-state views rendered by `BookingPage`. They become step components under `features/booking/` during Phase 5.

---

## Cross-cutting: `state/`, `services/`, `lib/`, `shared/`

These four directories are not "layers" in the constitution's sense — they are **utility layers** consumed by Layers 1–4. They sit alongside the layered components, not in the hierarchy.

| Directory | Role | Layering rule |
|---|---|---|
| `src/services/` | API façade + transport selection | Imported by `state/` and `features/`; never by `ui/` |
| `src/lib/` | Pure helpers, auth client, opsLogger | Imported anywhere downward |
| `src/state/` | Cross-feature React state (Auth, Booking FSM, Integration, Onboarding) | Imported by `features/` and `pages/`; never by `ui/` |
| `src/shared/` | Pure utilities (time, formatters) | Imported anywhere |
| `src/hooks/` | Currently mixed — to be decomposed during phases | `useCountdown` is Layer 1.5 (domain-agnostic hook, may move to `ui/`); `useBookingActions`/`useAvailability` are feature-local (move to `features/booking/hooks/` in Phase 5) |
| `src/modules/` | Existing proto-feature folders | Renamed to `features/<flow>/` during their phase migration |
| `src/constants/` | `bookingStatus.ts` only today | `BookingStatus` lifts to `domain/booking.ts` in Phase 5 |
| `src/config/` | `api.ts` (base URL) | Stays |

---

## Components that are currently **at the right layer** but in the wrong location

These do not require moves during the modernization. Recording them only to forestall a future "tidy-up" that would create churn for no behavioral benefit.

| File | Layer | Current location | Could be at | Don't move because |
|---|---|---|---|---|
| `components/CalendarGrid.tsx` | 2 | `components/` | `components/booking/` (folder-by-feature) | Folder convention isn't part of the layering rules; moving creates import churn for no semantic gain |
| `components/SlotButton.tsx` | 2 | `components/` | same | same |
| `components/HoldRing.tsx` | 2 | `components/` | same | same |
| `components/EventSummary.tsx` | 2 | `components/` | same | same |
| `components/integrations/IntegrationCard.tsx` | 2 | already in `components/integrations/` | — | already organized |
| `hooks/useCountdown.ts` | 1.5 | `hooks/` | `ui/hooks/useCountdown.ts` | Reorg postponed; the hook works fine where it is |

The principle: **layer correctness > directory aesthetics**. A composite component in `src/components/` next to a primitive is fine as long as no Layer 1 primitive imports it.

---

## Reading order for migrators

When migrating a page or feature, read in this order:

1. `frontend-layering.md` — import rules.
2. `semantic-architecture.md` — what entities your code touches.
3. This document — where each piece belongs.
4. `behavioral-invariants.md` — what must not change.
5. `ui-primitives-migration-guide.md` — concrete swap recipes.

If after reading all five the right move is still unclear, stop and ask. Do not improvise.
