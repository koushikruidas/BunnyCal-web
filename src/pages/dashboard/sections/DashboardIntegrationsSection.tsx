import clsx from "@/lib/clsx";
import type { CalendarConnectionRuntime, ConferencingRuntimeState, ProviderAwareStatusMap, ProviderCapabilityMap, ProviderStatusEntry } from "@/services/types";
import { providerDotClass, providerLabel } from "@/components/integrations/providerUi";
import { toManagedProviderLabel } from "@/lib/providerIds";
import { hasConsumerMicrosoftConnection, isTeamsDisabledByRuntimeCapability, unsupportedCapabilityMessage } from "@/lib/conferencingCapabilities";

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
  calendarConnections: CalendarConnectionRuntime[];
  conferencingRuntime: ConferencingRuntimeState;
  conferencingStatus: ProviderAwareStatusMap;
  calendarCapabilities: ProviderCapabilityMap;
  conferencingCapabilities: ProviderCapabilityMap;
  getCalendarProviderStatus: (provider: string) => IntegrationUiStatus;
  getConferencingProviderStatus: (provider: string) => IntegrationUiStatus;
  onRequestDisconnect: (kind: "calendar" | "conferencing", provider: string) => void;
  onConnectCalendar: (provider: string) => void;
  onConnectConferencing: (provider: string) => void;
}

function capabilitySummary(cap: Record<string, unknown> | undefined, calendarsCount?: number) {
  if (!cap) return "";
  const parts: string[] = [];
  if (typeof calendarsCount === "number" && calendarsCount > 0) parts.push(`${calendarsCount} calendar${calendarsCount !== 1 ? "s" : ""}`);
  if (cap.supportsWebhooks || cap.supportsIncrementalSync) parts.push("Live sync active");
  return parts.join(" · ");
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
  const isCapability = kind === "conferencing" && entry?.type === "capability";
  const supportsDisconnect = entry?.disconnectSupported !== false && !isCapability;
  const managedByLabel = isCapability ? toManagedProviderLabel(String(entry?.managedBy ?? "")) : "";

  return (
    <div className="int-tile-mini">
      <div className="logo">{providerLabel(provider).slice(0, 1)}</div>
      <div>
        <div className="name">{providerLabel(provider)}</div>
        <div className="last">
          {isCapability && !connected
            ? `Connect ${managedByLabel || "your calendar"} to enable ${providerLabel(provider)}`
            : isCapability
            ? `Included with your ${managedByLabel || "calendar"} connection`
            : kind === "calendar"
            ? capabilitySummary(capability, calendars.length)
            : "Generates a unique link per booking"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <div className={clsx("dot", providerDotClass(status))} aria-label={connected ? "Connected" : "Disconnected"} />
        {connected && supportsDisconnect ? (
          <button
            className="dash-btn-secondary"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => onRequestDisconnect(kind, provider)}
            disabled={busy}
          >
            {busy ? "..." : "Disconnect"}
          </button>
        ) : connected ? (
          <span style={{ fontSize: 11, color: "var(--plum-500)" }}>{isCapability ? "Managed" : "Connected"}</span>
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
  calendarConnections,
  conferencingRuntime,
  conferencingStatus,
  calendarCapabilities,
  conferencingCapabilities,
  getCalendarProviderStatus,
  getConferencingProviderStatus,
  onRequestDisconnect,
  onConnectCalendar,
  onConnectConferencing,
}: Props) {
  const CANONICAL_CALENDAR_PROVIDERS = ["google", "microsoft"] as const;
  const CANONICAL_CONFERENCING_PROVIDERS = ["google_meet", "microsoft_teams", "zoom"] as const;

  const calendarProviders = Array.from(new Set([
    ...CANONICAL_CALENDAR_PROVIDERS,
    ...Object.keys(calendarStatus),
    ...calendarConnections.map((connection) => connection.provider),
    ...Object.keys(calendarCapabilities).map((k) => k.toLowerCase()),
  ])).filter((p) => p && p !== "none" && p !== "custom_url");

  const teamsDisabledByRuntime = isTeamsDisabledByRuntimeCapability(calendarConnections, conferencingRuntime);
  const hasConsumerMsa = hasConsumerMicrosoftConnection(calendarConnections);
  const conferencingProviders = Array.from(new Set([
    ...CANONICAL_CONFERENCING_PROVIDERS,
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
          <h3 className="h3">Integrations <em>overview.</em></h3>
          <div className="sub" style={{ marginBottom: 10 }}>
            Sign-in accounts, connected calendars, and conferencing are separate concerns.
          </div>
          <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="stat">
              <div className="lbl">Calendars</div>
              <div className="val">{calendarProviders.length}</div>
              <div className="hint">{calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length} connected</div>
            </div>
            <div className="stat">
              <div className="lbl">Video links</div>
              <div className="val">{conferencingProviders.length}</div>
              <div className="hint">{conferencingProviders.filter((p) => getConferencingProviderStatus(p) === "connected").length} connected</div>
            </div>
          </div>
          <div className="panel" style={{ marginTop: 10, padding: 12 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }}>
              Sign-in accounts
            </div>
            <div className="sub" style={{ marginTop: 6 }}>Used to log in. Linking another account does not add it to scheduling.</div>
          </div>
          <div className="logos">
            {connectedCount > 0 ? (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }}>
                {connectedCount} services connected
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
            Connected calendars
          </div>
          <div className="sub" style={{ marginBottom: 8 }}>
            Connect calendars so BunnyCal can check availability and mirror bookings.
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
          <div className="sub" style={{ marginBottom: 8 }}>
            Used for join links only.
          </div>
          {teamsDisabledByRuntime && (
            <div className="sub" style={{ marginBottom: 8 }}>
              {hasConsumerMsa
                ? unsupportedCapabilityMessage()
                : "Microsoft Teams is currently unavailable for this connection."}
            </div>
          )}
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
