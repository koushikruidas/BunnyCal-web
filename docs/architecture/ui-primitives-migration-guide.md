# `ui/` Primitives — Migration Guide

> **Audience:** anyone migrating an existing page or component to consume the new `ui/` primitives.
> **Status:** binding from Phase 2 onward. Reading this before opening a migration PR is mandatory.
> **Authority:** sits under `docs/architecture/frontend-layering.md` and the modernization plan.

## Scope of this guide

This guide is a **swap reference**. For each existing pattern in `src/`, it names the new primitive and the exact substitution to make. It is not a redesign reference — modernization is behavior-preserving (constitution §49). If a swap would change UX behavior, stop and escalate.

## What's available

```
src/ui/
  layout/
    PageShell        — top-level frame, container, background
    SectionHeader    — title + eyebrow + description + action
    Sidebar, SidebarNavItem
    TopBar
  controls/
    Button           — primary | secondary | ghost | danger; sm | md | lg
    Input, Textarea, Select
    Field            — label + control + error/hint with reserved height
    Dialog           — focus-trapped, scroll-locked, viewport-centered
    Badge            — neutral | accent | danger | success | warning | info
    Skeleton         — block | text | circle (respects reduced-motion)
    EmptyState       — icon + title + description + action
    Toast, ToastViewport — visual only; consumer manages the queue
```

Import paths:

```ts
import { PageShell, SectionHeader, Sidebar, SidebarNavItem, TopBar } from "@/ui/layout";
import { Button, Input, Textarea, Select, Field, Dialog, Badge, Skeleton, EmptyState, Toast, ToastViewport } from "@/ui/controls";
// Or, more loosely:
import { Button, Field, Dialog } from "@/ui";
```

## Hard rules

1. **No raw hex in migrated code.** Every color comes from a semantic token (`text-text-primary`, `border-default`, `bg-surface`, `bg-danger-surface`, …). The audit found ~67 raw hex literals; that number should monotonically decrease.
2. **No raw `<button>` in migrated code.** Use `<Button>`. The lone exception is the close affordance inside primitives themselves (already handled by `Toast` / `Dialog`).
3. **No inline modal markup.** Use `<Dialog>`. The existing `ConfirmDialog` in `src/components/` stays in place until its callers swap; do not delete it.
4. **No inline `animate-pulse` skeleton divs.** Use `<Skeleton>`.
5. **No inline transition durations.** Use `duration-instant | duration-fast | duration-base | duration-slow`.
6. **No imports from `ui/*` into `domain/`, `services/`, `state/`, `features/*`/another, or `pages/*`.** See `frontend-layering.md`.
7. **A migration commit changes pixels intentionally or not at all.** If a swap shifts pixels, capture a visual snapshot diff and explain it in the PR. If it doesn't shift pixels, no snapshot update is needed.

## Swap recipes

### Raw button → `<Button>`

**Before** (`pages/LoginPage.tsx:33-40` and ~12 other sites):
```tsx
<button
  type="submit"
  className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white"
>
  Sign in
</button>
```

**After:**
```tsx
<Button type="submit">Sign in</Button>
```

Variant cheat sheet:
- Primary CTA → `variant="primary"` (default)
- Secondary / cancel → `variant="secondary"`
- Tertiary / inline action → `variant="ghost"`
- Destructive confirm → `variant="danger"`

Size cheat sheet:
- Default → `size="md"` (44px tall, meets touch target)
- Compact toolbar / table action → `size="sm"` (36px)
- Hero / primary onboarding CTA → `size="lg"` (52px)

### Inline card pattern → existing `Card` (for now)

There are 8+ inline `rounded-2xl border bg-white p-5` patterns reimplementing the existing `Card`. **Phase 1 does not introduce a new `Card` primitive in `ui/`** (the existing one in `src/components/Card.tsx` is adequate and unchanged). For these surfaces, swap the inline div for the existing `<Card>` component. A new `ui/controls/Card` may land in a later cycle when the audit's gaps make it necessary.

### `ConfirmDialog` (components/) → `<Dialog>`

