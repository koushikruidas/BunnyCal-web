import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import type { HostKind } from "@/services/bookingResolver";
import { api } from "@/services";
import { saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";

export function DetailsView({ onBack, hostKind = "authenticated-host" }: { onBack: () => void; hostKind?: HostKind }) {
  const { ctx, send, persistForOAuthRedirect } = useBooking();
  const { requestHold } = useBookingActions(hostKind);
  const { user } = useAuth();
  const [touched, setTouched] = useState(false);

  const normalizedName = ctx.details.name.trim();
  const normalizedEmail = ctx.details.email.trim();
  const hasEmail = normalizedEmail.length > 0;
  const validEmail = /\S+@\S+\.\S+/.test(normalizedEmail);
  const valid = normalizedName.length > 1 && validEmail;
  const handleGoogleConnect = async () => {
    try {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      saveAuthIntent({ mode: "INTEGRATION", provider: "GOOGLE", returnTo });
      persistForOAuthRedirect();
      const oauthUrl = new URL(api.getGoogleOAuthUrl());
      oauthUrl.searchParams.set("redirect", returnTo);
      window.location.href = oauthUrl.toString();
    } catch (e) {
      console.error("Failed to start Google Calendar connect from public booking page", e);
    }
  };

  const update = (k: "name" | "email" | "notes", v: string) => send({ type: "UPDATE_DETAILS", details: { [k]: v } });

  useEffect(() => {
    if (!user) return;
    const nextName = ctx.details.name.trim() ? undefined : user.name || user.username || undefined;
    const nextEmail = ctx.details.email.trim() ? undefined : user.email || undefined;
    if (!nextName && !nextEmail) return;
    send({ type: "UPDATE_DETAILS", details: { ...(nextName ? { name: nextName } : {}), ...(nextEmail ? { email: nextEmail } : {}) } });
  }, [ctx.details.email, ctx.details.name, send, user]);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {user ? (
          <div className="flex items-center gap-3 p-3.5 rounded-[12px] border border-emerald-400/30 bg-emerald-500/10">
            <div className="w-9 h-9 rounded-[10px] bg-emerald-500/20 text-emerald-200 grid place-items-center font-semibold">✓</div>
            <div className="flex-1 text-[13px]">
              <strong className="block font-medium">Signed in as {user.email}</strong>
              <span className="text-fg-dim text-[12px]">Your attendee details are restored for this booking.</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3.5 rounded-[12px] border border-white/[.08] bg-panel2">
            <div className="w-9 h-9 rounded-[10px] bg-accent-peach grid place-items-center text-[#7a3a14] font-semibold">↗</div>
            <div className="flex-1 text-[13px]">
              <strong className="block font-medium">Sign in for faster rebooking</strong>
              <span className="text-fg-dim text-[12px]">Optional — we'll remember you and your past meetings.</span>
            </div>
            <Button variant="google" type="button" onClick={handleGoogleConnect}>Google</Button>
          </div>
        )}

        {ctx.error && <ErrorBanner code={ctx.error.code} message={ctx.error.message} onDismiss={() => send({ type: "ERROR_CLEARED" })} />}

        <Field label="Name">
          <input
            id="booking-guest-name"
            type="text"
            value={ctx.details.name}
            onChange={e => update("name", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Jordan Lee"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            id="booking-guest-email"
            type="email"
            value={ctx.details.email}
            onChange={e => update("email", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="jordan@company.com"
            className={inputCls}
            aria-invalid={touched && (!hasEmail || !validEmail) ? "true" : undefined}
            aria-describedby={touched && (!hasEmail || !validEmail) ? "booking-email-error" : undefined}
          />
          {touched && !hasEmail && <div id="booking-email-error" role="alert" className="text-[11.5px] text-accent-pink font-mono">email is required</div>}
          {touched && hasEmail && !validEmail && <div id="booking-email-error" role="alert" className="text-[11.5px] text-accent-pink font-mono">enter a valid email</div>}
        </Field>
        <Field label="What should we cover? (optional)">
          <textarea
            value={ctx.details.notes}
            onChange={e => update("notes", e.target.value)}
            placeholder="A quick note so I can prep…"
            className={inputCls + " min-h-[80px] resize-y"}
          />
        </Field>

        <div className="flex items-center gap-2.5 justify-end">
          <Button variant="ghost" onClick={onBack} disabled={ctx.loading}>Back</Button>
          <Button disabled={!valid || ctx.loading} onClick={requestHold}>
            {ctx.loading ? "Reserving…" : "Reserve this slot"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const inputCls = "focus-ring bg-panel2 border border-white/[.08] text-fg px-3.5 py-3 rounded-[10px] text-[14px] focus:outline-none focus:border-accent-lavender transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-mono uppercase tracking-widest text-fg-faint">{label}</span>
      {children}
    </label>
  );
}
