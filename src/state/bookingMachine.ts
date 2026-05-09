import type { SlotDto, PublicEventInfoResponse } from "@/services/types";

export type BookingState =
  | "EVENT"
  | "SLOTS"
  | "DETAILS"
  | "HELD"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface BookingContextData {
  state: BookingState;
  eventInfo: PublicEventInfoResponse | null;
  username: string | null;
  eventTypeSlug: string | null;
  selectedDate: string | null;
  selectedSlot: SlotDto | null;
  details: { name: string; email: string; notes: string };
  hold: { bookingId: string; expiresAt: string } | null;
  confirmedAt: string | null;
  loading: boolean;
  error: { code: string; message: string } | null;
  attemptIdempotencyKey: string | null;
  attemptSlotId: string | null;
  attemptStartedAt: string | null;
}

export type BookingEvent =
  | { type: "SET_PUBLIC_ROUTE"; username: string; eventTypeSlug: string }
  | { type: "EVENT_LOADED"; eventInfo: PublicEventInfoResponse }
  | { type: "EVENT_LOAD_FAILED"; error: { code: string; message: string } }
  | { type: "GO_TO_SLOTS" }
  | { type: "SELECT_DATE"; date: string }
  | { type: "SELECT_SLOT"; slot: SlotDto }
  | { type: "GO_TO_DETAILS" }
  | { type: "UPDATE_DETAILS"; details: Partial<BookingContextData["details"]> }
  | { type: "SET_ATTEMPT"; idempotencyKey: string; slotId: string; startedAt: string }
  | { type: "HOLD_REQUESTED" }
  | { type: "HOLD_SUCCEEDED"; hold: { bookingId: string; expiresAt: string } }
  | { type: "HOLD_FAILED"; error: { code: string; message: string } }
  | { type: "CONFIRM_REQUESTED" }
  | { type: "CONFIRM_SUCCEEDED" }
  | { type: "CONFIRM_FAILED"; error: { code: string; message: string } }
  | { type: "EXPIRE" }
  | { type: "CANCEL" }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "ERROR_CLEARED" }
  | {
      type: "HYDRATE_FROM_STORAGE";
      payload: {
        state: BookingState;
        selectedDate: string | null;
        selectedSlot: SlotDto | null;
        details: BookingContextData["details"];
        hold: BookingContextData["hold"];
        attemptIdempotencyKey: string | null;
        attemptSlotId: string | null;
        attemptStartedAt: string | null;
      };
    };