**Before** (e.g. `pages/DashboardPage.tsx` cancel-meeting modal):
```tsx
<ConfirmDialog
  open={isOpen}
  title="Cancel meeting?"
  description="The attendee will be notified."
  confirmLabel="Cancel meeting"
  cancelLabel="Keep"
  tone="danger"
  pending={pending}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**After:**
```tsx
<Dialog
  open={isOpen}
  onClose={() => { if (!pending) handleCancel(); }}
  dismissible={!pending}
  title="Cancel meeting?"
  description="The attendee will be notified."
  footer={
    <>
      <Button variant="secondary" onClick={handleCancel} disabled={pending}>
        Keep
      </Button>
      <Button variant="danger" onClick={handleConfirm} loading={pending}>
        Cancel meeting
      </Button>
    </>
  }
/>
```

Differences to be aware of:
- The new `<Dialog>` provides a real focus trap, scroll-lock, and scrollbar-width compensation. The old `ConfirmDialog` did none of these. Visual-stability invariant #15-4 (modal anchoring) is now satisfied by the primitive itself.
- The `pending` concept moves to a combination of `dismissible={!pending}` on `Dialog` plus `loading` / `disabled` on the inner `Button`s. The consumer composes the two — no hidden coupling.

### Inline overlay markup → `<Dialog>`

Search for `fixed inset-0` in pages — every match outside `Dialog`/`ConfirmDialog` must move into `<Dialog>` during its phase migration. Do not invent new overlay backdrops.

### Skeleton div → `<Skeleton>`

**Before** (`DashboardPage.tsx:483` and similar):
```tsx
{Array.from({ length: 5 }).map((_, i) => (
  <div key={i} className="h-28 rounded-2xl bg-[#eef2ff] animate-pulse" />
))}
```

**After:**
```tsx
{Array.from({ length: 5 }).map((_, i) => (
  <Skeleton key={i} className="h-28 w-full" ariaLabel="Loading meeting" />
))}
```

**Critical:** the `className` must produce the same height/width as the loaded content. Otherwise data load causes layout shift (invariant #15-1).

### Status badge → `<Badge>`

The `statusBadge()` / `toneBadge()` helpers inlined in `DashboardPage.tsx:53-73` map a status string to a className. After migration:

```tsx
// Before
<span className={statusBadge(booking.status)}>{booking.status}</span>

// After
<Badge tone={toneForStatus(booking.status)}>{labelForStatus(booking.status)}</Badge>
```

`toneForStatus` and `labelForStatus` are pure functions belonging to the feature's view-model (`features/dashboard/`), not to `ui/`. The primitive is tone-agnostic; the feature is status-aware.

### Form inputs → `<Field>` + `<Input>` / `<Textarea>` / `<Select>`

**Before** (`OnboardingEventPage.tsx:118-145` and similar):
```tsx
<label className="block">
  <span className="text-[13px] font-medium text-[#475569]">Event name</span>
  <input
    type="text"
    className="mt-1.5 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
  {error ? <p className="mt-1 text-[12px] text-[#dc2626]">{error}</p> : null}
</label>
```

**After:**
```tsx
<Field
  label="Event name"
  htmlFor="event-name"
  error={error}
  hint="Shown to invitees on the booking page."
  required
>
  <Input
    id="event-name"
    name="eventName"
    value={name}
    onChange={(e) => setName(e.target.value)}
    invalid={Boolean(error)}
    aria-describedby={error ? "event-name-error" : "event-name-hint"}
  />
</Field>
```

`Field` reserves min-height for the error slot — toggling validation does not shift the form (invariant #15-5).

### Empty-list state → `<EmptyState>`

**Before** (DashboardPage meetings tab, no upcoming meetings):
```tsx
<div className="text-center py-10 text-[#64748b]">
  <p className="text-sm">No upcoming meetings.</p>
</div>
```

**After:**
```tsx
<EmptyState
  icon={<CalendarIcon />}
  title="No upcoming meetings"
  description="Share your booking link to start receiving bookings."
  action={<Button onClick={copyLink}>Copy booking link</Button>}
/>
```

### Page wrapper → `<PageShell>`

**Before** (`DashboardPage.tsx:401`):
```tsx
<div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_45%,#f9fbff_100%)] px-4 py-5 sm:px-5 sm:py-6">
  <div className="mx-auto max-w-[1200px]">
    {/* page content */}
  </div>
</div>
```

**After:**
```tsx
<PageShell width="wide">
  {/* page content */}
</PageShell>
```

For login / focused-task pages:
```tsx
<PageShell width="narrow" background="plain">
  {/* form */}
