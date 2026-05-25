import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
import { providerDotClass, providerLabel } from "@/components/integrations/providerUi";
import { toManagedProviderLabel } from "@/lib/providerIds";
function capabilitySummary(cap, calendarsCount) {
    if (!cap)
        return "";
    const parts = [];
    if (typeof calendarsCount === "number" && calendarsCount > 0)
        parts.push(`${calendarsCount} calendar${calendarsCount !== 1 ? "s" : ""}`);
    if (cap.supportsWebhooks || cap.supportsIncrementalSync)
        parts.push("Live sync active");
    return parts.join(" · ");
}
function ProviderTile({ kind, provider, status, entry, pendingAction, onRequestDisconnect, onConnect, capability, }) {
    const busy = pendingAction?.provider === provider && pendingAction.kind === kind;
    const connected = status === "connected" || status === "syncing";
    const calendars = Array.isArray(entry?.calendars) ? entry?.calendars : [];
    const isCapability = kind === "conferencing" && entry?.type === "capability";
    const supportsDisconnect = entry?.disconnectSupported !== false && !isCapability;
    const managedByLabel = isCapability ? toManagedProviderLabel(String(entry?.managedBy ?? "")) : "";
    return (_jsxs("div", { className: "int-tile-mini", children: [_jsx("div", { className: "logo", children: providerLabel(provider).slice(0, 1) }), _jsxs("div", { children: [_jsx("div", { className: "name", children: providerLabel(provider) }), _jsx("div", { className: "last", children: isCapability && !connected
                            ? `Connect ${managedByLabel || "your calendar"} to enable ${providerLabel(provider)}`
                            : isCapability
                                ? `Included with your ${managedByLabel || "calendar"} connection`
                                : kind === "calendar"
                                    ? capabilitySummary(capability, calendars.length)
                                    : "Generates a unique link per booking" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }, children: [_jsx("div", { className: clsx("dot", providerDotClass(status)), "aria-label": connected ? "Connected" : "Disconnected" }), connected && supportsDisconnect ? (_jsx("button", { className: "dash-btn-secondary", style: { fontSize: 11, padding: "3px 10px" }, onClick: () => onRequestDisconnect(kind, provider), disabled: busy, children: busy ? "..." : "Disconnect" })) : connected ? (_jsx("span", { style: { fontSize: 11, color: "var(--plum-500)" }, children: isCapability ? "Managed" : "Connected" })) : (_jsx("button", { className: "dash-btn-primary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 9 }, onClick: () => onConnect(provider), disabled: busy, children: busy ? "Connecting..." : "Connect" }))] })] }));
}
export function DashboardIntegrationsSection({ banner, integrationsError, clearBanner, integrationsLoading, refreshStatus, pendingAction, calendarStatus, calendarConnections, conferencingStatus, calendarCapabilities, conferencingCapabilities, getCalendarProviderStatus, getConferencingProviderStatus, onRequestDisconnect, onConnectCalendar, onConnectConferencing, }) {
    const CANONICAL_CALENDAR_PROVIDERS = ["google", "microsoft"];
    const CANONICAL_CONFERENCING_PROVIDERS = ["google_meet", "microsoft_teams", "zoom"];
    const calendarProviders = Array.from(new Set([
        ...CANONICAL_CALENDAR_PROVIDERS,
        ...Object.keys(calendarStatus),
        ...calendarConnections.map((connection) => connection.provider),
        ...Object.keys(calendarCapabilities).map((k) => k.toLowerCase()),
    ])).filter((p) => p && p !== "none" && p !== "custom_url");
    const conferencingProviders = Array.from(new Set([
        ...CANONICAL_CONFERENCING_PROVIDERS,
        ...Object.keys(conferencingStatus),
        ...Object.keys(conferencingCapabilities).map((k) => k.toLowerCase()),
    ])).filter((p) => p && p !== "none" && p !== "custom_url");
    const connectedCount = calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length +
        conferencingProviders.filter((p) => getConferencingProviderStatus(p) === "connected").length;
    return (_jsxs("div", { className: "dash-section", children: [banner && (_jsxs("div", { className: "dash-alert success", children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, style: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }, children: "Dismiss" })] })), integrationsError && _jsx("div", { className: "dash-alert error", children: integrationsError }), _jsxs("div", { className: "int-band", children: [_jsxs("div", { className: "int-fabric", children: [_jsxs("h3", { className: "h3", children: ["Integrations ", _jsx("em", { children: "overview." })] }), _jsx("div", { className: "sub", style: { marginBottom: 10 }, children: "Sign-in accounts, connected calendars, and conferencing are separate concerns." }), _jsxs("div", { className: "stats", style: { gridTemplateColumns: "repeat(2, 1fr)" }, children: [_jsxs("div", { className: "stat", children: [_jsx("div", { className: "lbl", children: "Calendars" }), _jsx("div", { className: "val", children: calendarProviders.length }), _jsxs("div", { className: "hint", children: [calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length, " connected"] })] }), _jsxs("div", { className: "stat", children: [_jsx("div", { className: "lbl", children: "Video links" }), _jsx("div", { className: "val", children: conferencingProviders.length }), _jsxs("div", { className: "hint", children: [conferencingProviders.filter((p) => getConferencingProviderStatus(p) === "connected").length, " connected"] })] })] }), _jsxs("div", { className: "panel", style: { marginTop: 10, padding: 12 }, children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--plum-400)" }, children: "Sign-in accounts" }), _jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Used to log in. Linking another account does not add it to scheduling." })] }), _jsx("div", { className: "logos", children: connectedCount > 0 ? (_jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }, children: [connectedCount, " services connected"] })) : (_jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--plum-400)", letterSpacing: ".08em" }, children: "No integrations connected yet" })) }), _jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => refreshStatus(true), disabled: integrationsLoading, children: integrationsLoading ? "Refreshing..." : "Refresh status" }) })] }), _jsxs("div", { className: "int-tiles-col", children: [_jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginBottom: 2 }, children: "Connected calendars" }), _jsx("div", { className: "sub", style: { marginBottom: 8 }, children: "Connect calendars so BunnyCal can check availability and mirror bookings." }), calendarProviders.map((provider) => (_jsx(ProviderTile, { kind: "calendar", provider: provider, status: getCalendarProviderStatus(provider), entry: calendarStatus[provider], pendingAction: pendingAction, onRequestDisconnect: onRequestDisconnect, onConnect: onConnectCalendar, capability: calendarCapabilities[provider.toUpperCase()] }, `calendar:${provider}`))), _jsx("div", { style: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--plum-400)", marginTop: 12, marginBottom: 2 }, children: "Conferencing" }), _jsx("div", { className: "sub", style: { marginBottom: 8 }, children: "Used for join links only." }), conferencingProviders.map((provider) => (_jsx(ProviderTile, { kind: "conferencing", provider: provider, status: getConferencingProviderStatus(provider), entry: conferencingStatus[provider], pendingAction: pendingAction, onRequestDisconnect: onRequestDisconnect, onConnect: onConnectConferencing, capability: conferencingCapabilities[provider.toUpperCase()] }, `conferencing:${provider}`)))] })] })] }));
}