const allowed: Record<BookingState, BookingEvent["type"][]> = {
  EVENT: ["SET_PUBLIC_ROUTE", "EVENT_LOADED", "EVENT_LOAD_FAILED", "GO_TO_SLOTS", "SELECT_DATE", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
  SLOTS: ["SET_PUBLIC_ROUTE", "SELECT_DATE", "SELECT_SLOT", "GO_TO_DETAILS", "BACK", "RESET", "EVENT_LOADED", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
  DETAILS: ["SET_PUBLIC_ROUTE", "UPDATE_DETAILS", "SET_ATTEMPT", "HOLD_REQUESTED", "HOLD_SUCCEEDED", "HOLD_FAILED", "BACK", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
  HELD: ["SET_PUBLIC_ROUTE", "CONFIRM_REQUESTED", "CONFIRM_SUCCEEDED", "CONFIRM_FAILED", "EXPIRE", "CANCEL", "BACK", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
  CONFIRMED: ["CANCEL", "RESET", "HYDRATE_FROM_STORAGE"],
  CANCELLED: ["RESET", "HYDRATE_FROM_STORAGE"],
  EXPIRED: ["RESET", "BACK", "HYDRATE_FROM_STORAGE"],
};

export const initialContext: BookingContextData = {
  state: "EVENT",
  eventInfo: null,
  username: null,
  eventTypeSlug: null,
  selectedDate: null,
  selectedSlot: null,
  details: { name: "", email: "", notes: "" },
  hold: null,
  confirmedAt: null,
  loading: false,
  error: null,
  attemptIdempotencyKey: null,
  attemptSlotId: null,
  attemptStartedAt: null,
};

export function reducer(ctx: BookingContextData, ev: BookingEvent): BookingContextData {
  if (!allowed[ctx.state].includes(ev.type)) {
    if (import.meta.env.DEV) {
      console.warn(`[bookingMachine] illegal transition ${ev.type} from ${ctx.state}`);
    }
    return ctx;
  }

  switch (ev.type) {
    case "SET_PUBLIC_ROUTE":
      if (ctx.username !== ev.username || ctx.eventTypeSlug !== ev.eventTypeSlug) {
        return {
          ...initialContext,
          username: ev.username,
          eventTypeSlug: ev.eventTypeSlug,
        };
      }
      return { ...ctx, username: ev.username, eventTypeSlug: ev.eventTypeSlug };
    case "EVENT_LOADED":
      return { ...ctx, eventInfo: ev.eventInfo, error: null };
    case "EVENT_LOAD_FAILED":
      return { ...ctx, error: ev.error, loading: false };
    case "GO_TO_SLOTS":
      return { ...ctx, state: "SLOTS", error: null };
    case "SELECT_DATE":
      return { ...ctx, selectedDate: ev.date, selectedSlot: null, attemptIdempotencyKey: null, attemptSlotId: null, attemptStartedAt: null };
    case "SELECT_SLOT":
      return { ...ctx, selectedSlot: ev.slot, attemptIdempotencyKey: null, attemptSlotId: null, attemptStartedAt: null };
    case "GO_TO_DETAILS":
      if (!ctx.selectedSlot) return ctx;
      return { ...ctx, state: "DETAILS", error: null };
    case "UPDATE_DETAILS":
      return { ...ctx, details: { ...ctx.details, ...ev.details } };
    case "SET_ATTEMPT":
      return {
        ...ctx,
        attemptIdempotencyKey: ev.idempotencyKey,
        attemptSlotId: ev.slotId,
        attemptStartedAt: ev.startedAt,
      };
    case "HOLD_REQUESTED":
      return { ...ctx, loading: true, error: null };
    case "HOLD_SUCCEEDED":
      return { ...ctx, state: "HELD", hold: ev.hold, loading: false, error: null };
    case "HOLD_FAILED":
      return { ...ctx, loading: false, error: ev.error };
    case "CONFIRM_REQUESTED":
      return { ...ctx, loading: true, error: null };
    case "CONFIRM_SUCCEEDED":
      return { ...ctx, state: "CONFIRMED", loading: false, confirmedAt: new Date().toISOString() };
    case "CONFIRM_FAILED":
      return { ...ctx, loading: false, error: ev.error };
    case "EXPIRE":
      return { ...ctx, state: "EXPIRED", hold: null };
    case "CANCEL":
      return { ...ctx, state: "CANCELLED" };
    case "BACK": {
      const back: Record<BookingState, BookingState> = {
        EVENT: "EVENT",
        SLOTS: "EVENT",
        DETAILS: "SLOTS",
        HELD: "DETAILS",
        CONFIRMED: "CONFIRMED",
        CANCELLED: "CANCELLED",
        EXPIRED: "SLOTS",
      };
      return { ...ctx, state: back[ctx.state], error: null };
    }
    case "ERROR_CLEARED":
      return { ...ctx, error: null };
    case "HYDRATE_FROM_STORAGE":
      return {
        ...ctx,
        state: ev.payload.state,
        selectedDate: ev.payload.selectedDate,
        selectedSlot: ev.payload.selectedSlot,
        details: ev.payload.details,
        hold: ev.payload.hold,
        attemptIdempotencyKey: ev.payload.attemptIdempotencyKey,
        attemptSlotId: ev.payload.attemptSlotId,
        attemptStartedAt: ev.payload.attemptStartedAt,
        error: null,
        loading: false,
      };
    case "RESET":
      return {
        ...initialContext,
        eventInfo: ctx.eventInfo,
        username: ctx.username,
        eventTypeSlug: ctx.eventTypeSlug,
        state: "SLOTS",
      };
    default:
      return ctx;
  }
}

export const STEP_LABELS = ["Event", "Pick a time", "Your details", "Confirm", "Booked"] as const;

export function stepIndex(s: BookingState): number {
  switch (s) {
    case "EVENT":
      return 0;
    case "SLOTS":
      return 1;
    case "DETAILS":
      return 2;
    case "HELD":
      return 3;
    case "CONFIRMED":
      return 4;
    default:
      return 1;
  }
}
