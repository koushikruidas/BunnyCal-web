import type { IntegrationProviderId, IntegrationUiStatus } from "@/state/IntegrationContext";

interface IntegrationCardProps {
  provider: IntegrationProviderId;
  title: string;
  description: string;
  status: IntegrationUiStatus;
  rawStatus?: string;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function providerIcon(provider: IntegrationProviderId) {
  if (provider === "google") return "G";
  if (provider === "microsoft") return "M";
  return "Z";
}

function statusLabel(status: IntegrationUiStatus, rawStatus?: string) {
  if (rawStatus) return rawStatus;
  if (status === "connected") return "Connected";
  if (status === "syncing") return "Syncing";
  if (status === "failed") return "Failed";
  return "Disconnected";
}

function tone(status: IntegrationUiStatus) {
  if (status === "connected") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "syncing") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "failed") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function IntegrationCard({ provider, title, description, status, rawStatus, busy, onConnect, onDisconnect }: IntegrationCardProps) {
  const connectLabel = status === "failed" ? "Reconnect" : "Connect";
  return (
    <article className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-surface text-sm font-semibold text-accent-fg" aria-hidden="true">{providerIcon(provider)}</span>
            <h3 className="font-semibold text-text-primary">{title}</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary break-words">{description}</p>
        </div>
        <span className={`min-w-0 max-w-[55%] break-all rounded-full border px-2.5 py-1 text-right text-xs font-medium ${tone(status)}`}>{statusLabel(status, rawStatus)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "connected" || status === "syncing" ? (
          <>
            <button onClick={onConnect} disabled={busy || provider !== "google"} className="focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary disabled:opacity-60">Reconnect</button>
            <button onClick={onDisconnect} disabled={busy} className="focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-danger-fg disabled:opacity-60">{busy ? "Disconnecting..." : "Disconnect"}</button>
          </>
        ) : (
          <button onClick={onConnect} disabled={busy || provider !== "google"} className="focus-ring min-h-touch rounded-lg bg-surface-inverse px-3 py-1.5 text-sm font-medium text-text-on-inverse disabled:opacity-60">{busy ? "Connecting..." : connectLabel}</button>
        )}
      </div>
      {provider !== "google" && <p className="mt-2 text-xs text-text-tertiary">Connect is currently available for Google via host OAuth.</p>}
    </article>
  );
}
