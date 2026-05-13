import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { GuestBookingActionPanel } from "@/pages/guest-booking/components/GuestBookingActionPanel";
import { useGuestBookingActions } from "@/modules/guest-booking/useGuestBookingActions";
import { clearGuestManageToken, loadGuestManageToken, saveGuestManageToken } from "@/modules/guest-booking/tokenStore";

export function GuestManageBookingPage() {
  const { username, eventTypeSlug, bookingId } = useParams<{ username: string; eventTypeSlug: string; bookingId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState("");
  const [resolvedUsername, setResolvedUsername] = useState<string>("");
  const [resolvedEventTypeSlug, setResolvedEventTypeSlug] = useState<string>("");

  useEffect(() => {
    if (!bookingId) return;

    const tokenFromUrl = search.get("token")?.trim() || "";
    const usernameFromUrl = search.get("u")?.trim() || "";
    const eventTypeSlugFromUrl = search.get("e")?.trim() || "";
    const stored = loadGuestManageToken(bookingId);

    const nextUsername = username || usernameFromUrl || stored?.username || "";
    const nextEventTypeSlug = eventTypeSlug || eventTypeSlugFromUrl || stored?.eventTypeSlug || "";
    const resolvedToken = tokenFromUrl || stored?.token || "";

    setResolvedUsername(nextUsername);
    setResolvedEventTypeSlug(nextEventTypeSlug);

    if (resolvedToken) {
      setToken(resolvedToken);
      saveGuestManageToken(bookingId, {
        token: resolvedToken,
        username: nextUsername || undefined,
        eventTypeSlug: nextEventTypeSlug || undefined,
        updatedAt: Date.now(),
      });
      if (import.meta.env.DEV) {
        console.debug("[guest-manage] resolved token context", {
          bookingId,
          source: tokenFromUrl ? "url" : "localStorage",
          username: nextUsername,
          eventTypeSlug: nextEventTypeSlug,
        });
      }
    }

    if (tokenFromUrl || usernameFromUrl || eventTypeSlugFromUrl) {
      navigate(location.pathname, { replace: true });
    }
  }, [bookingId, eventTypeSlug, location.pathname, navigate, search, username]);

  const actionParams = useMemo(() => {
    if (!resolvedUsername || !resolvedEventTypeSlug || !bookingId || !token) return null;
    return {
      username: resolvedUsername,
      eventTypeSlug: resolvedEventTypeSlug,
      bookingId,
      token,
      clearStoredToken: () => {
        clearGuestManageToken(bookingId);
        setToken("");
      },
    };
  }, [bookingId, resolvedEventTypeSlug, resolvedUsername, token]);

  const {
    canMutate,
    terminalState,
    cancelState,
    rescheduleState,
    banner,
    tokenProblem,
    minRescheduleDateTime,
    cancelBooking,
    rescheduleBooking,
  } = useGuestBookingActions(actionParams);

  const tokenMissing = (!token || !resolvedUsername || !resolvedEventTypeSlug) && terminalState === "ACTIVE";
  const actionsDisabled = terminalState !== "ACTIVE";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">Guest Booking Management</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">Manage your booking</h1>
        <p className="mt-2 text-sm text-[#475569]">Use this secure page to cancel or reschedule your booking. Actions are retry-safe.</p>

        {tokenMissing && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-700">Missing management token</p>
            <p className="mt-1 text-sm text-rose-700">Open this page from your confirmation email so token and booking context can be restored.</p>
          </div>
        )}

        {tokenProblem && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-700">{tokenProblem.title}</p>
            <p className="mt-1 text-sm text-rose-700">{tokenProblem.message}</p>
          </div>
        )}

        {terminalState === "CANCELLED" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Booking cancelled. This page is now read-only for this booking.
          </div>
        )}

        {terminalState === "RESCHEDULED" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Booking reschedule request submitted. This page is now read-only for this booking.
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#475569]">
          <div className="flex justify-between gap-3">
            <span className="font-medium text-[#0f172a]">Booking ID</span>
            <span className="break-all">{bookingId || "—"}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="font-medium text-[#0f172a]">Event</span>
            <span className="break-all">{resolvedUsername && resolvedEventTypeSlug ? `@${resolvedUsername}/${resolvedEventTypeSlug}` : "Unavailable"}</span>
          </div>
        </div>

        {banner && (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${banner.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {banner.text}
          </div>
        )}

        <GuestBookingActionPanel
          canMutate={canMutate && !actionsDisabled}
          minRescheduleDateTime={minRescheduleDateTime}
          cancelPending={cancelState === "pending"}
          reschedulePending={rescheduleState === "pending"}
          onCancelConfirm={async () => {
            await cancelBooking();
          }}
          onRescheduleSubmit={async (nextStartAt) => {
            await rescheduleBooking(nextStartAt);
          }}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {resolvedUsername && resolvedEventTypeSlug && (
            <Link to={`/book/${resolvedUsername}/${resolvedEventTypeSlug}`} className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm">Book another time</Link>
          )}
        </div>
      </div>
    </div>
  );
}
