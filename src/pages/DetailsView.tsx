import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { api } from "@/services";

export function DetailsView({ onBack }: { onBack: () => void }) {
  const { ctx, send } = useBooking();
  const { requestHold } = useBookingActions();
  const [touched, setTouched] = useState(false);

  const valid = ctx.details.name.trim().length > 1 && /\S+@\S+\.\S+/.test(ctx.details.email);
  const handleGoogleConnect = () => {
    window.location.href = api.getGoogleOAuthUrl();
  };

  const update = (k: "name" | "email" | "notes", v: string) => send({ type: "UPDATE_DETAILS", details: { [k]: v } });

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3.5 rounded-[12px] border border-white/[.08] bg-panel2">
          <div className="w-9 h-9 rounded-[10px] bg-accent-peach grid place-items-center text-[#7a3a14] font-semibold">↗</div>
          <div className="flex-1 text-[13px]">
            <strong className="block font-medium">Sign in for faster rebooking</strong>
            <span className="text-fg-dim text-[12px]">Optional — we'll remember you and your past meetings.</span>
          </div>
          <Button variant="google" type="button" onClick={handleGoogleConnect}>Google</Button>
        </div>

        {ctx.error && <ErrorBanner code={ctx.error.code} message={ctx.error.message} onDismiss={() => send({ type: "ERROR_CLEARED" })} />}

        <Field label="Name">
          <input
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
            type="email"
            value={ctx.details.email}
            onChange={e => update("email", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="jordan@company.com"
            className={inputCls}
          />
          {touched && !valid && ctx.details.email && (
            <div className="text-[11.5px] text-accent-pink font-mono">enter a valid email</div>
          )}
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

const inputCls = "bg-panel2 border border-white/[.08] text-fg px-3.5 py-3 rounded-[10px] text-[14px] focus:outline-none focus:border-accent-lavender transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-mono uppercase tracking-widest text-fg-faint">{label}</span>
      {children}
    </label>
  );
}
