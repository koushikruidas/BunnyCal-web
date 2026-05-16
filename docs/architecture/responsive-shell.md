# Responsive Shell & Navigation Architecture

> **Status:** binding architectural reference.
> **Scope:** governs the application shell, navigation primitives, breakpoints, and responsive policy. Does **not** redesign workflows; behavior of every flow remains as specified in `behavioral-invariants.md`.
> **Companion docs:** `frontend-layering.md` (import rules), `semantic-architecture.md` (entity boundaries), `component-hierarchy.md` (layer assignment).

This document defines the responsive frame in which every authenticated page lives. It is intentionally short — the goal is that *every reader can hold the entire shell behavior in their head*.

---

## 1. Breakpoints (frozen)

We use **Tailwind defaults**. No custom breakpoints. No `2xl` overrides. No per-component custom screens.

| Breakpoint | Min width | Role |
|---|---|---|
| (none) | 0 | Mobile baseline. Smallest phones. |
| `sm` | 640px | Larger phones. Minor spacing adjustments only. |
| `md` | 768px | **Tablet+ — sidebar appears.** Single most important breakpoint in this product. |
| `lg` | 1024px | Desktop. Comfortable container widths. |
| `xl` | 1280px | Widescreen. No layout change; spacing eases slightly. |
| `2xl` | 1536px | Unused. Reserved. |

**The `md` (768px) breakpoint is the only one that changes navigation structure.** Below it, the mobile bottom nav appears; at or above it, the desktop sidebar appears. Every other breakpoint adjusts spacing or container widths only.

---

## 2. Shell architecture

```
AppShell                           (ui/layout/AppShell.tsx)
├── background (gradient | plain)
├── sidebar slot     — visible md+ only
├── topBar slot      — optional, all breakpoints
├── main             — content + mainWidth constraint
└── mobileNav slot   — visible below md only, fixed bottom
```

**Composition pattern** (every authenticated route during its migration):

```tsx
// inside features/<flow>/<Flow>Shell.tsx
import { AppShell, Sidebar, SidebarNavItem, MobileNav, MobileNavItem } from "@/ui/layout";

const navItems = [
  { to: "/dashboard", label: "Home", icon: <HomeIcon /> },
  { to: "/dashboard", label: "Meetings", icon: <MeetingsIcon /> },
  { to: "/dashboard/availability", label: "Availability", icon: <AvailabilityIcon /> },
  { to: "/dashboard/event-types", label: "Event Types", icon: <EventTypesIcon /> },
  { to: "/dashboard/integrations", label: "Integrations", icon: <IntegrationsIcon /> },
  { to: "/dashboard/settings", label: "Settings", icon: <SettingsIcon /> },
];

const primaryNav = navItems.slice(0, 3);
const secondaryNav = navItems.slice(3);

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sidebar={<DashboardSidebar />}
      mobileNav={<DashboardMobileNav />}
    >
      {children}
    </AppShell>
  );
}
```

Two important rules:

1. **The same nav data drives both sidebar and mobile nav.** A single source of truth in the feature; the two primitives consume it.
2. **AppShell is composition-only.** It does not know about routes, authentication, or domain. The feature provides the actual nav content. This preserves the `ui/* must not import from domain/state/services/features/pages` rule.

---

## 3. Navigation architecture

### 3.1 Items and grouping

Per the modernization brief:

**Primary** (workflow surfaces — always visible at the top of nav):
- Home (`/dashboard`)
- Meetings (`/dashboard`, same destination today; a future phase may split into `/dashboard/meetings`)
- Availability (`/dashboard/availability`)

**Secondary** (configuration — visually grouped under the primary on desktop, accessible via Settings on mobile):
- Event Types (`/dashboard/event-types`)
- Integrations (`/dashboard/integrations`)
- Settings (`/dashboard/settings`)

**Availability is a primary surface, not a settings surface.** It is a workflow, not a configuration. This is governance — do not move it to the secondary group, even if a future "tidy" suggests otherwise.

### 3.2 Desktop sidebar layout

```
┌──────────────┐
│  brand       │   — workspace / app mark
├──────────────┤
│ ▸ Home       │
│   Meetings   │   (primary group)
│   Availability│
├──────────────┤
│   Event Types│
│   Integrations│  (secondary group, separated by a Divider)
│   Settings   │
├──────────────┤
│  user menu   │   — footer slot
└──────────────┘
```

