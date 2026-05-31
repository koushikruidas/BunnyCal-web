import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
import { providerLabel } from "@/components/integrations/providerUi";
import { toManagedProviderLabel } from "@/lib/providerIds";
import { hasConsumerMicrosoftConnection, isTeamsDisabledByRuntimeCapability, unsupportedCapabilityMessage } from "@/lib/conferencingCapabilities";
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
function ProviderRow({ kind, provider, status, entry, pendingAction, onRequestDisconnect, onConnect, capability, }) {
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
    return (_jsxs("div", { className: "conn-row", children: [_jsx("div", { className: clsx("conn-logo", kind === "calendar" ? "sky" : "peach"), children: providerLabel(provider).slice(0, 1) }), _jsxs("div", { className: "conn-meta", children: [_jsxs("div", { className: "nm", children: [providerLabel(provider), _jsxs("span", { className: clsx("conn-status", connected ? "ready" : "soon"), children: [_jsx("span", { className: "d" }), statusText] })] }), _jsx("div", { className: "ds", children: description })] }), connected && supportsDisconnect ? (_jsx("button", { className: "conn-btn is-connected", onClick: () => onRequestDisconnect(kind, provider), disabled: busy, children: busy ? "Disconnecting..." : "Disconnect" })) : connected ? (_jsx("button", { className: "conn-btn is-connected", disabled: true, children: isCapability ? "Managed" : "Connected" })) : (_jsx("button", { className: clsx("conn-btn", disabled && "is-disabled"), onClick: () => onConnect(provider), disabled: busy || disabled, children: busy ? "Connecting..." : disabled ? "Unavailable" : "Connect" }))] }));
}
export function DashboardIntegrationsSection({ banner, integrationsError, clearBanner, integrationsLoading, refreshStatus, pendingAction, calendarStatus, calendarConnections, conferencingRuntime, conferencingStatus, calendarCapabilities, conferencingCapabilities, getCalendarProviderStatus, getConferencingProviderStatus, onRequestDisconnect, onConnectCalendar, onConnectConferencing, }) {
    const CANONICAL_CALENDAR_PROVIDERS = ["google", "microsoft"];
    const CANONICAL_CONFERENCING_PROVIDERS = ["google_meet", "microsoft_teams", "zoom"];
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
    const connectedCount = calendarProviders.filter((p) => getCalendarProviderStatus(p) === "connected").length +
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
    return (_jsxs("div", { className: "dash-section", children: [banner && (_jsxs("div", { className: "dash-alert success", children: [_jsx("span", { children: banner }), _jsx("button", { onClick: clearBanner, style: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--plum-700)", textDecoration: "underline", fontFamily: "var(--sans)" }, children: "Dismiss" })] })), integrationsError && _jsx("div", { className: "dash-alert error", children: integrationsError }), _jsxs("div", { className: "ig-wrap", children: [_jsxs("section", { className: "ig-hero", children: [_jsx("div", { className: "ig-bunny-stage", "aria-hidden": "true", children: _jsxs("div", { className: clsx("bunny-bob", progressPoints === 3 && "happy"), children: [_jsx("div", { className: "bunny-shadow" }), _jsxs("div", { className: "bunny", children: [_jsx("div", { className: "ear left", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "ear right", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "body", children: _jsx("span", { className: "belly" }) }), _jsx("div", { className: "paw left" }), _jsx("div", { className: "paw right" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "cheek left" }), _jsx("span", { className: "cheek right" }), _jsx("span", { className: "eye left" }), _jsx("span", { className: "eye right" }), _jsx("span", { className: "nose" })] })] })] }) }), _jsxs("div", { className: "ig-hero-copy", children: [_jsx("span", { className: "eyebrow", children: "Let's get you set up" }), _jsxs("h2", { children: ["Connect your tools, ", _jsx("em", { children: "calmly." })] }), _jsx("p", { children: "Link a calendar so BunnyCal knows when you're free, and a video service so every booking gets a join link." }), _jsxs("div", { className: "ig-hero-meta", children: [_jsxs("div", { className: "ig-progress", children: [_jsx("span", { className: "lbl", children: progressLabel }), _jsx("span", { className: "track", children: _jsx("span", { className: "fill", style: { width: `${progressPercent}%` } }) })] }), _jsxs("span", { className: "ig-hero-hint", children: [_jsx("span", { className: "dot" }), connectedCount > 0 ? `${connectedCount} services connected` : "Your meetings, always calm"] })] }), _jsx("div", { style: { marginTop: 14 }, children: _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => refreshStatus(true), disabled: integrationsLoading, children: integrationsLoading ? "Refreshing..." : "Refresh status" }) })] })] }), _jsxs("div", { className: "ig-cols", children: [_jsxs("section", { className: "ig-group", "aria-label": "Connected calendars", children: [_jsxs("header", { className: "ig-group-head", children: [_jsxs("span", { className: "role-eyebrow", children: [_jsx("span", { className: "swatch s-cal" }), "Connected calendars"] }), _jsxs("h3", { children: ["Where your time ", _jsx("em", { children: "actually lives." })] }), _jsx("p", { children: "Connect calendars so BunnyCal can check availability and mirror bookings." })] }), calendarProviders.map((provider) => (_jsx(ProviderRow, { kind: "calendar", provider: provider, status: getCalendarProviderStatus(provider), entry: calendarStatus[provider], pendingAction: pendingAction, onRequestDisconnect: onRequestDisconnect, onConnect: onConnectCalendar, capability: calendarCapabilities[provider.toUpperCase()] }, `calendar:${provider}`)))] }), _jsxs("section", { className: "ig-group", "aria-label": "Conferencing", children: [_jsxs("header", { className: "ig-group-head", children: [_jsxs("span", { className: "role-eyebrow", children: [_jsx("span", { className: "swatch s-conf" }), "Conferencing"] }), _jsxs("h3", { children: ["Join links, ", _jsx("em", { children: "handled for you." })] }), _jsx("p", { children: "Used for join links only." })] }), teamsDisabledByRuntime && (_jsx("div", { className: "sub", style: { marginBottom: 8 }, children: hasConsumerMsa
                                            ? unsupportedCapabilityMessage()
                                            : "Microsoft Teams is currently unavailable for this connection." })), conferencingProviders.map((provider) => (_jsx(ProviderRow, { kind: "conferencing", provider: provider, status: getConferencingProviderStatus(provider), entry: conferencingStatus[provider], pendingAction: pendingAction, onRequestDisconnect: onRequestDisconnect, onConnect: onConnectConferencing, capability: conferencingCapabilities[provider.toUpperCase()] }, `conferencing:${provider}`)))] })] }), _jsxs("div", { className: "ig-note", children: [_jsx("span", { className: "ico", children: "i" }), _jsxs("span", { children: [_jsx("strong", { children: "Sign-in accounts" }), " are used to log in. Linking another account does not add it to scheduling."] })] })] })] }));
}
