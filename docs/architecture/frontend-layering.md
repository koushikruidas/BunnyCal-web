# Frontend Layering — Practical Reference

> **Audience:** anyone editing `src/`.
> **Authority:** operational companion to `docs/governance/bunnycal-frontend-constitution-v4.md` §23 (Component Layering Governance) and §24 (State Architecture Governance). When the constitution says *what*, this document says *where*.
> **Status:** binding. Layering violations block merge.

## Dependency direction

```
pages ─┐
       ├─► features ─┐
       │             ├─► components ─┐
       │             │               ├─► ui ─► (tokens, std lib)
       │             │               │
       │             ├─► state ──────┤
       │             │               │
       └─► state ────┤               │
                     ├─► services ───┘
                     ├─► lib
                     └─► domain
```

**Rule:** imports point down only. A lower layer never imports from a higher one. Layers at the same level (`state`, `services`, `lib`, `domain`) do not import from each other except as shown above.

| Layer | May import from |
|---|---|
| `pages/` | `features`, `state`, `domain`, `lib`, `shared`, react-router |
| `features/` | `components`, `ui`, `state`, `services`, `domain`, `lib`, `shared` |
| `components/` | `ui`, `domain`, `lib`, `shared` |
| `ui/` | `lib` (utility-only), `shared` (formatters only), `clsx`, react |
| `state/` | `services`, `domain`, `lib`, `shared` |
| `services/` | `lib`, `domain` |
| `lib/` | `domain`, std lib |
| `domain/` | std lib only — no React, no I/O |
| `shared/` | std lib only |

**Forbidden everywhere:**
- `features/X` importing from `features/Y`. If two features need to coordinate, lift the contract into `domain/` or `state/`.
- `ui/*` importing from `domain`, `services`, `state`, `features`, or `pages`.
- `components/*` importing from `pages` or `features`.
- Any non-`state/` file creating a React Context that is read across feature boundaries.

Enforcement: `eslint-plugin-boundaries` (or equivalent), warnings during Phases 1–5, errors at Phase 6.

---

## Layer responsibilities

### `ui/` — primitives

**Owns:** look, feel, motion, and a11y of generic building blocks. Two sub-folders:

