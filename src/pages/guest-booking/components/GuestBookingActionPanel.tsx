import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface GuestBookingActionPanelProps {
  canMutate: boolean;
  minRescheduleDateTime: string;
  cancelPending: boolean;
  reschedulePending: boolean;
  onCancelConfirm: () => Promise<void>;
  onRescheduleSubmit: (nextStartAt: string) => Promise<void>;
}

export function GuestBookingActionPanel({
  canMutate,
  minRescheduleDateTime,
  cancelPending,
  reschedulePending,
  onCancelConfirm,
  onRescheduleSubmit,
}: GuestBookingActionPanelProps) {
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  return (
    <>
      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-[#e2e8f0] p-4">
          <h2 className="text-lg font-semibold text-[#0f172a]">Cancel booking</h2>
          <p className="mt-1 text-sm text-[#64748b]">Cancels this booking immediately. Duplicate submits are blocked while processing.</p>
          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            disabled={!canMutate || cancelPending || reschedulePending}
            className="mt-4 rounded-xl bg-[#b91c1c] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {cancelPending ? "Cancelling..." : "Cancel booking"}
          </button>
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] p-4">
          <h2 className="text-lg font-semibold text-[#0f172a]">Reschedule booking</h2>
          <p className="mt-1 text-sm text-[#64748b]">Choose a new time. Request processing may be asynchronous with calendar providers.</p>
          <label className="mt-3 block text-sm text-[#334155]">
            New start time
            <input
              type="datetime-local"
              value={rescheduleAt}
              min={minRescheduleDateTime}
              onChange={(event) => setRescheduleAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => onRescheduleSubmit(rescheduleAt)}
            disabled={!canMutate || cancelPending || reschedulePending}
            className="mt-4 rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {reschedulePending ? "Submitting..." : "Reschedule booking"}
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        tone="danger"
        pending={cancelPending}
        title="Cancel this booking?"
        description="This action is safe to retry if it was already cancelled."
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={async () => {
          await onCancelConfirm();
          setConfirmCancelOpen(false);
        }}
      />
    </>
  );
}
