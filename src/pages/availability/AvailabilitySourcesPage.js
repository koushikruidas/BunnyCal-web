import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIntegrationState } from "@/state/IntegrationContext";
import "./availability-sources.css";
function toLabel(provider) {
    return provider
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}
function statusTone(status) {
    const s = status.toUpperCase();
    if (s.includes("FAIL") || s.includes("ERROR"))
        return "warn";
    if (s.includes("SYNC") || s.includes("STALE"))
        return "idle";
    if (s.includes("CONNECTED") || s.includes("ACTIVE") || s.includes("AVAILABLE"))
        return "ok";
    return "neutral";
}
function statusLabel(status) {
    const tone = statusTone(status);
    if (tone === "ok")
        return "Current";
    if (tone === "idle")
        return "May lag";
    if (tone === "warn")
        return "Needs attention";
    return "Unknown";
}
export function AvailabilitySourcesPage() {
    const { calendarStatus, calendarCapabilities, getCalendarProviderStatus, getProviderCalendars, startConnect, disconnectProvider, pendingAction, refreshStatus, loading, } = useIntegrationState();
    const navigate = useNavigate();
    const location = useLocation();
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [connectMenuOpen, setConnectMenuOpen] = useState(false);
    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const rows = useMemo(() => {
        return Object.keys(calendarStatus).map((provider) => {
            const uiStatus = getCalendarProviderStatus(provider);
            const entry = calendarStatus[provider];
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
    const activePanel = location.pathname === "/dashboard/availability/sources"
        ? "sources"
        : new URLSearchParams(location.search).get("panel") ?? "hours";
    const openTab = (tab) => {
        if (tab === "sources") {
            navigate("/dashboard/availability/sources");
            return;
        }
        navigate(`/dashboard/availability?panel=${tab}`);
    };
    const connectProvider = (provider) => {
        void startConnect("calendar", provider, returnPath);
        setConnectMenuOpen(false);
    };
    return (_jsxs("div", { className: "src-page", "data-trust": "explicit", children: [_jsxs("section", { className: "src-intro", children: [_jsxs("div", { className: "src-intro-left", children: [_jsx("div", { className: "src-breadcrumb", children: "Availability \u00B7 Sources" }), _jsxs("h2", { className: "src-title", children: ["The calendars behind ", _jsx("em", { children: "your bookable hours." })] }), _jsx("p", { className: "src-subtitle", children: "A calm view of what shapes when you can be booked - by role, not by provider. Influence first, mechanics second." })] }), _jsxs("div", { className: "src-intro-actions", children: [_jsx("button", { className: "dash-btn-secondary", onClick: () => refreshStatus(true), disabled: loading, children: loading ? "Refreshing..." : "Refresh" }), _jsxs("div", { className: "src-connect-wrap", children: [_jsx("button", { className: "dash-btn-primary", onClick: () => setConnectMenuOpen((prev) => !prev), disabled: !connectCandidate, "aria-expanded": connectMenuOpen, "aria-haspopup": "menu", children: "+ Connect calendar" }), connectMenuOpen && (_jsx("div", { className: "src-connect-menu", role: "menu", children: selectableProviders.map((provider) => (_jsxs("button", { type: "button", role: "menuitem", className: "src-connect-item", onClick: () => connectProvider(provider), children: ["Connect ", toLabel(provider)] }, provider))) }))] })] })] }), _jsxs("div", { className: "sub-tabs", children: [_jsx("button", { className: `sub-tab ${activePanel === "hours" ? "active" : ""}`, onClick: () => openTab("hours"), children: "Working hours" }), _jsxs("button", { className: `sub-tab ${activePanel === "sources" ? "active" : ""}`, onClick: () => openTab("sources"), children: ["Sources ", _jsx("span", { className: "count", children: rows.length })] }), _jsx("button", { className: `sub-tab ${activePanel === "overrides" ? "active" : ""}`, onClick: () => openTab("overrides"), children: "Overrides" }), _jsx("button", { className: `sub-tab ${activePanel === "rules" ? "active" : ""}`, onClick: () => openTab("rules"), children: "Booking rules" })] }), _jsxs("section", { className: "src-summary", children: [_jsxs("div", { className: "src-confidence", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: "Right now" }), _jsxs("p", { className: "narrative", children: ["Your bookable hours reflect ", _jsxs("strong", { children: [blockingRows.length, " calendar", blockingRows.length === 1 ? "" : "s"] }), " and ", _jsx("em", { children: "one" }), " working-hours rule."] }), _jsx("p", { className: "muted", style: { marginTop: 14, maxWidth: "54ch" }, children: attention.length > 0
                                            ? `${attention.length} source${attention.length > 1 ? "s" : ""} may need attention. Bookings stay safe; slot suggestions remain confident.`
                                            : "All active sources are current. Bookings stay safe; slot suggestions remain confident." })] }), _jsxs("div", { className: "src-conf-meta", children: [_jsxs("span", { className: "pill", children: [_jsx("span", { className: "dot" }), "Coordination steady"] }), lagging.length > 0 && _jsxs("span", { className: "pill warn", children: [_jsx("span", { className: "dot" }), lagging.length, " source lagging"] }), _jsxs("span", { className: "pill", children: [_jsx("span", { className: "dot" }), "Last reconciled \u00B7 recently"] })] })] }), _jsxs("aside", { className: "src-roster", children: [_jsxs("div", { className: "src-roster-h", children: [_jsx("h3", { children: "At a glance" }), _jsxs("span", { className: "count", children: [blockingRows.length + 1, " active"] })] }), blockingRows.slice(0, 5).map((row) => (_jsxs("div", { className: "src-roster-row", children: [_jsx("span", { className: `dot ${statusTone(row.rawStatus) === "warn" ? "warn" : ""}` }), _jsx("span", { className: "label", children: row.label }), _jsx("span", { className: "role block", children: row.uiStatus === "connected" ? "Blocks" : "Advisory" })] }, row.provider))), _jsxs("div", { className: "src-roster-row", children: [_jsx("span", { className: "dot" }), _jsx("span", { className: "label", children: "Working-hours rule" }), _jsx("span", { className: "role rule", children: "Defines hours" })] })] })] }), _jsxs("section", { className: "role-group", children: [_jsxs("header", { className: "role-group-head", children: [_jsxs("div", { children: [_jsxs("span", { className: "role-eyebrow", children: [_jsx("span", { className: "swatch block" }), "Influences availability"] }), _jsxs("h2", { children: ["Busy time here ", _jsx("em", { children: "removes bookable slots." })] })] }), _jsx("a", { className: "action", href: "#blocking", children: "Edit which calendars block \u2192" })] }), blockingRows.map((row) => {
                        const busy = pendingAction?.provider === row.provider && pendingAction.kind === "calendar";
                        const tone = statusTone(row.rawStatus);
                        return (_jsxs("article", { className: `src-row ${tone === "warn" ? "attention" : ""}`, children: [_jsx("div", { className: "logo google" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "name", children: row.label }), _jsx("span", { className: "addr", children: row.primaryName ?? "Calendar source" })] }), _jsx("div", { className: "impact", children: row.calendars.length > 0
                                        ? `${row.selectedCount} calendars currently influence availability.`
                                        : "Influence rules are backend-managed and reflected here as source role." }), _jsxs("div", { className: `trust ${tone === "warn" ? "warn" : tone === "idle" ? "idle" : ""}`, children: [_jsxs("span", { className: "state", children: [_jsx("span", { className: "dot" }), statusLabel(row.rawStatus)] }), _jsx("span", { className: "when", children: row.rawStatus })] }), _jsxs("div", { className: "controls", children: [_jsx("button", { className: "ctrl-btn", children: "Adjust" }), (row.uiStatus === "connected" || row.uiStatus === "syncing") ? (_jsx("button", { className: "ctrl-btn", onClick: () => disconnectProvider("calendar", row.provider), disabled: busy, children: busy ? "..." : "Disconnect" })) : (_jsx("button", { className: "ctrl-btn", onClick: () => startConnect("calendar", row.provider, returnPath), disabled: busy, children: busy ? "Connecting..." : "Connect" }))] })] }, row.provider));
                    })] }), _jsxs("section", { className: "role-group", children: [_jsxs("header", { className: "role-group-head", children: [_jsxs("div", { children: [_jsxs("span", { className: "role-eyebrow", children: [_jsx("span", { className: "swatch view" }), "Visible only \u00B7 doesn't block"] }), _jsxs("h2", { children: ["Context you can ", _jsx("em", { children: "see, but guests can't." })] })] }), _jsx("a", { className: "action", href: "#visibility", children: "Manage visibility \u2192" })] }), visibleOnlyRows.length === 0 ? (_jsx("button", { className: "role-add", type: "button", children: "Add a calendar for context only" })) : (visibleOnlyRows.map((row) => (_jsxs("article", { className: "src-row attention", children: [_jsx("div", { className: "logo outlook" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "name", children: row.label }), _jsx("span", { className: "addr", children: row.primaryName ?? "Context source" })] }), _jsx("div", { className: "impact", children: "This source is visible for awareness and does not directly define offered booking times." }), _jsxs("div", { className: "trust warn", children: [_jsxs("span", { className: "state", children: [_jsx("span", { className: "dot" }), statusLabel(row.rawStatus)] }), _jsx("span", { className: "when", children: row.rawStatus })] }), _jsx("div", { className: "controls", children: _jsx("button", { className: "ctrl-btn", children: "Adjust" }) })] }, `visible:${row.provider}`))))] }), _jsxs("section", { className: "role-group", children: [_jsxs("header", { className: "role-group-head", children: [_jsxs("div", { children: [_jsxs("span", { className: "role-eyebrow", children: [_jsx("span", { className: "swatch dest" }), "Where new bookings land"] }), _jsxs("h2", { children: ["One calendar receives every ", _jsx("em", { children: "confirmed booking." })] })] }), _jsx("a", { className: "action", href: "#destination", children: "Change destination \u2192" })] }), destination && (_jsxs("article", { className: "src-row", children: [_jsx("div", { className: "logo peach" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "name", children: destination.label }), _jsx("span", { className: "addr", children: destination.primaryName ?? "Primary destination" })] }), _jsx("div", { className: "impact", children: "Confirmed bookings are written here. You can change destination without changing availability influence." }), _jsxs("div", { className: "trust", children: [_jsxs("span", { className: "state", children: [_jsx("span", { className: "dot" }), "Receiving"] }), _jsx("span", { className: "when", children: "Last write \u00B7 recently" })] }), _jsx("div", { className: "controls", children: _jsx("button", { className: "ctrl-btn", children: "Adjust" }) })] })), _jsxs("article", { className: "src-row", children: [_jsx("div", { className: "logo rule" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "name", children: "Working hours \u00B7 weekday default" }), _jsx("span", { className: "addr", children: "Mon-Fri \u00B7 9:00 - 5:30 pm" })] }), _jsx("div", { className: "impact", children: "Defines the outer shape of when you can be booked before calendar overlays apply." }), _jsxs("div", { className: "trust", children: [_jsxs("span", { className: "state", children: [_jsx("span", { className: "dot" }), "Active"] }), _jsx("span", { className: "when", children: "Edited recently" })] }), _jsx("div", { className: "controls", children: _jsx("button", { className: "ctrl-btn", children: "Adjust" }) })] })] }), _jsxs("section", { className: `diag ${showDiagnostics ? "open" : ""}`, children: [_jsxs("div", { className: "diag-head", onClick: () => setShowDiagnostics((prev) => !prev), role: "button", tabIndex: 0, onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ")
                                setShowDiagnostics((prev) => !prev);
                        }, "aria-expanded": showDiagnostics, children: [_jsxs("div", { children: [_jsx("h3", { children: "Show diagnostics" }), _jsx("div", { className: "sub", children: "Sync mechanics, response times, and a short reconciliation history - for when you're curious." })] }), _jsx("span", { className: "chev", children: "\u2304" })] }), _jsx("div", { className: "diag-body", children: _jsx("div", { children: _jsx("div", { className: "diag-log", children: rows.map((row) => (_jsxs("div", { className: "diag-log-row", children: [_jsx("span", { className: "when", children: row.label }), _jsxs("span", { className: "what", children: ["Backend reported ", _jsx("strong", { children: row.rawStatus }), "."] }), _jsx("span", { className: "tag", children: statusLabel(row.rawStatus) })] }, `diag:${row.provider}`))) }) }) })] }), _jsxs("section", { className: "gov", children: [_jsxs("article", { className: "gov-card", children: [_jsx("span", { className: "eyebrow", children: "Scope \u00B7 Workspace" }), _jsxs("h3", { children: ["Org policies ", _jsx("em", { children: "are aligned." })] }), _jsx("p", { children: "Availability source policy remains coordinated and quiet. Nothing here requires immediate action." }), _jsxs("div", { className: "gov-scopes", children: [_jsxs("div", { className: "gov-scope", children: [_jsxs("div", { className: "lbl", children: ["Source confidence floor ", _jsx("span", { className: "meta", children: "Slots pause when stale exceeds policy" })] }), _jsx("span", { className: "state aligned", children: "Aligned" })] }), _jsxs("div", { className: "gov-scope", children: [_jsxs("div", { className: "lbl", children: ["Visibility-only sources ", _jsx("span", { className: "meta", children: "Allowed; advisory for managers" })] }), _jsx("span", { className: "state advise", children: "Advisory" })] })] })] }), _jsxs("article", { className: "gov-card", children: [_jsx("span", { className: "eyebrow", children: "Progressive depth" }), _jsxs("h3", { children: ["The same surface, ", _jsx("em", { children: "deeper at scale." })] }), _jsx("p", { children: "As your plan grows, this role-first view gains optional governance depth without changing day-to-day reading." }), _jsxs("div", { className: "tier-strip", children: [_jsx("span", { className: "tier", children: "Free" }), _jsx("span", { className: "sep", children: "\u00B7" }), _jsxs("span", { className: "tier on", children: [_jsx("span", { className: "d" }), "Pro"] }), _jsx("span", { className: "sep", children: "\u00B7" }), _jsx("span", { className: "tier", children: "Enterprise" })] })] })] })] }));
}