- `ui/layout/` — `PageShell`, `ContentContainer`, `Stack`, `Inline`, `Cluster`, `SectionHeader`, `SplitPane`, `Divider`. Establish rhythm and viewport behavior.
- `ui/controls/` — `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `TimeInput`, `DateInput`, `Field`, `Modal`, `ConfirmDialog`, `Tooltip`, `Menu`, `Toast`, `Card`, `Badge`, `Skeleton`, `Spinner`, `Tabs`, `Avatar`, `Stepper`.

**Forbidden:**
- Domain awareness. A `Button` does not know what a Booking is.
- Hardcoded hex, ad-hoc shadows, ad-hoc spacing. Use tokens.
- Motion outside the defined durations (`duration-instant|fast|base|slow`). Must respect `prefers-reduced-motion`.
- Inline `<button>` / `<input>` inside other ui/ components — compose primitives.

**Must:**
- Visual snapshot baseline per variant.
- Pass reduced-motion test.
- Reserve fixed geometry for state changes (Skeleton matches loaded height; Field reserves error slot).

### `components/` — composed, domain-aware

**Owns:** reusable surfaces that know about domain entities. Examples: `MeetingCard`, `SlotPicker`, `WeeklyRulesEditor`, `OverrideEditor`, `IntegrationCard`, `EventSummary`, `CalendarGrid`, `HoldRing`, `SlotButton`.

**Forbidden:**
- Route orchestration (no `useNavigate`, no `useParams`, no `useLocation` reading).
- Direct API calls. Always receive data via props or via a hook injected by the parent feature.
- Knowledge of which feature consumes them.

**Must:**
- Accept all variability via props. If two features need slightly different versions, accept a prop — do not fork the component.

### `features/` — flow shells

**Owns:** end-to-end orchestration of a single workflow. One folder per flow: `booking/`, `onboarding/`, `guest-manage/`, `dashboard/`, `draft-host/`, `integrations/`, `auth/`.

Each feature folder typically contains:
- a shell component (the flow's top-level layout),
- step or section components (composed of `components/` + `ui/`),
- feature-local hooks that coordinate `state/` and `services/`,
- feature-local types (lifted to `domain/` only when shared cross-feature).

**Forbidden:**
- Importing from another `features/*`. Cross-feature coordination goes through `domain/` (types) or `state/` (runtime).
- Owning route definitions. Routes are declared in `pages/` (which composes the feature shell).
- Mutating other features' state.

**Must:**
- Use feature-local React Context for state that is scoped to the flow and does not need to survive route changes.
- Read from `state/` Contexts (`Auth`, `Booking`, `Integration`, `Onboarding`) for cross-feature state.

### `pages/` — route wrappers

**Owns:** route declarations and the composition of feature shells. Target: under 50 LOC per page after Phase 5.

**Forbidden:**
- Business logic.
- Direct API calls.
- Inline subcomponents larger than ~20 LOC. Extract into the feature or component layer.

**Must:**
- Resolve URL params, guard with `ProtectedRoute` if applicable, render the feature shell.

---

## State ownership boundaries

Per constitution §24:

| State kind | Owner | Where it lives |
|---|---|---|
| Bookings, availability, calendar connections, lifecycle state | **Server** (truth) | mirrored read-only in `state/` Contexts |
| Auth identity + session | `state/AuthContext.tsx` | one Context, app-wide |
| Booking flow machine (transient interaction state) | `state/BookingContext.tsx` + `state/bookingMachine.ts` | scoped to public booking route subtree |
| Integration status map + OAuth pending intent | `state/IntegrationContext.tsx` | one Context, app-wide |
| Authenticated onboarding draft | `state/OnboardingContext.tsx` | one Context, scoped to `/onboarding/*` |
| Unauthenticated onboarding draft | `modules/draft-onboarding/state.tsx` | scoped to `/d/onboarding/*` |
| Per-feature transient UI state (open/closed, tab selection, hover) | feature-local Context or `useState` | inside the feature folder |
| Capability tokens (draft-host, guest-manage) | `modules/*/tokenStore.ts` | localStorage; reads via the tokenStore module only |

**Rules:**

1. **No new global Context outside `state/`.** Feature-local Contexts live in the feature folder.
2. **No client-state library** (Zustand, Redux, Jotai, ...). See `docs/governance/adr-001-no-state-libraries.md`.
3. **No server-state library** (React Query, SWR, ...) during Phases 1–5. See ADR-001.
4. **The booking FSM is the authority on lifecycle.** No parallel "booking status" piece of state may exist; all readers consume `bookingMachine` state via `BookingContext`.
5. **Persistence layers are explicit and named:**
   - `localStorage` — auth access token (mirror), integration status cache, draft-host tokens, guest-manage tokens, dashboard hidden-meeting IDs.
   - `sessionStorage` — booking machine state (per `username/slug`, versioned), onboarding draft, OAuth pending intent.
   - Any new persistence introduction is an ADR-grade decision.

**A change that broadens what a Context owns is an architectural change** — call it out in the PR description. A Context that grows fields incrementally without scrutiny becomes the next monolith.

---

## Quick reference for common questions

- **"Where does this hook go?"** If it touches DOM/React APIs, `ui/` (generic) or `components/` (domain-aware). If it coordinates a flow, `features/<flow>/hooks/`. If it's pure logic, `lib/`.
- **"Where does this type go?"** If it describes a server response, `services/types.ts` for now (lifted to `domain/` only when its feature migrates per plan §4). If it describes a UI-only shape, co-locate with its consumer.
- **"Where does this utility go?"** Pure (no React, no DOM): `lib/`. Time-specific: `shared/time/`. Tied to a domain entity: `domain/<entity>.ts`.
- **"This feature needs data from another feature."** It needs *domain types* from another concern — lift the types to `domain/`. It does not need to import from another `features/*`.
- **"This component is used in two features and they need slightly different versions."** Accept a prop. Do not fork. Do not create a wrapper-per-feature.

---

## References

- Constitution: `docs/governance/bunnycal-frontend-constitution-v4.md` §22–§26.
- Invariants: `docs/governance/behavioral-invariants.md`.
- ADR-001 (no state libraries): `docs/governance/adr-001-no-state-libraries.md`.
- Modernization plan: `~/.claude/plans/you-are-working-on-parsed-hippo.md` §5 (Component Layering Recommendation) and §4 (Domain Modeling — incremental lift).
