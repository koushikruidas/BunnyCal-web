import { useCallback } from "react";
import { useBooking } from "@/state/BookingContext";
import { ApiError } from "@/services/types";
import { getBookingResolver, type HostKind } from "@/services/bookingResolver";
import { opsLogger } from "@/lib/opsLogger";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useBookingActions(hostKind: HostKind = "authenticated-host") {
  const bookingResolver = getBookingResolver(hostKind);
  const { ctx, send } = useBooking();

  const loadEvent = useCallback(
    async (username: string, slug: string) => {
      try {
        send({ type: "SET_PUBLIC_ROUTE", username, eventTypeSlug: slug });
        const info = await bookingResolver.getEventInfo(username, slug);
        send({ type: "EVENT_LOADED", eventInfo: info });
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("LOAD_FAILED", "Unable to load this booking page.");
        send({ type: "EVENT_LOAD_FAILED", error: { code: err.code, message: err.message } });
      }
    },
    [bookingResolver, send]
  );

  const requestHold = useCallback(async () => {
    if (ctx.loading) return;
    if (!ctx.selectedSlot || !ctx.username || !ctx.eventTypeSlug) return;
    const guestName = ctx.details.name.trim();
    const guestEmail = ctx.details.email.trim().toLowerCase();
    if (!guestName || !guestEmail) {
      send({ type: "HOLD_FAILED", error: { code: "VALIDATION_ERROR", message: "Guest name and email are required." } });
      return;
    }

    send({ type: "HOLD_REQUESTED" });

    const sameAttempt = Boolean(
      ctx.attemptSlotId === ctx.selectedSlot.slotId &&
      ctx.attemptIdempotencyKey &&
      ctx.attemptGuestEmail === guestEmail &&
      ctx.attemptGuestName === guestName
    );
    const idempotencyKey = sameAttempt ? ctx.attemptIdempotencyKey! : randomKey();

    if (!sameAttempt) {
      send({
        type: "SET_ATTEMPT",
        idempotencyKey,
        slotId: ctx.selectedSlot.slotId,
        startedAt: new Date().toISOString(),
        guestEmail,
        guestName,
      });
    }

    try {
      const hold = await bookingResolver.holdSlot(
        ctx.username,
        ctx.eventTypeSlug,
        {
          startTime: ctx.selectedSlot.start,
          guestEmail,
          guestName,
          ...(ctx.selectedSlot.bookingToken ? { slotToken: ctx.selectedSlot.bookingToken } : {}),
        },
        idempotencyKey
      );
      send({ type: "HOLD_SUCCEEDED", hold: { bookingId: hold.bookingId, expiresAt: hold.expiresAt } });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Could not hold slot");
      opsLogger.warn({
        category: "booking_mutation_failure",
        message: "Hold request failed",
        details: { code: err.code, state: ctx.state },
      });
      send({ type: "HOLD_FAILED", error: { code: err.code, message: err.message } });
    }
  }, [
    ctx.attemptGuestEmail,
    ctx.attemptGuestName,
    ctx.attemptIdempotencyKey,
    ctx.attemptSlotId,
    ctx.details.email,
    ctx.details.name,
    ctx.eventTypeSlug,
    ctx.loading,
    ctx.selectedSlot,
    ctx.state,
    ctx.username,
    send,
  ]);

  const confirm = useCallback(async () => {
    if (ctx.loading) return;
    if (!ctx.hold || !ctx.username || !ctx.eventTypeSlug) return;
    send({ type: "CONFIRM_REQUESTED" });
    try {
      const confirmation = await bookingResolver.confirmBooking(ctx.username, ctx.eventTypeSlug, ctx.hold.bookingId);
      send({ type: "CONFIRM_SUCCEEDED", confirmation });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Could not confirm booking");
      opsLogger.warn({
        category: "booking_mutation_failure",
        message: "Confirm request failed",
        details: { code: err.code, state: ctx.state },
      });
      send({ type: "CONFIRM_FAILED", error: { code: err.code, message: err.message } });
    }
  }, [bookingResolver, ctx.eventTypeSlug, ctx.hold, ctx.loading, ctx.state, ctx.username, send]);

  const cancel = useCallback(async () => {
    if (ctx.loading) return;
    const bookingId = ctx.confirmation?.bookingId || ctx.hold?.bookingId;
    if (bookingId && ctx.username && ctx.eventTypeSlug) {
      const token = ctx.confirmation?.manageToken?.trim() || undefined;
      await bookingResolver.cancelBooking(ctx.username, ctx.eventTypeSlug, bookingId, ctx.attemptIdempotencyKey ?? undefined, token).catch((e) => {
        opsLogger.warn({
          category: "booking_mutation_failure",
          message: "Cancel request failed",
          details: { code: e instanceof ApiError ? e.code : "UNKNOWN", state: ctx.state },
        });
      });
    }
    send({ type: "CANCEL" });
  }, [bookingResolver, ctx.attemptIdempotencyKey, ctx.confirmation?.bookingId, ctx.confirmation?.manageToken, ctx.eventTypeSlug, ctx.hold?.bookingId, ctx.loading, ctx.state, ctx.username, send]);

  const reschedule = useCallback(async () => {
    if (ctx.loading) return false;
    const bookingId = ctx.confirmation?.bookingId || ctx.hold?.bookingId;
    if (!bookingId || !ctx.selectedSlot || !ctx.username || !ctx.eventTypeSlug) return false;
    try {
      const token = ctx.confirmation?.manageToken?.trim() || undefined;
      await bookingResolver.rescheduleBooking(ctx.username, ctx.eventTypeSlug, bookingId, { startTime: ctx.selectedSlot.start }, randomKey(), token);
      return true;
    } catch {
      opsLogger.warn({
        category: "booking_mutation_failure",
        message: "Reschedule request failed",
        details: { state: ctx.state },
      });
      return false;
    }
  }, [bookingResolver, ctx.confirmation?.bookingId, ctx.confirmation?.manageToken, ctx.eventTypeSlug, ctx.hold?.bookingId, ctx.loading, ctx.selectedSlot, ctx.state, ctx.username]);

  return { loadEvent, requestHold, confirm, cancel, reschedule };
}
