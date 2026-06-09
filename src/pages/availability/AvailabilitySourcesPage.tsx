import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useIntegrationState } from "@/state/IntegrationContext";
import { api } from "@/services";
import type { GroupReservationBlockerResponse, ProviderStatusEntry } from "@/services/types";
import "./availability-sources.css";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

function groupBlockersByEvent(blockers: GroupReservationBlockerResponse[]) {
  const map = new Map<string, { eventTypeName: string; eventTypeId: string; windows: GroupReservationBlockerResponse[] }>();
  for (const b of blockers) {
    const existing = map.get(b.eventTypeId);
    if (existing) {
      existing.windows.push(b);
    } else {
      map.set(b.eventTypeId, { eventTypeName: b.eventTypeName, eventTypeId: b.eventTypeId, windows: [b] });
    }
  }
  return Array.from(map.values());
}

function toLabel(provider: string) {
  return provider
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s.includes("FAIL") || s.includes("ERROR")) return "warn";
  if (s.includes("SYNC") || s.includes("STALE")) return "idle";
  if (s.includes("CONNECTED") || s.includes("ACTIVE") || s.includes("AVAILABLE")) return "ok";
  return "neutral";
}

function statusLabel(status: string) {
  const tone = statusTone(status);
  if (tone === "ok") return "Current";
  if (tone === "idle") return "May lag";
  if (tone === "warn") return "Needs attention";
  return "Unknown";
}

