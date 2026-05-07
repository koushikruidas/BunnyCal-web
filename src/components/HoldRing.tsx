interface Props {
  remaining: number; // seconds
  total: number;     // seconds
}

export function HoldRing({ remaining, total }: Props) {
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <div
      className="relative w-10 h-10 rounded-full grid place-items-center"
      style={{ background: `conic-gradient(#ffe4a8 ${pct}%, rgba(255,255,255,.06) 0)` }}
    >
      <div className="absolute inset-1 rounded-full bg-panel" />
      <span className="font-mono text-[11px] z-10 tracking-tight">{mm}:{ss}</span>
    </div>
  );
}
