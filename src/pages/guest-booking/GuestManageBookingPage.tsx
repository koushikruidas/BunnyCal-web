import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import { GuestSlotPicker } from "@/pages/guest-booking/components/GuestSlotPicker";
import { useGuestBookingActions } from "@/modules/guest-booking/useGuestBookingActions";
import { useGuestBooking } from "@/modules/guest-booking/useGuestBooking";
import { clearGuestManageToken, loadGuestManageToken, saveGuestManageToken } from "@/modules/guest-booking/tokenStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useAuth } from "@/state/AuthContext";
import { PageShell } from "@/ui/layout";
import { Skeleton } from "@/ui/controls";
import { formatMeetingDateTime, getBrowserTimeZone } from "@/lib/dateTime";
import type { SlotDto } from "@/services/types";
import "@/pages/booking/booking.css";

type View = "summary" | "reschedule" | "review";

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
    tokenProblem: actionTokenProblem,
    cancelBooking,
    rescheduleBooking,
  } = useGuestBookingActions(actionParams);

  const {
    booking,
    loading: bookingLoading,
    tokenProblem: loadTokenProblem,
    notFound,
    refresh: refreshBooking,
  } = useGuestBooking(actionParams);

  const tokenProblem = loadTokenProblem ?? actionTokenProblem;
  const isTerminal = terminalState !== "ACTIVE";

  const [view, setView] = useState<View>("summary");
  const [pendingSlot, setPendingSlot] = useState<SlotDto | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    if (isTerminal) {
      refreshBooking();
      setView("summary");
      setPendingSlot(null);
    }
  }, [isTerminal, refreshBooking]);

  const tokenMissing = (!token || !resolvedUsername || !resolvedEventTypeSlug) && !isTerminal;
  const actionsDisabled = !canMutate || isTerminal;
  const tz = booking?.timezone ?? getBrowserTimeZone();

  const onConfirmReschedule = async () => {
    if (!pendingSlot) return;
    await rescheduleBooking(pendingSlot.start);
  };

  return (
    <PageShell width="full" className="!px-0 !py-0">
      <main className="bk-wrap" aria-label="Manage your booking">
        <section className="bk-main bk-main-confirmed">
          <div className="bm-wrap">
            <header className="bk-success-header">
              <Link to={brandHref} className="onb-brand bk-success-brand">
                <div className="bk-brand-mark">
                  <BunnyMark size={26} />
                </div>
                <BrandWordmark className="onb-brand-name" style={{ fontFamily: "var(--sans)", fontWeight: 600 }} />
              </Link>
              <div className="bk-success-header-actions">
                <a href="mailto:help@bunnycal.com" className="bk-success-link">Help</a>
                {resolvedUsername && resolvedEventTypeSlug && (
                  <Link className="bk-success-link" to={`/book/${resolvedUsername}/${resolvedEventTypeSlug}`}>
                    Book another time
                  </Link>
                )}
              </div>
            </header>

            {tokenMissing && (
              <div className="mt-4 rounded-xl border border-danger-border bg-danger-surface p-4">
                <p className="text-sm font-medium text-danger-fg">Missing management token</p>
                <p className="mt-1 text-sm text-danger-fg">
                  Open this page from your confirmation email so the link can be restored.
                </p>
              </div>
            )}

            {tokenProblem && (
              <div className="mt-4 rounded-xl border border-danger-border bg-danger-surface p-4" role="alert">
                <p className="text-sm font-medium text-danger-fg">{tokenProblem.title}</p>
                <p className="mt-1 text-sm text-danger-fg">{tokenProblem.message}</p>
              </div>
            )}

            {notFound && !tokenProblem && (
              <div className="mt-4 rounded-xl border border-warning-border bg-warning-surface p-4">
                <p className="text-sm font-medium text-warning-fg">Booking not found</p>
                <p className="mt-1 text-sm text-warning-fg">
                  We could not find a booking with this ID. The link may be incorrect, or the booking may have been removed.
                </p>
              </div>
            )}

            {banner && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  banner.tone === "good"
                    ? "border-success-border bg-success-surface text-success-fg"
                    : "border-danger-border bg-danger-surface text-danger-fg"
                }`}
                role="status"
                aria-live="polite"
              >
                {banner.text}
              </div>
            )}

            <div className="bk-content">
              {!booking && bookingLoading && !tokenProblem && !notFound ? (
                <SummarySkeleton />
              ) : isTerminal ? (
                <TerminalView
                  terminalState={terminalState}
                  booking={booking}
                  resolvedUsername={resolvedUsername}
                  resolvedEventTypeSlug={resolvedEventTypeSlug}
                  brandHref={brandHref}
                />
              ) : view === "summary" && booking ? (
                <div className="bm-stack">
                  <div className="bm-hero">
                    <section className="bm-copy">
                      <div className="bk-success-pill"><span className="dot" /> Manage booking</div>
                      <h1 className="bk-success-title">Manage your <em>booking.</em></h1>
                      <p className="bk-success-copy">
                        Reschedule for a better fit or cancel if plans changed. Everything updates automatically across your calendars.
                      </p>
                      <div className="bm-reassure">
                        <div><strong>Safe & secure</strong><span>Your data is private</span></div>
                        <div><strong>Auto updates</strong><span>Calendars stay in sync</span></div>
                        <div><strong>Host notified</strong><span>Instantly via email</span></div>
                      </div>
                    </section>

                    <article className="bk-success-summary bm-summary">
                      <div className="bm-summary-top">
                        <div className="bk-success-summary-host">
                          <div className="bk-host-avatar">{(booking.attendeeName?.trim()?.[0] || "G").toUpperCase()}</div>
                          <div>
                            <strong>{booking.attendeeName || booking.hostName || "Guest"}</strong>
                            <div>{booking.hostName ? `Independent strategist · ${booking.hostName}` : "Managed by BunnyCal"}</div>
                          </div>
                        </div>
                        <div className="bk-success-pill"><span className="dot" /> Confirmed</div>
                      </div>
                      <h2>{booking.eventTitle} · <em>{booking.durationMinutes} min</em></h2>
                      <div className="bm-grid">
                        <InfoItem k="When" v={formatMeetingDateTime(booking.startTime)} />
                        <InfoItem k="Where" v="Custom" sub={booking.timezone ?? tz} />
                        <InfoItem k="You (attendee)" v={booking.attendeeName || "Guest"} sub={booking.attendeeEmail || ""} />
                        <InfoItem k="Meeting link" v={booking.hostName || "Host"} sub={booking.conferenceDetails?.joinUrl?.trim() || "Preparing meeting link..."} />
                        <InfoItem k="Booking ID" v={booking.bookingId} />
                        <InfoItem k="Status" v={String(booking.status ?? "CONFIRMED").toUpperCase()} />
                      </div>
                    </article>
                  </div>

                  <section className="bm-actions">
                    <div>
                      <h3>Take action</h3>
                      <p>Choose what you&apos;d like to do.</p>
                    </div>
                    <div className="bm-actions-cta">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingSlot(null);
                          setView("reschedule");
                        }}
                        disabled={actionsDisabled}
                        className="bk-success-cta bk-success-cta-primary"
                      >
                        Reschedule booking
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancelOpen(true)}
                        disabled={actionsDisabled}
                        className="bk-success-cta"
                      >
                        Cancel booking
                      </button>
                    </div>
                  </section>

                  <section className="bm-footer-note">
                    <div>
                      <strong>Changes are easy.</strong>
                      <p>Your host will be notified automatically.</p>
                    </div>
                    <a href="mailto:help@bunnycal.com">Need help? <span>Contact support</span></a>
                  </section>
                </div>
              ) : view === "reschedule" && booking ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingSlot(null);
                        setView("summary");
                      }}
                      className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body-sm text-text-secondary hover:bg-surface-sunken"
                    >
                      <span aria-hidden>←</span> Back to your booking
                    </button>
                    <span className="text-body-sm text-text-tertiary">
                      Currently scheduled ·{" "}
                      <strong className="text-text-primary">{formatMeetingDateTime(booking.startTime)}</strong>
                    </span>
                  </div>
                  <GuestSlotPicker
                    username={resolvedUsername}
                    eventTypeSlug={resolvedEventTypeSlug}
                    today={new Date()}
                    durationMinutes={booking.durationMinutes}
                    selectedSlot={pendingSlot}
                    onSelectSlot={setPendingSlot}
                    onContinue={() => setView("review")}
                    continueLabel="Review new time"
                  />
                </div>
              ) : view === "review" && booking && pendingSlot ? (
                <Card padding="lg">
                  <h2 className="text-h2 font-medium text-text-primary">Confirm new time</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border-subtle bg-surface-sunken p-4">
                      <div className="text-eyebrow uppercase tracking-widest text-text-tertiary">Currently</div>
                      <div className="mt-2 font-mono text-body-sm text-text-secondary line-through">
                        {formatMeetingDateTime(booking.startTime)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-success-border bg-success-surface p-4">
                      <div className="text-eyebrow uppercase tracking-widest text-success-fg">New time</div>
                      <div className="mt-2 font-mono text-body-sm text-success-fg">
                        {formatMeetingDateTime(pendingSlot.start)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={onConfirmReschedule} disabled={rescheduleState === "pending" || actionsDisabled}>
                      {rescheduleState === "pending" ? "Confirming..." : "Confirm reschedule"}
                    </Button>
                    <Button variant="ghost" onClick={() => setView("reschedule")} disabled={rescheduleState === "pending"}>
                      Back
                    </Button>
                  </div>
                </Card>
              ) : !booking && !bookingLoading ? (
                <Card padding="lg">
                  <p className="text-sm text-text-secondary">
                    Booking details are unavailable right now. If you still need to cancel or reschedule, request a
                    fresh management link from your confirmation email.
                  </p>
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <ConfirmDialog
        open={confirmCancelOpen}
        tone="danger"
        pending={cancelState === "pending"}
        title="Cancel this booking?"
        description="This will notify your host and free up the slot. This action can't be undone."
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={async () => {
          await cancelBooking();
          setConfirmCancelOpen(false);
        }}
      />
    </PageShell>
  );
}

function InfoItem({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="bm-item">
      <span>{k}</span>
      <strong>{v}</strong>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <Card padding="lg" className="bk-confirmed-card">
      <div className="bk-confirmed-top">
        <Skeleton variant="block" className="h-[58px] w-[58px] rounded-[18px]" ariaLabel="Loading booking" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="block" className="h-7 w-2/3 rounded" />
          <Skeleton variant="block" className="h-4 w-full rounded" />
        </div>
      </div>
      <div className="bk-confirmed-grid">
        <div className="bk-confirmed-panel bk-confirmed-panel-full space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-4 w-full rounded" />
          ))}
        </div>
      </div>
    </Card>
  );
}

interface TerminalViewProps {
  terminalState: "CANCELLED" | "RESCHEDULED";
  booking: ReturnType<typeof useGuestBooking>["booking"];
  resolvedUsername: string;
  resolvedEventTypeSlug: string;
  brandHref: string;
}

function TerminalView({ terminalState, booking, resolvedUsername, resolvedEventTypeSlug, brandHref }: TerminalViewProps) {
  const cancelled = terminalState === "CANCELLED";
  const iconStyle = cancelled
    ? {
        background: "linear-gradient(160deg, rgba(252, 226, 226, 0.9), rgba(245, 214, 214, 0.9))",
        color: "#7a1e1e",
      }
    : undefined;
  const title = cancelled ? "Booking cancelled." : "Booking moved.";
  const subtitle = cancelled
    ? "We've notified your host. You can book another time below whenever you're ready."
    : "Your booking is updated. The new time is on your host's calendar.";

  if (!booking) {
    return (
      <Card padding="lg" className="bk-confirmed-card">
        <div className="bk-confirmed-top">
          <div className="bk-confirmed-icon" style={iconStyle}>
            {cancelled ? "✕" : "✓"}
          </div>
          <div>
            <h2 className="bk-confirmed-title">{title}</h2>
            <p className="bk-confirmed-sub">{subtitle}</p>
          </div>
        </div>
        <div className="bk-confirmed-actions">
          {resolvedUsername && resolvedEventTypeSlug && (
            <Link to={`/book/${resolvedUsername}/${resolvedEventTypeSlug}`} className="bk-confirmed-btn bk-confirmed-btn-primary">
              Book another time
            </Link>
          )}
          <Link to={brandHref} className="bk-confirmed-btn">
            Go to BunnyCal
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <BookingSummaryCard
      bookingId={booking.bookingId}
      eventName={booking.eventTitle}
      hostName={booking.hostName}
      startTime={booking.startTime}
      durationMinutes={booking.durationMinutes}
      timezone={booking.timezone ?? undefined}
      attendeeName={booking.attendeeName}
      attendeeEmail={booking.attendeeEmail}
      conferenceJoinUrl={booking.conferenceDetails?.joinUrl ?? null}
      status={cancelled ? "CANCELLED" : booking.status}
      statusLabel={cancelled ? "CANCELLED" : "RESCHEDULED"}
      header={
        <div className="bk-confirmed-top">
          <div className="bk-confirmed-icon" style={iconStyle}>
            {cancelled ? "✕" : "✓"}
          </div>
          <div>
            <h2 className="bk-confirmed-title">{title}</h2>
            <p className="bk-confirmed-sub">{subtitle}</p>
          </div>
        </div>
      }
    >
      <div className="bk-confirmed-actions">
        {resolvedUsername && resolvedEventTypeSlug && (
          <Link to={`/book/${resolvedUsername}/${resolvedEventTypeSlug}`} className="bk-confirmed-btn bk-confirmed-btn-primary">
            Book another time
          </Link>
        )}
        <Link to={brandHref} className="bk-confirmed-btn">
          Go to BunnyCal
        </Link>
      </div>
    </BookingSummaryCard>
  );
}