- One nav landmark (`<nav>` from the `Sidebar` primitive).
- Active item carries `aria-current="page"` AND a visible accent (color + background tint — the existing `SidebarNavItem` primitive handles this).
- Group separation is purely visual (a `Divider` between primary and secondary). Both groups are inside the same `<nav>` — they are not separate landmarks.

### 3.3 Mobile bottom nav layout

```
┌──────────────────────────────┐
│        Page content          │
│                              │
│         (scrolls)            │
│                              │
├──────────────────────────────┤
│  ▸Home  Mtgs  Avail  Settings│   — fixed bottom
└──────────────────────────────┘
```

- 4 items max in the bar: Home, Meetings, Availability, Settings.
- Event Types and Integrations are reached from the Settings page (workflow continuity — the user navigates into "configure" once, then sub-navigates within).
- Each item is 44px minimum height (constitution §31 touch target).
- Active item carries `aria-current="page"` AND a top indicator bar (color alone is insufficient).
- Edge-to-edge horizontally; safe-area-inset-bottom padding clears the iOS home indicator.
- Opaque surface — never translucent. Translucency over scrolling content reduces readability.

### 3.4 What mobile navigation explicitly does NOT do

- No hamburger menu. A 4-item bottom nav is shallower than a hamburger drawer and exposes the destinations directly.
- No nested drawers or sheets for primary navigation.
- No swipe-to-reveal sidebars.
- No "More" overflow menu (Settings serves the role implicitly).
- No animated transitions between routes (route change is instantaneous; the user does not need motion to know they navigated).

The constitution (§9) sets the navigation depth ceiling at 3 levels. The mobile nav stays at depth 1: tab → page. Sub-navigation inside Settings is depth 2. We never reach depth 3 via navigation alone.

---

## 4. Layout primitives (Phase 2 inventory)

All new primitives live in `src/ui/layout/`:

| Primitive | Role | Notes |
|---|---|---|
| `AppShell` | Responsive shell (sidebar + topBar + main + mobileNav) | The one place that owns the md-breakpoint policy. |
| `SplitPane` | Generic 2-column responsive layout | Used by AppShell internally; available for non-shell cases (e.g., booking page aside/main). |
| `MobileNav` + `MobileNavItem` | Fixed-bottom mobile tab bar | Hidden at md+. |
| `Stack` | Vertical layout with token-constrained gaps | gap ∈ {0,1,2,3,4,5,6,8,10,12}. |
| `Inline` | Horizontal layout with optional wrap | gap ∈ {0,1,2,3,4,5,6,8}; align, justify, wrap. |
| `Divider` | Semantic separator | horizontal (`<hr>`) or vertical (1px column). |

**Phase 1 primitives still apply** — `PageShell` (used by unauthenticated pages), `SectionHeader`, `Sidebar`, `SidebarNavItem`, `TopBar`. The new `AppShell` replaces `PageShell` for *authenticated* surfaces; `PageShell` remains the canonical wrapper for landing / login / public booking / draft onboarding.

---

## 5. Container strategy

Three canonical container widths, defined as tokens in `tailwind.config.js`:

| Token | Width | Use |
|---|---|---|
| `narrow` | 480px | Single-column forms (login, focused tasks) |
| `comfort` | 720px | Reading width (success pages, simple content) |
| `wide` | 1120px | App shell main column (dashboard, booking) |

Plus `full` (no max-width — used by AppShell's `mainWidth="full"` for surfaces that paint their own background like a landing page).

**Rules:**
- No new arbitrary `max-w-[1100px]` / `max-w-[1200px]` / `max-w-2xl` etc. in new code. Use the tokens.
- AppShell's `mainWidth` prop selects the constraint on the main column. The sidebar always renders at its fixed 260px (SplitPane's `asideWidth="default"`).
- Margins outside the main column (the gutters of AppShell) come from AppShell's own padding (`p-4 sm:p-5 md:p-6`).

**Why three widths and not more:** the audit found seven ad-hoc widths in use. Three is the minimum that covers all real surfaces (narrow forms, reading content, app dashboards). A fourth would invite drift.

---

## 6. Responsive rules (binding)

These are the constitution §31 / §32 governance items, made concrete:

### 6.1 No responsive reordering that changes workflow meaning

A nav item that appears as the third item on desktop must remain the third item on mobile. The same nav data flows through both `Sidebar` and `MobileNav`; the rendering differs but the order does not.

The same applies inside pages: a primary CTA at the top of a desktop layout must remain at the top of the mobile layout. Reordering to "fit better on mobile" violates spatial memory (constitution §10).

