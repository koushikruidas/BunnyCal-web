import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useMemo, useEffect, useRef, useCallback } from "react";
import { reducer, initialContext } from "./bookingMachine";
const BookingCtx = createContext(null);
const BOOKING_RETURN_STATE_KEY = "booking-return-state";
const BOOKING_RETURN_STATE_TTL_MS = 30 * 60 * 1000;
function getCurrentPath() {
    if (typeof window === "undefined")
        return "";
    return `${window.location.pathname}${window.location.search}`;
}
function getStorage() {
    if (typeof window === "undefined")
        return null;
    return window.sessionStorage;
}
function parseStoredReturnState(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1)
            return null;
        if (!parsed.username || !parsed.eventTypeSlug || !parsed.routePath || typeof parsed.savedAt !== "number")
            return null;
        if (Date.now() - parsed.savedAt > BOOKING_RETURN_STATE_TTL_MS)
            return null;
        const state = parsed.currentStep;
        if (!state || !["SLOTS", "DETAILS", "HELD"].includes(state))
            return null;
        const holdExpired = state === "HELD" &&
            parsed.hold &&
            typeof parsed.hold.expiresAt === "string" &&
            new Date(parsed.hold.expiresAt).getTime() <= Date.now();
        if (holdExpired)
            return null;
        return {
            version: 1,
            routePath: parsed.routePath,
            username: parsed.username,
            eventTypeSlug: parsed.eventTypeSlug,
            selectedDate: parsed.selectedDate ?? null,
            selectedSlot: parsed.selectedSlot ?? null,
            currentStep: state,
            timezone: parsed.timezone ?? null,
            formData: parsed.formData ?? { name: "", email: "", notes: "" },
            hold: parsed.hold ?? null,
            attemptIdempotencyKey: parsed.attemptIdempotencyKey ?? null,
            attemptSlotId: parsed.attemptSlotId ?? null,
            attemptStartedAt: parsed.attemptStartedAt ?? null,
            attemptGuestEmail: parsed.attemptGuestEmail ?? null,
            attemptGuestName: parsed.attemptGuestName ?? null,
            savedAt: parsed.savedAt,
        };
    }
    catch {
        return null;
    }
}
export function BookingProvider({ children }) {
    const [ctx, send] = useReducer(reducer, initialContext);
    const restoredRef = useRef(false);
    const routeKeyRef = useRef(null);
    const persistForOAuthRedirect = useCallback(() => {
        const storage = getStorage();
        if (!storage)
            return;
        if (!ctx.username || !ctx.eventTypeSlug)
            return;
        if (!["SLOTS", "DETAILS", "HELD"].includes(ctx.state))
            return;
        const payload = {
            version: 1,
            routePath: getCurrentPath(),
            username: ctx.username,
            eventTypeSlug: ctx.eventTypeSlug,
            selectedDate: ctx.selectedDate,
            selectedSlot: ctx.selectedSlot,
            currentStep: ctx.state,
            timezone: ctx.eventInfo?.timezone ?? null,
            formData: ctx.details,
            hold: ctx.hold,
            attemptIdempotencyKey: ctx.attemptIdempotencyKey,
            attemptSlotId: ctx.attemptSlotId,
            attemptStartedAt: ctx.attemptStartedAt,
            attemptGuestEmail: ctx.attemptGuestEmail,
            attemptGuestName: ctx.attemptGuestName,
            savedAt: Date.now(),
        };
        storage.setItem(BOOKING_RETURN_STATE_KEY, JSON.stringify(payload));
    }, [ctx]);
    useEffect(() => {
        const routeKey = ctx.username && ctx.eventTypeSlug ? `${ctx.username}/${ctx.eventTypeSlug}` : null;
        if (routeKey !== routeKeyRef.current) {
            routeKeyRef.current = routeKey;
            restoredRef.current = false;
        }
    }, [ctx.eventTypeSlug, ctx.username]);
    useEffect(() => {
        if (restoredRef.current)
            return;
        if (!ctx.username || !ctx.eventTypeSlug)
            return;
        const storage = getStorage();
        if (!storage)
            return;
        const saved = parseStoredReturnState(storage.getItem(BOOKING_RETURN_STATE_KEY));
        const currentPath = getCurrentPath();
        if (!saved) {
            storage.removeItem(BOOKING_RETURN_STATE_KEY);
            restoredRef.current = true;
            return;
        }
        const routeMatches = saved.username === ctx.username &&
            saved.eventTypeSlug === ctx.eventTypeSlug &&
            saved.routePath === currentPath;
        if (!routeMatches) {
            restoredRef.current = true;
            return;
        }
        send({
            type: "HYDRATE_FROM_STORAGE",
            payload: {
                state: saved.currentStep,
                selectedDate: saved.selectedDate,
                selectedSlot: saved.selectedSlot,
                details: saved.formData,
                hold: saved.hold,
                attemptIdempotencyKey: saved.attemptIdempotencyKey,
                attemptSlotId: saved.attemptSlotId,
                attemptStartedAt: saved.attemptStartedAt,
                attemptGuestEmail: saved.attemptGuestEmail,
                attemptGuestName: saved.attemptGuestName,
            },
        });
        storage.removeItem(BOOKING_RETURN_STATE_KEY);
        restoredRef.current = true;
    }, [ctx.eventTypeSlug, ctx.username]);
    useEffect(() => {
        const storage = getStorage();
        if (!storage)
            return;
        if (!ctx.username || !ctx.eventTypeSlug)
            return;
        if (!["SLOTS", "DETAILS", "HELD"].includes(ctx.state))
            return;
        const payload = {
            version: 1,
            routePath: getCurrentPath(),
            username: ctx.username,
            eventTypeSlug: ctx.eventTypeSlug,
            selectedDate: ctx.selectedDate,
            selectedSlot: ctx.selectedSlot,
            currentStep: ctx.state,
            timezone: ctx.eventInfo?.timezone ?? null,
            formData: ctx.details,
            hold: ctx.hold,
            attemptIdempotencyKey: ctx.attemptIdempotencyKey,
            attemptSlotId: ctx.attemptSlotId,
            attemptStartedAt: ctx.attemptStartedAt,
            attemptGuestEmail: ctx.attemptGuestEmail,
            attemptGuestName: ctx.attemptGuestName,
            savedAt: Date.now(),
        };
        storage.setItem(BOOKING_RETURN_STATE_KEY, JSON.stringify(payload));
    }, [ctx]);
    const value = useMemo(() => ({ ctx, send, persistForOAuthRedirect }), [ctx, persistForOAuthRedirect]);
    return _jsx(BookingCtx.Provider, { value: value, children: children });
}
export function useBooking() {
    const v = useContext(BookingCtx);
    if (!v)
        throw new Error("useBooking must be used inside BookingProvider");
    return v;
}
