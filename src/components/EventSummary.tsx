import type { PublicEventInfoResponse } from "@/services/types";
import { Card } from "./Card";
import { BunnyMark } from "./BunnyMark";
import { getBrowserTimeZone } from "@/lib/dateTime";

const Icon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d={d} /></svg>
);

export function EventSummary({ info }: { info: PublicEventInfoResponse | null }) {
  if (!info) return <Card><div className="h-40 animate-pulse bg-surface-sunken rounded-[12px]" /></Card>;
  const localTimezone = getBrowserTimeZone();
  return (
    <Card>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-accent-lavender relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-mint/[.14] border border-accent-mint/[.24] font-mono text-caption uppercase tracking-wider text-accent-mint">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint blink" /> live
          </span>
        </div>
        <h2 className="text-h2 font-semibold m-0">{info.name}</h2>
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-3.5 text-body-sm text-fg-dim">
          <div className="flex items-center gap-2.5"><Icon d="M12 8v.01M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /> with {info.hostName}</div>
          <div className="flex items-center gap-2.5"><Icon d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> {info.duration} min</div>
          <div className="flex items-center gap-2.5"><Icon d="M3 8a2 2 0 012-2h11v12H5a2 2 0 01-2-2V8zM16 10l5-3v10l-5-3" /> {info.location}</div>
          <div className="flex items-center gap-2.5"><Icon d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> {localTimezone}</div>
        </div>
        <div className="border-t border-border-subtle pt-3.5 text-body-sm text-fg-dim leading-relaxed">{info.description}</div>
        <div className="mt-1 p-3.5 rounded-[12px] border border-accent-mint/[.18] bg-gradient-to-br from-accent-mint/[.18] to-accent-lavender/[.10] flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-mint text-[#0f4d35] grid place-items-center shrink-0 font-bold">✓</div>
          <div className="text-body-sm leading-snug">
            <strong className="block text-body-sm text-fg font-medium">No double booking. Ever.</strong>
            <span className="text-fg-dim">Slot is locked the moment you pick it. We re-verify against the host's live calendar before confirming.</span>
          </div>
        </div>
        {/* BunnyCal brand foot — small, restrained */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-border-subtle">
          <BunnyMark size={14} color="#9E8FC7" />
          <span className="font-mono text-[10.5px] tracking-[.12em] uppercase text-fg-faint">BunnyCal</span>
        </div>
      </div>
    </Card>
  );
}