### 6.2 Mobile layouts preserve booking continuity

Below md, the booking flow (`/book/:username/:eventTypeSlug`) must remain a single-column, full-width sequence of: event summary → slot picker → details → hold → confirmation. The mobile nav does not appear on public booking routes — booking is a focused-task flow and the nav would compete for attention.

**Concrete rule:** unauthenticated routes (`/`, `/sign-in`, `/book/*`, `/public/*`, `/d/*`, `/manage/*`) use `PageShell`, **not** `AppShell`. Only authenticated `/dashboard/*` and `/onboarding/*` routes use `AppShell`.

### 6.3 No layout density increase on large screens

`mainWidth="wide"` (1120px) is the maximum content width on desktop. Beyond 1280px the surrounding canvas grows — the content does not. This is intentional: density does not equal premium.

No multi-column dashboards. No widget grids. No analytics-style 4-column overviews. The constitution (§9) prohibits this kind of layout.

### 6.4 Spacing rhythm

Use `Stack` / `Inline` gaps. The eight allowed values (`0, 1, 2, 3, 4, 5, 6, 8`, plus `10, 12` on `Stack`) cover every real case. `gap-[7]` is forbidden, as is `gap-[26px]`.

### 6.5 No animated transitions across breakpoints

When the viewport crosses md (e.g., a user rotates a tablet), the layout snaps instantly. No fade, no slide, no shimmer. Animated breakpoint transitions are layout-shift bombs on imperfect devices and degrade the perceived stability of the product.

### 6.6 Reduced motion

All shell behaviors honor `prefers-reduced-motion: reduce` via the global handler in `globals.css`. Specifically:
- Active-state color transitions (140ms) are reduced to instant.
- The mobile-nav top-indicator bar transition is reduced to instant.
- Sidebar item hover transitions are reduced to instant.

No new motion is introduced by the shell beyond these existing transitions.

---

## 7. Accessibility (binding)

### 7.1 Landmarks per breakpoint

- Desktop: one `<aside>` (sidebar, `aria-label="Primary"`), one `<main>`, optional `<header>` (top bar).
- Mobile: one `<main>`, one `<nav>` (the MobileNav, `aria-label="Primary"`).

The landmark inventory differs by breakpoint — there is no `<aside>` on mobile because the sidebar is not rendered. This is acceptable: screen readers announce the structure of what's actually visible.

### 7.2 Focus continuity across breakpoint changes

If a user resizes the viewport (or rotates) while focus is inside the sidebar, focus is lost when the sidebar is hidden. **This is acceptable for the modernization phase.** Restoring focus to an equivalent mobile-nav item across a resize is speculative future flexibility and out of scope.

### 7.3 Keyboard navigation

- Sidebar items: standard Tab order, top to bottom.
- Mobile nav items: standard Tab order, left to right.
- `aria-current="page"` is set on the active item in both.
- Skip-link (TBD in Phase 3) will bypass the sidebar/nav and land at `<main>`.

### 7.4 Focus visibility

All nav items use the `.focus-ring` utility (box-shadow, not outline) so the focus ring is consistent across the app and does not trigger layout shift.

---

## 8. Validation policy

This phase **introduces the primitives** but does not migrate any existing route to `AppShell`. The validation strategy:

- Type-check passes (`npm run lint`).
- Vite build passes (`npm run build`).
- Per `testing-strategy.md` §0.6, visual baselines for the dashboard, booking, and onboarding routes remain unchanged — these routes still use the *existing* layout.
- A future PR (per-phase, starting Phase 3 with onboarding) swaps a single feature shell to `AppShell`. That migration is gated on visual snapshot review and the per-phase acceptance criteria from the modernization plan.

**Do not wire `AppShell` into existing routes in this phase.** Doing so would change visual output across all routes simultaneously and violate the per-phase scope rule.

---

## 9. What this document does not contain

- Specific icon designs / icon library decisions — deferred until the first feature shell migration needs them.
- Mobile-specific drawer / sheet primitives — not introduced; the navigation pattern (4-tab bottom + sub-nav inside Settings) avoids the need.
- Sidebar collapse-to-icon-only behavior — speculative; not introduced.
- Skip-link primitive — TBD in Phase 3 (its first consumer is the onboarding shell).
- Notification center, command palette, or any other shell affordance — not in scope.

If a question is not answered here and not answered in the companion documents, stop and ask. Do not improvise shell behavior.
