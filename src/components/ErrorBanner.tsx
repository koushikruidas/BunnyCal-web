interface Props { code: string; message: string; onDismiss?: () => void; }
export function ErrorBanner({ code, message, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[12px] border border-accent-pink/30 bg-accent-pink/[.08]">
      <div className="w-7 h-7 rounded-lg bg-accent-pink text-[#7a1f47] grid place-items-center shrink-0 font-bold">!</div>
      <div className="flex-1 text-[13px]">
        <strong className="block font-mono text-[11px] uppercase tracking-wider text-fg-dim">{code}</strong>
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-fg-faint hover:text-fg text-[18px] leading-none">×</button>
      )}
    </div>
  );
}
