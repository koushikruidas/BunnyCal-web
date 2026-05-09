import { useCallback } from "react";
import { api } from "@/services";
import { useBooking } from "@/state/BookingContext";
import { ApiError } from "@/services/types";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useBookingActions() {
  const { ctx, send } = useBooking();

  const loadEvent = useCallback(
    async (username: string, slug: string) => {
      try {
        send({ type: "SET_PUBLIC_ROUTE", username, eventTypeSlug: slug });
        const info = await api.getEventInfo(username, slug);
        send({ type: "EVENT_LOADED", eventInfo: info });
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("LOAD_FAILED", "Unable to load this booking page.");
        send({ type: "EVENT_LOAD_FAILED", error: { code: err.code, message: err.message } });
      }
    },
    [send]
  );

  const requestHold = useCallback(async () => {
    if (!ctx.selectedSlot || !ctx.username || !ctx.eventTypeSlug) return;
    send({ type: "HOLD_REQUESTED" });

    const sameAttempt = ctx.attemptSlotId === ctx.selectedSlot.slotId && ctx.attemptIdempotencyKey;
    const idempotencyKey = sameAttempt ? ctx.attemptIdempotencyKey! : randomKey();

    if (!sameAttempt) {
      send({ type: "SET_ATTEMPT", idempotencyKey, slotId: ctx.selectedSlot.slotId, startedAt: new Date().toISOString() });
    }

    try {
      const hold = await api.holdSlot(ctx.username, ctx.eventTypeSlug, ctx.selectedSlot.start, idempotencyKey);
      send({ type: "HOLD_SUCCEEDED", hold: { bookingId: hold.bookingId, expiresAt: hold.expiresAt } });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Could not hold slot");
      send({ type: "HOLD_FAILED", error: { code: err.code, message: err.message } });
    }
  }, [ctx.attemptIdempotencyKey, ctx.attemptSlotId, ctx.eventTypeSlug, ctx.selectedSlot, ctx.username, send]);

  const confirm = useCallback(async () => {
    if (!ctx.hold || !ctx.username || !ctx.eventTypeSlug) return;
    send({ type: "CONFIRM_REQUESTED" });
    try {
      await api.confirmBooking(ctx.username, ctx.eventTypeSlug, ctx.hold.bookingId);
      send({ type: "CONFIRM_SUCCEEDED" });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Could not confirm booking");
      send({ type: "CONFIRM_FAILED", error: { code: err.code, message: err.message } });
    }
  }, [ctx.eventTypeSlug, ctx.hold, ctx.username, send]);

  const cancel = useCallback(async () => {
    if (ctx.hold && ctx.username && ctx.eventTypeSlug) {
      await api.cancelBooking(ctx.username, ctx.eventTypeSlug, ctx.hold.bookingId, ctx.attemptIdempotencyKey ?? undefined).catch(() => {});
    }
    send({ type: "CANCEL" });
  }, [ctx.attemptIdempotencyKey, ctx.eventTypeSlug, ctx.hold, ctx.username, send]);

  const reschedule = useCallback(async () => {
    if (!ctx.hold || !ctx.selectedSlot || !ctx.username || !ctx.eventTypeSlug) return false;
    try {
      await api.rescheduleBooking(ctx.username, ctx.eventTypeSlug, ctx.hold.bookingId, { startTime: ctx.selectedSlot.start }, randomKey());
      return true;
    } catch {
      return false;
    }
  }, [ctx.eventTypeSlug, ctx.hold, ctx.selectedSlot, ctx.username]);

  return { loadEvent, requestHold, confirm, cancel, reschedule };
}
