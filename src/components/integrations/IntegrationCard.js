import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
function providerIcon(provider) {
    if (provider === "google")
        return "G";
    if (provider === "microsoft")
        return "M";
    return "Z";
}
function statusLabel(status, rawStatus) {
    if (rawStatus)
        return rawStatus;
    if (status === "connected")
        return "Connected";
    if (status === "syncing")
        return "Syncing";
    if (status === "failed")
        return "Failed";
    return "Disconnected";
}
function tone(status) {
    if (status === "connected")
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "syncing")
        return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "failed")
        return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
}
export function IntegrationCard({ provider, title, description, status, rawStatus, connectable = true, busy, onConnect, onDisconnect }) {
    const connectLabel = status === "failed" ? "Reconnect" : "Connect";
    return (_jsxs("article", { className: "rounded-2xl border border-border-subtle bg-surface p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-surface text-sm font-semibold text-accent-fg", "aria-hidden": "true", children: providerIcon(provider) }), _jsx("h3", { className: "font-semibold text-text-primary", children: title })] }), _jsx("p", { className: "mt-1 text-sm text-text-secondary break-words", children: description })] }), _jsx("span", { className: `min-w-0 max-w-[55%] break-all rounded-full border px-2.5 py-1 text-right text-xs font-medium ${tone(status)}`, children: statusLabel(status, rawStatus) })] }), _jsx("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: status === "connected" || status === "syncing" ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: onConnect, disabled: busy || !connectable, className: "focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary disabled:opacity-60", children: "Reconnect" }), _jsx("button", { onClick: onDisconnect, disabled: busy, className: "focus-ring min-h-touch rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-danger-fg disabled:opacity-60", children: busy ? "Disconnecting..." : "Disconnect" })] })) : (_jsx("button", { onClick: onConnect, disabled: busy || !connectable, className: "focus-ring min-h-touch rounded-lg bg-surface-inverse px-3 py-1.5 text-sm font-medium text-text-on-inverse disabled:opacity-60", children: busy ? "Connecting..." : connectLabel })) }), !connectable && _jsx("p", { className: "mt-2 text-xs text-text-tertiary", children: "This provider is not yet available." })] }));
}
