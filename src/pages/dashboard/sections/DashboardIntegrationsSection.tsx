import clsx from "@/lib/clsx";
import type { CalendarConnectionRuntime, ConferencingRuntimeState, ProviderAwareStatusMap, ProviderCapabilityMap, ProviderStatusEntry } from "@/services/types";
import { providerLabel } from "@/components/integrations/providerUi";
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

function ProviderRow({
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
  const disabled = status === "failed";
  const description = isCapability && !connected
    ? `Connect ${managedByLabel || "your calendar"} to enable ${providerLabel(provider)}.`
    : isCapability
    ? `Included with your ${managedByLabel || "calendar"} connection.`
    : kind === "calendar"
    ? capabilitySummary(capability, calendars.length) || "Check availability and mirror bookings."
    : "Generates a unique link per booking.";
  const statusText = connected ? "Connected" : disabled ? "Unavailable" : "Not connected";

  return (
    <div className="conn-row">
      <div className={clsx("conn-logo", kind === "calendar" ? "sky" : "peach")}>
        {providerLabel(provider).slice(0, 1)}
      </div>
      <div className="conn-meta">
        <div className="nm">
          {providerLabel(provider)}
          <span className={clsx("conn-status", connected ? "ready" : "soon")}>
            <span className="d" />
            {statusText}
          </span>
        </div>
        <div className="ds">{description}</div>
      </div>
      {connected && supportsDisconnect ? (
        <button className="conn-btn is-connected" onClick={() => onRequestDisconnect(kind, provider)} disabled={busy}>
          {busy ? "Disconnecting..." : "Disconnect"}
        </button>
      ) : connected ? (
        <button className="conn-btn is-connected" disabled>{isCapability ? "Managed" : "Connected"}</button>
      ) : (
        <button className={clsx("conn-btn", disabled && "is-disabled")} onClick={() => onConnect(provider)} disabled={busy || disabled}>
          {busy ? "Connecting..." : disabled ? "Unavailable" : "Connect"}
        </button>
      )}
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
  const connectedCalendars = calendarProviders.filter((p) => {
    const status = getCalendarProviderStatus(p);
    return status === "connected" || status === "syncing";
  }).length;
  const connectedConferencing = conferencingProviders.filter((p) => {
    const status = getConferencingProviderStatus(p);
    return status === "connected" || status === "syncing";
  }).length;
  const progressPoints = (connectedCalendars > 0 ? 1 : 0) + (connectedConferencing > 0 ? 1 : 0) + (connectedCalendars > 0 && connectedConferencing > 0 ? 1 : 0);
  const progressLabel = progressPoints === 3 ? "You're all set" : `${progressPoints} of 3 done`;
  const progressPercent = Math.round((progressPoints / 3) * 100);

  return (
    <div className="dash-section">
      {banner && (
        <div className="dash-alert success">
          <span>{banner}</span>
          <button onClick={clearBanner} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }}>Dismiss</button>
        </div>
      )}
      {integrationsError && <div className="dash-alert error">{integrationsError}</div>}

      <div className="ig-wrap">
        <section className="ig-hero">
          <div className="ig-bunny-stage" aria-hidden="true">
            <div className={clsx("bunny-bob", progressPoints === 3 && "happy")}>
              <div className="bunny-shadow" />
              <div className="bunny">
                <div className="ear left"><span className="inner" /></div>
                <div className="ear right"><span className="inner" /></div>
                <div className="body"><span className="belly" /></div>
                <div className="paw left" /><div className="paw right" />
                <div className="head">
                  <span className="cheek left" /><span className="cheek right" />
                  <span className="eye left" /><span className="eye right" />
                  <span className="nose" />
                </div>
              </div>
            </div>
          </div>
          <div className="ig-hero-copy">
            <span className="eyebrow">Let&apos;s get you set up</span>
            <h2>Connect your tools, <em>calmly.</em></h2>
            <p>Link a calendar so BunnyCal knows when you&apos;re free, and a video service so every booking gets a join link.</p>
            <div className="ig-hero-meta">
              <div className="ig-progress">
                <span className="lbl">{progressLabel}</span>
                <span className="track"><span className="fill" style={{ width: `${progressPercent}%` }} /></span>
              </div>
              <span className="ig-hero-hint"><span className="dot" />{connectedCount > 0 ? `${connectedCount} services connected` : "Your meetings, always calm"}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => refreshStatus(true)} disabled={integrationsLoading}>
                {integrationsLoading ? "Refreshing..." : "Refresh status"}
              </button>
            </div>
          </div>
        </section>

        <div className="ig-cols">
          <section className="ig-group" aria-label="Connected calendars">
            <header className="ig-group-head">
              <span className="role-eyebrow"><span className="swatch s-cal" />Connected calendars</span>
              <h3>Where your time <em>actually lives.</em></h3>
              <p>Connect calendars so BunnyCal can check availability and mirror bookings.</p>
            </header>
            {calendarProviders.map((provider) => (
              <ProviderRow
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
          </section>

          <section className="ig-group" aria-label="Conferencing">
            <header className="ig-group-head">
              <span className="role-eyebrow"><span className="swatch s-conf" />Conferencing</span>
              <h3>Join links, <em>handled for you.</em></h3>
              <p>Used for join links only.</p>
            </header>
            {teamsDisabledByRuntime && (
              <div className="sub" style={{ marginBottom: 8 }}>
                {hasConsumerMsa
                  ? unsupportedCapabilityMessage()
                  : "Microsoft Teams is currently unavailable for this connection."}
              </div>
            )}
            {conferencingProviders.map((provider) => (
              <ProviderRow
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
          </section>
        </div>

        <div className="ig-note">
          <span className="ico">i</span>
          <span><strong>Sign-in accounts</strong> are used to log in. Linking another account does not add it to scheduling.</span>
        </div>
      </div>
    </div>
  );
}
