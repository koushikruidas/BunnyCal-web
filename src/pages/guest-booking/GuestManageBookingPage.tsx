import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { GuestBookingActionPanel } from "@/pages/guest-booking/components/GuestBookingActionPanel";
import { useGuestBookingActions } from "@/modules/guest-booking/useGuestBookingActions";
import { clearGuestManageToken, loadGuestManageToken, saveGuestManageToken } from "@/modules/guest-booking/tokenStore";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useAuth } from "@/state/AuthContext";
import { PageShell } from "@/ui/layout";
import { Badge } from "@/ui/controls";

export function GuestManageBookingPage() {
  const { user } = useAuth();
  const brandHref = user ? "/dashboard" : "/";
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
    <PageShell width="comfort">
      <main className="mx-auto max-w-2xl rounded-3xl border border-border-subtle bg-surface p-5 shadow-soft md:p-8" aria-label="Manage booking">
        <Link to={brandHref} className="flex items-center gap-2 mb-4 w-fit">
          <BunnyMark size={16} color="#7A6BB0" />
          <BrandWordmark className="text-xs tracking-[0.16em]" style={{ fontFamily: '"Geist", sans-serif', fontWeight: 600 }} />
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">Manage your booking</h1>
        <p className="mt-2 text-sm text-text-secondary">Use this secure page to cancel or reschedule your booking. Actions are retry-safe.</p>

        {tokenMissing && (
          <div className="mt-4 rounded-xl border border-danger-border bg-danger-surface p-4">
            <p className="text-sm font-medium text-danger-fg">Missing management token</p>
            <p className="mt-1 text-sm text-danger-fg">Open this page from your confirmation email so token and booking context can be restored.</p>
          </div>
        )}

        {tokenProblem && (
          <div className="mt-4 rounded-xl border border-danger-border bg-danger-surface p-4" role="alert">
            <p className="text-sm font-medium text-danger-fg">{tokenProblem.title}</p>
            <p className="mt-1 text-sm text-danger-fg">{tokenProblem.message}</p>
          </div>
        )}

        {terminalState === "CANCELLED" && (
          <div className="mt-4 rounded-xl border border-success-border bg-success-surface p-4 text-sm text-success-fg">
            Booking cancelled. This page is now read-only for this booking.
          </div>
        )}

        {terminalState === "RESCHEDULED" && (
          <div className="mt-4 rounded-xl border border-success-border bg-success-surface p-4 text-sm text-success-fg">
            Booking reschedule request submitted. This page is now read-only for this booking.
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-sunken p-4 text-sm text-text-secondary">
          <div className="mb-3">
            <Badge tone="neutral" size="sm">Lifecycle context</Badge>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-medium text-text-primary">Booking ID</span>
            <span className="break-all">{bookingId || "—"}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="font-medium text-text-primary">Event</span>
            <span className="break-all">{resolvedUsername && resolvedEventTypeSlug ? `@${resolvedUsername}/${resolvedEventTypeSlug}` : "Unavailable"}</span>
          </div>
        </div>

        {banner && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${banner.tone === "good" ? "border-success-border bg-success-surface text-success-fg" : "border-danger-border bg-danger-surface text-danger-fg"}`}
            role="status"
            aria-live="polite"
          >
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
            <Link to={`/book/${resolvedUsername}/${resolvedEventTypeSlug}`} className="focus-ring rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-sunken">
              Book another time
            </Link>
          )}
        </div>
      </main>
    </PageShell>
  );
}