export function AvailabilitySourcesPage() {
  const {
    calendarStatus,
    calendarCapabilities,
    getCalendarProviderStatus,
    getProviderCalendars,
    startConnect,
    disconnectProvider,
    pendingAction,
    refreshStatus,
    loading,
  } = useIntegrationState();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [connectMenuOpen, setConnectMenuOpen] = useState(false);
  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const rows = useMemo(() => {
    return Object.keys(calendarStatus).map((provider) => {
      const uiStatus = getCalendarProviderStatus(provider);
      const entry = calendarStatus[provider] as ProviderStatusEntry | undefined;
      const rawStatus = typeof entry?.status === "string" ? entry.status : "UNKNOWN";
      const calendars = getProviderCalendars(provider);
      const selectedCount = calendars.filter((cal) => cal.selected ?? cal.primary ?? true).length;
      const primary = calendars.find((cal) => cal.primary) ?? calendars[0];
      return {
        provider,
        label: toLabel(provider),
        uiStatus,
        rawStatus,
        calendars,
        selectedCount,
        primaryName: primary?.name ?? primary?.id ?? null,
      };
    });
  }, [calendarStatus, getCalendarProviderStatus, getProviderCalendars]);

  const connected = rows.filter((row) => row.uiStatus === "connected");
  const lagging = rows.filter((row) => row.uiStatus === "syncing");
  const attention = rows.filter((row) => row.uiStatus === "failed" || statusTone(row.rawStatus) === "warn");
  const blockingRows = rows.filter((row) => row.uiStatus !== "disconnected");
  const visibleOnlyRows = rows.filter((row) => row.uiStatus === "failed" || row.uiStatus === "syncing");
  const destination = connected[0] ?? rows[0] ?? null;
  const connectCandidate = rows.find((row) => row.uiStatus === "disconnected")?.provider ?? rows[0]?.provider ?? null;
  const selectableProviders = useMemo(() => {
    const fromStatus = Object.keys(calendarStatus);
    const fromCapabilities = Object.keys(calendarCapabilities).map((key) => key.toLowerCase());
    const merged = Array.from(new Set([...fromStatus, ...fromCapabilities]))
      .filter(Boolean)
      .filter((provider) => provider !== "none")
      .filter((provider) => provider !== "custom_url");
    return merged.length > 0 ? merged : (connectCandidate ? [connectCandidate] : []);
  }, [calendarCapabilities, calendarStatus, connectCandidate]);

  const reservationBlockersQuery = useQuery({
    queryKey: ["reservation-blockers"] as const,
    queryFn: () => api.getReservationBlockers(),
    staleTime: 60 * 1000,
    retry: false,
  });
  const blockers = reservationBlockersQuery.data ?? [];
  const blockerGroups = useMemo(() => groupBlockersByEvent(blockers), [blockers]);

  const activePanel = location.pathname === "/dashboard/availability/sources"
    ? "sources"
    : new URLSearchParams(location.search).get("panel") ?? "hours";

  const openTab = (tab: "hours" | "sources" | "overrides" | "rules") => {
    if (tab === "sources") {
      navigate("/dashboard/availability/sources");
      return;
    }
    navigate(`/dashboard/availability?panel=${tab}`);
  };

  const connectProvider = (provider: string) => {
    void startConnect("calendar", provider, returnPath);
    setConnectMenuOpen(false);
  };

  return (
    <div className="src-page" data-trust="explicit">
      <section className="src-intro">
        <div className="src-intro-left">
          <div className="src-breadcrumb">Availability · Sources</div>
          <h2 className="src-title">The calendars behind <em>your bookable hours.</em></h2>
          <p className="src-subtitle">A calm view of what shapes when you can be booked - by role, not by provider. Influence first, mechanics second.</p>
        </div>
        <div className="src-intro-actions">
          <button className="dash-btn-secondary" onClick={() => refreshStatus("calendar")} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <div className="src-connect-wrap">
            <button
              className="dash-btn-primary"
              onClick={() => setConnectMenuOpen((prev) => !prev)}
              disabled={!connectCandidate}
              aria-expanded={connectMenuOpen}
              aria-haspopup="menu"
            >
              + Connect calendar
            </button>
            {connectMenuOpen && (
              <div className="src-connect-menu" role="menu">
                {selectableProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    role="menuitem"
                    className="src-connect-item"
                    onClick={() => connectProvider(provider)}
                  >
                    Connect {toLabel(provider)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="sub-tabs">
        <button className={`sub-tab ${activePanel === "hours" ? "active" : ""}`} onClick={() => openTab("hours")}>Working hours</button>
        <button className={`sub-tab ${activePanel === "sources" ? "active" : ""}`} onClick={() => openTab("sources")}>Sources <span className="count">{rows.length}</span></button>
        <button className={`sub-tab ${activePanel === "overrides" ? "active" : ""}`} onClick={() => openTab("overrides")}>Overrides</button>
        <button className={`sub-tab ${activePanel === "rules" ? "active" : ""}`} onClick={() => openTab("rules")}>Booking rules</button>
      </div>

      <section className="src-summary">
        <div className="src-confidence">
          <div>
            <span className="eyebrow">Right now</span>
            <p className="narrative">
              Your bookable hours reflect <strong>{blockingRows.length} calendar{blockingRows.length === 1 ? "" : "s"}</strong>, <em>one</em> working-hours rule{blockerGroups.length > 0 ? <>, and <strong>{blockerGroups.length} group event reservation{blockerGroups.length !== 1 ? "s" : ""}</strong> that block other event types</> : ""}.
            </p>
            <p className="muted" style={{ marginTop: 14, maxWidth: "54ch" }}>
              {attention.length > 0
                ? `${attention.length} source${attention.length > 1 ? "s" : ""} may need attention. Bookings stay safe; slot suggestions remain confident.`
                : blockerGroups.length > 0
                  ? `${blockerGroups.length} group event${blockerGroups.length !== 1 ? "s" : ""} reserve time that is unavailable to other event types.`
                  : "All active sources are current. Bookings stay safe; slot suggestions remain confident."}
            </p>
          </div>
          <div className="src-conf-meta">
            <span className="pill"><span className="dot" />Coordination steady</span>
            {lagging.length > 0 && <span className="pill warn"><span className="dot" />{lagging.length} source lagging</span>}
            <span className="pill"><span className="dot" />Last reconciled · recently</span>
          </div>
        </div>

        <aside className="src-roster">
          <div className="src-roster-h">
            <h3>At a glance</h3>
            <span className="count">{blockingRows.length + 1 + blockerGroups.length} active</span>
          </div>
          {blockingRows.slice(0, 5).map((row) => (
            <div key={row.provider} className="src-roster-row">
              <span className={`dot ${statusTone(row.rawStatus) === "warn" ? "warn" : ""}`} />
              <span className="label">{row.label}</span>
              <span className="role block">{row.uiStatus === "connected" ? "Blocks" : "Advisory"}</span>
            </div>
          ))}
          <div className="src-roster-row">
            <span className="dot" />
            <span className="label">Working-hours rule</span>
            <span className="role rule">Defines hours</span>
          </div>
          {blockerGroups.map((group) => (
            <div key={`blockers:${group.eventTypeId}`} className="src-roster-row">
              <span className="dot" />
              <span className="label">{group.eventTypeName}</span>
              <span className="role block">Reserves</span>
            </div>
          ))}
        </aside>
      </section>

      <section className="role-group">
        <header className="role-group-head">
          <div>
            <span className="role-eyebrow"><span className="swatch block" />Influences availability</span>
            <h2>Busy time here <em>removes bookable slots.</em></h2>
          </div>
          <a className="action" href="#blocking">Edit which calendars block →</a>
        </header>
        {blockingRows.map((row) => {
          const busy = pendingAction?.provider === row.provider && pendingAction.kind === "calendar";
          const tone = statusTone(row.rawStatus);
          return (
            <article key={row.provider} className={`src-row ${tone === "warn" ? "attention" : ""}`}>
              <div className="logo google" />
              <div className="head">
                <span className="name">{row.label}</span>
                <span className="addr">{row.primaryName ?? "Calendar source"}</span>
              </div>
              <div className="impact">
                {row.calendars.length > 0
                  ? `${row.selectedCount} calendars currently influence availability.`
                  : "Influence rules are backend-managed and reflected here as source role."}
              </div>
              <div className={`trust ${tone === "warn" ? "warn" : tone === "idle" ? "idle" : ""}`}>
                <span className="state"><span className="dot" />{statusLabel(row.rawStatus)}</span>
                <span className="when">{row.rawStatus}</span>
              </div>
              <div className="controls">
                <button className="ctrl-btn">Adjust</button>
                {(row.uiStatus === "connected" || row.uiStatus === "syncing") ? (
                  <button className="ctrl-btn" onClick={() => disconnectProvider("calendar", row.provider)} disabled={busy}>
                    {busy ? "..." : "Disconnect"}
                  </button>
                ) : (
                  <button className="ctrl-btn" onClick={() => startConnect("calendar", row.provider, returnPath)} disabled={busy}>
                    {busy ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {blockerGroups.length > 0 && (
        <section className="role-group">
          <header className="role-group-head">
            <div>
              <span className="role-eyebrow"><span className="swatch block" />Group event reservations</span>
              <h2>These windows <em>block One-to-One, Round Robin &amp; Collective slots.</em></h2>
            </div>
            <a className="action" href="/dashboard/event-types">Manage group events →</a>
          </header>
          {blockerGroups.map((group) => (
            <article key={group.eventTypeId} className="src-row">
              <div className="logo rule" />
              <div className="head">
                <span className="name">{group.eventTypeName}</span>
                <span className="addr">Group event · {group.windows.length} reserved window{group.windows.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="impact">
                {group.windows.map((w) => (
                  <span key={w.windowId} style={{ display: "block" }}>
                    {DAY_LABELS[w.dayOfWeek] ?? w.dayOfWeek} {w.startTime}–{w.endTime}
                  </span>
                ))}
              </div>
              <div className="trust">
                <span className="state"><span className="dot" />Reserving</span>
                <span className="when">Blocks other event types</span>
              </div>
              <div className="controls">
                <a className="ctrl-btn" href={`/dashboard/event-types`}>Edit event</a>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="role-group">
        <header className="role-group-head">
          <div>
            <span className="role-eyebrow"><span className="swatch view" />Visible only · doesn't block</span>
            <h2>Context you can <em>see, but guests can't.</em></h2>
          </div>
          <a className="action" href="#visibility">Manage visibility →</a>
        </header>
        {visibleOnlyRows.length === 0 ? (
          <button className="role-add" type="button">Add a calendar for context only</button>
        ) : (
          visibleOnlyRows.map((row) => (
            <article key={`visible:${row.provider}`} className="src-row attention">
              <div className="logo outlook" />
              <div className="head">
                <span className="name">{row.label}</span>
                <span className="addr">{row.primaryName ?? "Context source"}</span>
              </div>
              <div className="impact">This source is visible for awareness and does not directly define offered booking times.</div>
              <div className="trust warn">
                <span className="state"><span className="dot" />{statusLabel(row.rawStatus)}</span>
                <span className="when">{row.rawStatus}</span>
              </div>
              <div className="controls">
                <button className="ctrl-btn">Adjust</button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="role-group">
        <header className="role-group-head">
          <div>
            <span className="role-eyebrow"><span className="swatch dest" />Where new bookings land</span>
            <h2>One calendar receives every <em>confirmed booking.</em></h2>
          </div>
          <a className="action" href="#destination">Change destination →</a>
        </header>
        {destination && (
          <article className="src-row">
            <div className="logo peach" />
            <div className="head">
              <span className="name">{destination.label}</span>
              <span className="addr">{destination.primaryName ?? "Primary destination"}</span>
            </div>
            <div className="impact">Confirmed bookings are written here. You can change destination without changing availability influence.</div>
            <div className="trust">
              <span className="state"><span className="dot" />Receiving</span>
              <span className="when">Last write · recently</span>
            </div>
            <div className="controls"><button className="ctrl-btn">Adjust</button></div>
          </article>
        )}
        <article className="src-row">
          <div className="logo rule" />
          <div className="head">
            <span className="name">Working hours · weekday default</span>
            <span className="addr">Mon-Fri · 9:00 - 5:30 pm</span>
          </div>
          <div className="impact">Defines the outer shape of when you can be booked before calendar overlays apply.</div>
          <div className="trust">
            <span className="state"><span className="dot" />Active</span>
            <span className="when">Edited recently</span>
          </div>
          <div className="controls"><button className="ctrl-btn">Adjust</button></div>
        </article>
      </section>

      <section className={`diag ${showDiagnostics ? "open" : ""}`}>
        <div
          className="diag-head"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setShowDiagnostics((prev) => !prev);
          }}
          aria-expanded={showDiagnostics}
        >
          <div>
            <h3>Show diagnostics</h3>
            <div className="sub">Sync mechanics, response times, and a short reconciliation history - for when you're curious.</div>
          </div>
          <span className="chev">⌄</span>
        </div>
        <div className="diag-body">
          <div>
            <div className="diag-log">
              {rows.map((row) => (
                <div key={`diag:${row.provider}`} className="diag-log-row">
                  <span className="when">{row.label}</span>
                  <span className="what">Backend reported <strong>{row.rawStatus}</strong>.</span>
                  <span className="tag">{statusLabel(row.rawStatus)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="gov">
        <article className="gov-card">
          <span className="eyebrow">Scope · Workspace</span>
          <h3>Org policies <em>are aligned.</em></h3>
          <p>Availability source policy remains coordinated and quiet. Nothing here requires immediate action.</p>
          <div className="gov-scopes">
            <div className="gov-scope">
              <div className="lbl">Source confidence floor <span className="meta">Slots pause when stale exceeds policy</span></div>
              <span className="state aligned">Aligned</span>
            </div>
            <div className="gov-scope">
              <div className="lbl">Visibility-only sources <span className="meta">Allowed; advisory for managers</span></div>
              <span className="state advise">Advisory</span>
            </div>
          </div>
        </article>
        <article className="gov-card">
          <span className="eyebrow">Progressive depth</span>
          <h3>The same surface, <em>deeper at scale.</em></h3>
          <p>As your plan grows, this role-first view gains optional governance depth without changing day-to-day reading.</p>
          <div className="tier-strip">
            <span className="tier">Free</span><span className="sep">·</span>
            <span className="tier on"><span className="d" />Pro</span><span className="sep">·</span>
            <span className="tier">Enterprise</span>
          </div>
        </article>
      </section>
    </div>
  );
}
