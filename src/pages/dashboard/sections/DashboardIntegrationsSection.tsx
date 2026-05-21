import clsx from "@/lib/clsx";
import type { ProviderAwareStatusMap, ProviderCapabilityMap, ProviderStatusEntry } from "@/services/types";
import { providerDotClass, providerLabel } from "@/components/integrations/providerUi";

type IntegrationUiStatus = "connected" | "disconnected" | "syncing" | "failed";

interface PendingAction {
  provider: string;
  kind: "calendar" | "conferencing";
}

interface Props {
  banner: string | null;
  integrationsError: string | null;
  clearBanner: () => void;
  integrationsLoading: boolean;
  refreshStatus: (force?: boolean) => Promise<void>;
  pendingAction: PendingAction | null;
  calendarStatus: ProviderAwareStatusMap;
  conferencingStatus: ProviderAwareStatusMap;
  calendarCapabilities: ProviderCapabilityMap;
  conferencingCapabilities: ProviderCapabilityMap;
  getCalendarProviderStatus: (provider: string) => IntegrationUiStatus;
  getConferencingProviderStatus: (provider: string) => IntegrationUiStatus;
  onRequestDisconnect: (kind: "calendar" | "conferencing", provider: string) => void;
  onConnectCalendar: (provider: string) => void;
  onConnectConferencing: (provider: string) => void;
}

function capabilitySummary(cap: Record<string, unknown> | undefined) {
  if (!cap) return "Capability metadata not reported";
  const flags: string[] = [];
  if (cap.supportsMultipleCalendars) flags.push("multi-calendar");
  if (cap.supportsWebhooks) flags.push("webhooks");
  if (cap.supportsConferenceCreation) flags.push("meeting-link create");
  if (cap.supportsIncrementalSync) flags.push("incremental sync");
  if (cap.supportsAvailabilitySync) flags.push("availability sync");
  return flags.length > 0 ? flags.join(" · ") : "Provider capabilities available";
}

function ProviderTile({
  kind,
  provider,
  status,
  entry,
  pendingAction,
  onRequestDisconnect,
  onConnect,
  capability,
}: {
  kind: "calendar" | "conferencing";
  provider: string;
  status: IntegrationUiStatus;
  entry?: ProviderStatusEntry;
  pendingAction: PendingAction | null;
  onRequestDisconnect: (kind: "calendar" | "conferencing", provider: string) => void;
  onConnect: (provider: string) => void;
  capability?: Record<string, unknown>;
}) {
  const busy = pendingAction?.provider === provider && pendingAction.kind === kind;
  const connected = status === "connected" || status === "syncing";
  const calendars = Array.isArray(entry?.calendars) ? entry?.calendars : [];

  return (
    <div className="int-tile-mini">
      <div className="logo">{providerLabel(provider).slice(0, 1)}</div>
      <div>
        <div className="name">{providerLabel(provider)}</div>
        <div className="last">
          {kind === "calendar" && calendars.length > 0
            ? `${calendars.length} calendars reported · ${capabilitySummary(capability)}`
            : capabilitySummary(capability)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <div className={clsx("dot", providerDotClass(status))} aria-label={connected ? "Connected" : "Disconnected"} />
        {connected ? (
          <button
            className="dash-btn-secondary"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => onRequestDisconnect(kind, provider)}
            disabled={busy}
          >
            {busy ? "..." : "Disconnect"}
          </button>
        ) : (
          <button
            className="dash-btn-primary"
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 9 }}
            onClick={() => onConnect(provider)}
            disabled={busy}
          >
            {busy ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardIntegrationsSection({
  banner,
  integrationsError,
  clearBanner,
  integrationsLoading,
  refreshStatus,
  pendingAction,
  calendarStatus,
  conferencingStatus,
  calendarCapabilities,
  conferencingCapabilities,
  getCalendarProviderStatus,
  getConferencingProviderStatus,
  onRequestDisconnect,
  onConnectCalendar,
  onConnectConferencing,
}: Props) {
  const calendarProviders = Array.from(new Set([
    ...Object.keys(calendarStatus),
    ...Object.keys(calendarCapabilities).map((k) => k.toLowerCase()),
  ])).filter((p) => p && p !== "none" && p !== "custom_url");

  const conferencingProviders = Array.from(new Set([
    ...Object.keys(conferencingStatus),
    ...Object.keys(conferencingCapabilities).map((k) => k.toLowerCase()),
  ])).filter((p) => p && p !== "none" && p !== "custom_url");

  const connectedCount =
    calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length +
    conferencingProviders.filter((p) => getConferencingProviderStatus(p) === "connected").length;

  return (
    <div className="dash-section">
      {banner && (
        <div className="dash-alert success">
          <span>{banner}</span>
          <button onClick={clearBanner} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }}>Dismiss</button>
        </div>
      )}
      {integrationsError && <div className="dash-alert error">{integrationsError}</div>}

      <div className="int-band">
        <div className="int-fabric">
          <h3 className="h3">Connected <em>services.</em></h3>
          <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="stat">
              <div className="lbl">Calendar providers</div>
              <div className="val">{calendarProviders.length}</div>
              <div className="hint">{calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length} connected</div>
            </div>
            <div className="stat">
              <div className="lbl">Conferencing providers</div>
              <div className="val">{conferencingProviders.length}</div>
              <div className="hint">{conferencingProviders.filter((p) => getConferencingProviderStatus(p) === "connected").length} connected</div>
            </div>
          </div>
          <div className="logos">
            {connectedCount > 0 ? (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }}>
                {connectedCount} service connections actively supporting orchestration
              </span>
            ) : (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }}>
                No integrations connected yet
              </span>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => refreshStatus(true)} disabled={integrationsLoading}>
              {integrationsLoading ? "Refreshing..." : "Refresh status"}
            </button>
          </div>
        </div>

        <div className="int-tiles-col">
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginBottom: 2 }}>
            Calendar
          </div>
          {calendarProviders.map((provider) => (
            <ProviderTile
              key={`calendar:${provider}`}
              kind="calendar"
              provider={provider}
              status={getCalendarProviderStatus(provider)}
              entry={calendarStatus[provider]}
              pendingAction={pendingAction}
              onRequestDisconnect={onRequestDisconnect}
              onConnect={onConnectCalendar}
              capability={calendarCapabilities[provider.toUpperCase()]}
            />
          ))}

          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginTop: 12, marginBottom: 2 }}>
            Conferencing
          </div>
          {conferencingProviders.map((provider) => (
            <ProviderTile
              key={`conferencing:${provider}`}
              kind="conferencing"
              provider={provider}
              status={getConferencingProviderStatus(provider)}
              entry={conferencingStatus[provider]}
              pendingAction={pendingAction}
              onRequestDisconnect={onRequestDisconnect}
              onConnect={onConnectConferencing}
              capability={conferencingCapabilities[provider.toUpperCase()]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