</PageShell>
```

For marketing surfaces that need their own background, `width="full" background="plain"` and the surface paints its own gradient.

### Section heading → `<SectionHeader>`

**Before** (most page section headers today):
```tsx
<div className="flex items-end justify-between">
  <div>
    <p className="text-[11px] uppercase text-[#64748b]">Availability</p>
    <h2 className="text-xl font-semibold text-[#0f172a]">Weekly hours</h2>
  </div>
  <button>Edit</button>
</div>
```

**After:**
```tsx
<SectionHeader
  eyebrow="Availability"
  title="Weekly hours"
  description="When invitees can pick a slot."
  action={<Button variant="ghost" size="sm">Edit</Button>}
/>
```

## Token reference — common substitutions

| Old (raw) | New (semantic) |
|---|---|
| `bg-white` | `bg-surface` |
| `bg-[#f5f8ff]` / `bg-[#eef2ff]` | `bg-surface-sunken` |
| `bg-[#0f172a]` (dark buttons) | `bg-surface-inverse` |
| `text-[#0f172a]` | `text-text-primary` |
| `text-[#475569]` | `text-text-secondary` |
| `text-[#64748b]` | `text-text-tertiary` |
| `text-white` (on accent) | `text-text-on-accent` or `text-text-on-inverse` |
| `border-[#d1d5db]` | `border-border-default` |
| `border-[#e2e8f0]` / `border-[#dbe4f8]` | `border-border-subtle` |
| `border-[#94a3b8]` | `border-border-strong` |
| `text-[#dc2626]` / `bg-[#fee2e2]` | `text-danger-fg` / `bg-danger-surface` |
| `text-[#065f46]` / `bg-[#d1fae5]` | `text-success-fg` / `bg-success-surface` |
| `text-[22px]` / `text-[26px]` / `text-2xl` (titles) | `text-h1`, `text-h2`, `text-h3` |
| `text-sm` (body) | `text-body` (15px) — **note: 1px larger than text-sm** |
| `text-[13px]` / `text-[13.5px]` | `text-body-sm` |
| `text-[12px]` / `text-[11px]` | `text-caption`, `text-eyebrow` |
| `transition duration-150` | `duration-fast` |
| `transition duration-200` / `300` | `duration-base` |
| `rounded-[12px]` | `rounded-xl` |
| `shadow-[0_14px_40px_...]` | `shadow-floating` |
| `shadow-[0_18px_50px_...]` (modal) | `shadow-modal` |

If you find an old value that does not have a clean target above, stop and ask — do not invent.

## Patterns we do not yet have a primitive for

These will be addressed in later cycles, not Phase 1:
- **`Tabs`** — currently inlined in `DashboardPage` meetings section. Keep inline for now.
- **`Menu` / `Dropdown`** — user menu inlined in `DashboardPage`. Keep inline for now.
- **`Tooltip`** — none today; not introduced until a real need lands.
- **`Stepper` (new)** — `components/Stepper.tsx` exists; keep using it. A future `ui/Stepper` may replace.
- **`Card` (new)** — `components/Card.tsx` exists; keep using it.

Phase migrations may surface the need for these; if so, propose a new primitive in the migration PR and land it as a separate commit *before* the page swap.

## Common mistakes to avoid

1. **Bumping the FSM version while touching `BookingContext`.** Invariant #4 says `BookingContext.tsx:17` version is frozen.
2. **Changing idempotency key generation timing** as a "tidy-up." Invariant #7 — leave `useBookingActions.ts:7-11, 44-50` alone.
3. **Adding focus trap to the *existing* `ConfirmDialog`.** That's a behavior change to a non-migrated path. Just swap callers to `ui/Dialog` per phase.
4. **Refactoring `ConfirmDialog` callers to use `ui/Dialog` outside their phase.** Each migration is bounded to its phase scope. Touching surfaces outside the phase expands the review surface.
5. **Promoting `lib/dateTime.ts`** — it's a deprecated re-export bridge. Use `shared/time/*` directly. The bridge is removed in Phase 6 only.
6. **Importing a primitive into `state/` or `services/`.** Forbidden — see `frontend-layering.md`.

## When in doubt

- Re-read `docs/governance/behavioral-invariants.md`.
- Check the modernization plan's phase boundary — does this change belong in your phase?
- Stop and ask. Discipline over speed.
