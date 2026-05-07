# easySchedule — Web Client

A real React + TypeScript app skeleton for the EasySchedule booking flow. Built to match the OpenAPI spec at `/public/{username}/{eventTypeSlug}` with an explicit booking state machine and a mocked API layer you can swap for your live backend.

## Run

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173.

## Architecture

```
src/
├── components/        Reusable UI (Card, Stepper, SlotButton, CalendarGrid, Button, HoldRing, EventSummary, ErrorBanner)
├── pages/             Route-level views per state (SlotsView, DetailsView, HeldView, ConfirmedView, BookingPage)
├── hooks/             useCountdown, useAvailability, useBookingActions
├── state/             bookingMachine.ts (states + reducer + transitions), BookingContext.tsx
├── services/          API layer — api.ts (mock), types.ts (OpenAPI-aligned DTOs)
└── styles/            globals.css (Tailwind + theme tokens)
```

### Booking state machine

States: `EVENT → SLOTS → DETAILS → HELD → CONFIRMED` (with branches `CANCELLED`, `EXPIRED`).

Transitions are enforced by an `allowed` table in `state/bookingMachine.ts`. Illegal transitions log a warning in dev and become no-ops in prod.

### API layer

`src/services/api.ts` exposes `getEventInfo`, `getAvailability(date)`, `holdSlot(slotId)`, `confirmBooking(bookingId)`, `cancelBooking(bookingId)`. The mock simulates:

- 180–720 ms latency (realistic jitter)
- ~5 % hold-time race (`SLOT_CONFLICT`)
- ~4 % final-gate double-book guard (`DOUBLE_BOOK`)
- ~3 % upstream calendar timeout
- In-memory `liveTaken` set so concurrent calls actually conflict

To wire to the real backend, replace each function body with a `fetch` call to your Spring endpoints (`/public/{username}/{eventTypeSlug}/...`) and forward the `Idempotency-Key` header from the action hook.

### Hooks

- `useCountdown(targetISO, onExpire)` — drives the HOLD ring + auto-fires `EXPIRE`.
- `useAvailability(date)` — fetches slots, polls every 20 s for live updates.
- `useBookingActions()` — bridges machine events to API calls (hold, confirm, cancel).

## Design tokens

Dark shell, pastel accent palette (lavender / peach / mint / pink / butter / sky) — see `tailwind.config.js`. Theme switch via `[data-theme="light"]` on `<html>`.

## Differentiator wiring

"No double booking. Ever." trust badges live in `EventSummary` and `ConfirmedView`. The HOLD state's countdown ring + receipt make the consistency model visible to the invitee.
