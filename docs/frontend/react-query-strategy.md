# React Query Strategy

## Purpose

This document records the intended TanStack Query strategy for server-state resources in the frontend. It exists to keep caching, refetch, polling, and invalidation behavior explicit instead of being scattered across route components.

## Query Key Strategy

- Use stable array keys.
- Use a top-level resource noun first.
- Add scoped parameters as later key parts when a resource has multiple shapes.
- Keep user-local UI state out of React Query. Examples: hidden meetings, selected tabs, open dialogs.

Current and planned keys:

| Resource | Query key |
|---|---|
| Profile | `["me"]` |
| Calendar status | `["calendar-status"]` |
| Conferencing status | `["conferencing-status"]` |
| Event types | `["event-types"]` |
| Availability overrides | `["availability-overrides"]` |
| Meetings (planned) | `["meetings", "me", { upcomingOnly: false, limit: 50 }]` |

## Resource Strategy

### Profile

- Endpoint: `GET /api/me`
- Query key: `["me"]`
- `staleTime`: `10 minutes`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: none
- Invalidation triggers:
  - OAuth callback hydration
  - logout / unauthorized cleanup
  - explicit auth refresh paths
- Rationale:
  - User profile is relatively static.
  - Cached profile should render immediately.
  - Cookie-backed auth bootstrap must still attempt `/api/me` even without a local bearer token.

### Calendar Status

- Endpoint: `GET /integrations/calendar/status`
- Query key: `["calendar-status"]`
- `staleTime`: `5 minutes`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: none
- Invalidation triggers:
  - calendar connect/disconnect
  - calendar OAuth return
  - explicit refresh action
  - logout / unauthorized cleanup
- Rationale:
  - Integration state changes only after explicit user actions or external provider changes.
  - Background refresh should not block rendering.

### Conferencing Status

- Endpoint: `GET /integrations/conferencing/status`
- Query key: `["conferencing-status"]`
- `staleTime`: `5 minutes`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: none
- Invalidation triggers:
  - conferencing connect/disconnect
  - conferencing OAuth return
  - explicit refresh action
  - calendar connect/disconnect for calendar-backed conferencing providers (`google`, `microsoft`)
  - logout / unauthorized cleanup
- Rationale:
  - Conferencing capability is usually static between explicit changes.
  - Google Meet and Microsoft Teams can be calendar-derived, so calendar changes must also refresh this query.

### Event Types

- Endpoint: `GET /api/event-types`
- Query key: `["event-types"]`
- `staleTime`: `10 minutes`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: none
- Invalidation triggers:
  - successful event-type creation from dashboard event editor
  - future event-type edit/delete flows should invalidate the same key
  - explicit retry action on the event-types surface
- Rationale:
  - Event types are host-managed configuration, not fast-moving operational state.
  - Cached data should be reused across dashboard navigation.

### Availability Overrides

- Endpoint: `GET /api/availability/overrides`
- Query key: `["availability-overrides"]`
- `staleTime`: `5 minutes`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: none
- Invalidation triggers:
  - explicit retry / manual refresh if added later
  - future bulk availability flows should invalidate when they affect the override list shape
- Cache update triggers:
  - successful override creation appends to cached list
  - override deletion removes from cached list and rolls back on failure
- Rationale:
  - Overrides change occasionally but should stay fresh within the current dashboard session.
  - Local cache updates give immediate UI feedback without forcing a full refetch.

### Meetings

- Endpoint: `GET /api/bookings/me/meetings?upcomingOnly=false&limit=50`
- Query key: `["meetings", "me", { upcomingOnly: false, limit: 50 }]`
- `staleTime`: `30 seconds`
- `gcTime`: `30 minutes`
- `refetchOnWindowFocus`: `false`
- Polling: `30 seconds`
- Invalidation triggers:
  - host meeting cancellation
  - explicit retry action
  - future reschedule / reconciliation actions
- Rationale:
  - Meetings are operational state and change more often than configuration.
  - They need periodic refresh, but not at the same cadence as integrations or profile.
  - Hidden-item state remains local UI state and is intentionally not part of the query key.

## Phase Plan

### Phase 1

Migrate:

- `event-types`
- `availability-overrides`

Scope:

- Replace manual mount-effect fetches with `useQuery`.
- Preserve existing UI state and mutation flows.
- Leave meetings for a separate migration step.

### Phase 2

Migrate:

- `meetings`

Status:

- completed with a dedicated meetings query
- old manual mount, focus, and interval effects were removed

## Meetings Analysis Before Migration

### Historical polling behavior

- The pre-migration implementation polled every `15 seconds`.
- It also manually refetched on `window.focus` and `document.visibilitychange`.

Implemented decision:

- Use `refetchInterval: 30_000`.
- Do not keep the manual focus/visibility refresh behavior.

### Focus refresh behavior

- `refetchOnWindowFocus` stays `false`.
- Query polling is the only automatic refresh mechanism.
- This avoids stacking interval polling with additional focus-triggered bursts.

### Hidden-item state

- Hidden meetings are local UI preference stored in `localStorage`.
- This state is not server authority and should stay outside query cache.
- Derived lists such as upcoming/past/cancelled should continue to be computed from:
  - query-backed meetings data
  - local hidden-id state

Recommendation:

- Keep hidden-item state as component-local state plus `localStorage`.
- Do not encode hidden state into the meetings query key.

### Mutation refresh requirements

- Host cancellation now uses:
  - optimistic `setQueryData` for the cancelled item
  - then `invalidateQueries` to reconcile with backend truth
- Any future host-side reschedule, restore, or reconciliation actions should use the same pattern.

## Risks And Edge Cases

- Meetings drive multiple dashboard surfaces at once:
  - meetings list
  - next-up card
  - availability visual overlays
- A meetings migration must preserve those derived views without introducing loading flicker.
- Event types and availability overrides are lower-risk because they are configuration lists with simpler mutation semantics.
- Any future dashboard splitting into route-level sections will benefit from query cache reuse; the current manual meetings implementation will not.

## Recommendation

- Keep configuration-style resources on longer stale windows.
- Keep meetings on a shorter stale window with polling.
- Continue treating hidden meetings, selected rows, and open dialogs as local UI state instead of query state.
