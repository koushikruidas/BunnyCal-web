import { useState } from "react";
import type { ReactNode } from "react";
import { Dialog } from "@/ui/controls/Dialog";

export interface AvailabilityCalendarRow {
  key: string;
  connectionId: string;
  provider: string;
  externalCalendarId: string;
  canWrite: boolean;
  label: string;
  connectionLabel: string;
}

interface CalendarsProjectionStepProps {
  rows: AvailabilityCalendarRow[];
  selectedKeys: Set<string>;
  projectionKey: string;
  integrationsError?: string | null;
  hasConnectedProviders: boolean;
  connectionActions?: Array<{
    provider: string;
    label: string;
    status?: "connected" | "disconnected" | "syncing" | "failed";
    onConnect: () => void;
  }>;
  autoConfiguredMessage?: string | null;
  onToggleAvailability: (row: AvailabilityCalendarRow) => void;
  onSelectProjection: (key: string) => void;
  toLabel: (provider: string) => string;
}

function CPMark({ id }: { id: string }) {
  const s = { stroke: "#2B1F3D", strokeWidth: 1.4, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "google") {
    return (
      <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="3" y="5" width="16" height="14" rx="3" {...s} />
        <path d="M3 9.5h16M7 3.5v4M15 3.5v4" {...s} />
        <path d="M8.5 13.5l2 2 3.5-4" {...s} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="3" y="5" width="16" height="14" rx="3" {...s} />
      <path d="M3 9.5h16M7 3.5v4M15 3.5v4" {...s} />
      <circle cx="8" cy="13.5" r="0.9" fill="#2B1F3D" />
      <circle cx="11" cy="13.5" r="0.9" fill="#2B1F3D" />
      <circle cx="14" cy="13.5" r="0.9" fill="#2B1F3D" />
      <circle cx="8" cy="16" r="0.9" fill="#2B1F3D" />
      <circle cx="11" cy="16" r="0.9" fill="#2B1F3D" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.5 7.3L5.4 10L11.5 4" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="cp-block">
      <div className="cp-block-head">
        <span className="cp-idx">{index}</span>
        <div className="cp-block-heir">
          <div className="cp-block-title">{title}</div>
          <div className="cp-block-desc">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function CalendarsProjectionStep({
  rows,
  selectedKeys,
  projectionKey,
  integrationsError,
  hasConnectedProviders,
  connectionActions = [],
  autoConfiguredMessage,
  onToggleAvailability,
  onSelectProjection,
  toLabel,
}: CalendarsProjectionStepProps) {
  const writableRows = rows.filter((row) => row.canWrite);
  const showConnectionEmptyState = !hasConnectedProviders;
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);

  return (
    <>
      <div className="onb-step-head">
        <span className="eyebrow">Step 02 · Calendars &amp; projection</span>
        <h2>Select calendars that shape <em>availability and writeback.</em></h2>
        <p>Toggle the calendars bunnyCal should check for conflicts, then choose the one calendar that receives confirmed bookings.</p>
      </div>
      {integrationsError ? <p className="onb-error">{integrationsError}</p> : null}

      <div className="cp-wrap">
        {autoConfiguredMessage ? (
          <div className="cp-success-note" role="status">
            <span className="cp-success-dot" />
            <span>{autoConfiguredMessage}</span>
          </div>
        ) : null}

        <StepSection
          index="1"
          title="Availability calendars"
          description="bunnyCal checks these for conflicts, so it only ever offers times you're genuinely free."
        >
          {showConnectionEmptyState ? (
            <div className="cp-empty-card" role="region" aria-label="Connect a calendar provider">
              <div className="cp-empty-kicker">Calendar connection required</div>
              <h3 className="cp-empty-title">Connect your first calendar</h3>
              <p className="cp-empty-copy">
                BunnyCal needs a connected calendar to check availability, prevent conflicts, and schedule bookings.
              </p>
              <div className="cp-empty-actions">
                <button
                  type="button"
                  className="onb-btn onb-btn-primary cp-empty-action"
                  onClick={() => setProviderPickerOpen(true)}
                  disabled={connectionActions.length === 0}
                >
                  Connect calendar
                </button>
              </div>
              <p className="cp-empty-footnote">
                You can add additional calendar providers later from Integrations.
              </p>
            </div>
          ) : (
            <div className="cp-list">
              {rows.map((row) => {
                const on = selectedKeys.has(row.key);
                return (
                  <div key={row.key} className="cp-lrow">
                    <div className="cp-mcal">
                      <span className="mk" style={{ background: "var(--lilac-soft)", borderColor: "var(--lilac)" }}>
                        <CPMark id={String(row.provider).toLowerCase()} />
                      </span>
                      <span className="cp-mcal-text">
                        <span className="nm">{row.label.replace(/@.*/, "").trim() || row.label}</span>
                        <span className="sb">{toLabel(row.provider)}</span>
                      </span>
                    </div>
                    <span className={"cp-lstate" + (on ? " on" : "")}>{on ? "Checking conflicts" : "Not checked"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className={"onb-toggle toggle" + (on ? " on" : "")}
                      onClick={() => onToggleAvailability(row)}
                      aria-label={`Check ${row.label} for free/busy`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </StepSection>

        <StepSection
          index="2"
          title={<>Booking calendar <span className="cp-wb">writeback</span></>}
          description="Pick the one calendar where every confirmed booking is written. Only this calendar is ever edited."
        >
          {showConnectionEmptyState ? (
            <div className="cp-disabled-note" role="note">
              Connect a calendar first to choose where confirmed bookings are written.
            </div>
          ) : (
            <div className="cp-dest-grid" role="radiogroup" aria-label="Booking destination calendar">
              {writableRows.map((row) => {
                const selected = projectionKey === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={"cp-dest" + (selected ? " on" : "")}
                    onClick={() => onSelectProjection(row.key)}
                  >
                    <span className="cp-dest-mark" style={{ background: "var(--lilac-soft)", borderColor: "var(--lilac)" }}>
                      <CPMark id={String(row.provider).toLowerCase()} />
                    </span>
                    <span className="cp-dest-body">
                      <span className="cp-dest-name">
                        <span className="cp-swatch" style={{ background: row.provider === "microsoft" ? "#BBC9DF" : "#B8A6DD" }}></span>
                        {row.label.replace(/@.*/, "").trim() || row.label}
                      </span>
                      <span className="cp-dest-sub">{toLabel(row.provider)}</span>
                    </span>
                    {selected && <span className="cp-dest-tick"><Check /></span>}
                  </button>
                );
              })}
            </div>
          )}

          {!showConnectionEmptyState && !projectionKey && writableRows.length > 0 && (
            <div className="cp-note" role="alert">
              <svg className="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l6.5 11.5h-13L8 1.5z" /><path d="M8 6.5v3.2M8 11.8v.2" /></svg>
              Pick where confirmed bookings should land before you continue.
            </div>
          )}
        </StepSection>

        <span className="cp-reassure">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
          Encrypted in transit · bunnyCal reads quietly and never overwrites your events.
        </span>
      </div>

      {!showConnectionEmptyState && rows.length === 0 && (
        <div className="cp-note" role="alert">
          <svg className="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l6.5 11.5h-13L8 1.5z" /><path d="M8 6.5v3.2M8 11.8v.2" /></svg>
          No eligible calendars are available yet. Check the connected provider status, then refresh this step.
        </div>
      )}

      <Dialog
        open={providerPickerOpen}
        onClose={() => setProviderPickerOpen(false)}
        title="Choose a calendar provider"
        description="Connect a calendar provider to start checking availability and writing confirmed bookings."
        width="sm"
      >
        <div className="cp-provider-list">
          {connectionActions.map((action) => {
            const busy = action.status === "syncing";
            return (
              <button
                key={action.provider}
                type="button"
                className="cp-provider-option"
                onClick={() => {
                  action.onConnect();
                  setProviderPickerOpen(false);
                }}
                disabled={busy}
              >
                <span className="cp-provider-option-copy">
                  <span className="cp-provider-option-name">{action.label}</span>
                  <span className="cp-provider-option-sub">
                    {busy ? "Connection in progress" : "Use this provider for availability and writeback."}
                  </span>
                </span>
                <span className="cp-provider-option-arrow" aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
