import { useMemo } from "react";
import { useIntegrationState } from "@/state/IntegrationContext";
import { providerLabel, providerStatusTone } from "@/components/integrations/providerUi";
import { ProviderStatusRow } from "@/components/integrations/ProviderStatusRow";

export function DashboardParticipationSection() {
  const { calendarStatus, conferencingStatus } = useIntegrationState();

  const calendarRows = useMemo(() => Object.entries(calendarStatus), [calendarStatus]);
  const conferencingRows = useMemo(() => Object.entries(conferencingStatus), [conferencingStatus]);

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <div>
          <h2>Service <em>participation</em></h2>
          <div className="sub">How connected services quietly participate in scheduling coordination.</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="h">
          <div>
            <h3>Calendar participation</h3>
            <div className="sub">Sources that shape availability and booking confidence.</div>
          </div>
        </div>
        {calendarRows.length === 0 ? (
          <div className="dash-empty" style={{ padding: "12px 0" }}>
            <h3>No calendar participants</h3>
            <p>Connect a calendar provider to establish participation.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {calendarRows.map(([provider, entry]) => (
              <ProviderStatusRow
                key={provider}
                iconText={providerLabel(provider).slice(0, 1)}
                name={providerLabel(provider)}
                subtitle="Calendar participation reported by backend orchestration."
                meta={Array.isArray(entry.calendars) ? `${entry.calendars.length} calendars` : "Calendar details not reported"}
                status={entry.status}
                statusClass={providerStatusTone(entry.status)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="h">
          <div>
            <h3>Conferencing participation</h3>
            <div className="sub">Providers that generate and attach call links.</div>
          </div>
        </div>
        {conferencingRows.length === 0 ? (
          <div className="dash-empty" style={{ padding: "12px 0" }}>
            <h3>No conferencing participants</h3>
            <p>Connect conferencing providers to enable call-link participation.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {conferencingRows.map(([provider, entry]) => (
              <ProviderStatusRow
                key={provider}
                iconText={providerLabel(provider).slice(0, 1)}
                name={providerLabel(provider)}
                subtitle="Conferencing orchestration capability."
                meta="Guest meeting-link participation"
                status={entry.status}
                statusClass={providerStatusTone(entry.status)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
