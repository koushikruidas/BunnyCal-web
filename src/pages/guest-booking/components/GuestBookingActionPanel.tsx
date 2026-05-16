import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Input } from "@/ui/controls";

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
  const rescheduleDisabled = !canMutate || cancelPending || reschedulePending || !rescheduleAt;

  return (
    <>
      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-border-subtle bg-surface p-4">
          <h2 className="text-lg font-semibold text-text-primary">Cancel booking</h2>
          <p className="mt-1 text-sm text-text-secondary">Cancel this booking if plans changed.</p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmCancelOpen(true)}
            disabled={!canMutate || cancelPending || reschedulePending}
            className="mt-4"
          >
            {cancelPending ? "Cancelling..." : "Cancel booking"}
          </Button>
        </section>

        <section className="rounded-2xl border border-border-subtle bg-surface p-4">
          <h2 className="text-lg font-semibold text-text-primary">Reschedule booking</h2>
          <p className="mt-1 text-sm text-text-secondary">Move this meeting to a new time while preserving booking continuity.</p>
          <label htmlFor="guest-reschedule-start" className="mt-3 block text-sm text-text-primary">
            New start time
            <Input
              id="guest-reschedule-start"
              type="datetime-local"
              value={rescheduleAt}
              min={minRescheduleDateTime}
              onChange={(event) => setRescheduleAt(event.target.value)}
              className="mt-1"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRescheduleSubmit(rescheduleAt)}
            disabled={rescheduleDisabled}
            className="mt-4"
          >
            {reschedulePending ? "Submitting..." : "Reschedule booking"}
          </Button>
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
