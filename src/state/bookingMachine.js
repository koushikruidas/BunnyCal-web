const allowed = {
    EVENT: ["SET_PUBLIC_ROUTE", "EVENT_LOADED", "EVENT_LOAD_FAILED", "GO_TO_SLOTS", "SELECT_DATE", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
    SLOTS: ["SET_PUBLIC_ROUTE", "SELECT_DATE", "SELECT_SLOT", "GO_TO_DETAILS", "BACK", "RESET", "EVENT_LOADED", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
    DETAILS: ["SET_PUBLIC_ROUTE", "UPDATE_DETAILS", "SET_ATTEMPT", "HOLD_REQUESTED", "HOLD_SUCCEEDED", "HOLD_FAILED", "BACK", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
    HELD: ["SET_PUBLIC_ROUTE", "CONFIRM_REQUESTED", "CONFIRM_SUCCEEDED", "CONFIRM_FAILED", "EXPIRE", "CANCEL", "BACK", "RESET", "ERROR_CLEARED", "HYDRATE_FROM_STORAGE"],
    CONFIRMED: ["CANCEL", "RESET", "HYDRATE_FROM_STORAGE"],
    CANCELLED: ["RESET", "HYDRATE_FROM_STORAGE"],
    EXPIRED: ["RESET", "BACK", "HYDRATE_FROM_STORAGE"],
};
export const initialContext = {
    state: "EVENT",
    eventInfo: null,
    username: null,
    eventTypeSlug: null,
    selectedDate: null,
    selectedSlot: null,
    details: { name: "", email: "", notes: "" },
    hold: null,
    confirmation: null,
    confirmedAt: null,
    loading: false,
    error: null,
    attemptIdempotencyKey: null,
    attemptSlotId: null,
    attemptStartedAt: null,
    attemptGuestEmail: null,
    attemptGuestName: null,
};
export function reducer(ctx, ev) {
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
            return {
                ...ctx,
                selectedDate: ev.date,
                selectedSlot: null,
                attemptIdempotencyKey: null,
                attemptSlotId: null,
                attemptStartedAt: null,
                attemptGuestEmail: null,
                attemptGuestName: null,
            };
        case "SELECT_SLOT":
            return {
                ...ctx,
                selectedSlot: ev.slot,
                attemptIdempotencyKey: null,
                attemptSlotId: null,
                attemptStartedAt: null,
                attemptGuestEmail: null,
                attemptGuestName: null,
            };
        case "GO_TO_DETAILS":
            if (!ctx.selectedSlot)
                return ctx;
            return { ...ctx, state: "DETAILS", error: null };
        case "UPDATE_DETAILS":
            return { ...ctx, details: { ...ctx.details, ...ev.details } };
        case "SET_ATTEMPT":
            return {
                ...ctx,
                attemptIdempotencyKey: ev.idempotencyKey,
                attemptSlotId: ev.slotId,
                attemptStartedAt: ev.startedAt,
                attemptGuestEmail: ev.guestEmail,
                attemptGuestName: ev.guestName,
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
            return { ...ctx, state: "CONFIRMED", loading: false, confirmedAt: new Date().toISOString(), confirmation: ev.confirmation };
        case "CONFIRM_FAILED":
            return { ...ctx, loading: false, error: ev.error };
        case "EXPIRE":
            return { ...ctx, state: "EXPIRED", hold: null };
        case "CANCEL":
            return { ...ctx, state: "CANCELLED" };
        case "BACK": {
            const back = {
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
                attemptGuestEmail: ev.payload.attemptGuestEmail,
                attemptGuestName: ev.payload.attemptGuestName,
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
export const STEP_LABELS = ["Event", "Pick a time", "Your details", "Confirm", "Booked"];
export function stepIndex(s) {
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
