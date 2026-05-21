export function providerLabel(provider) {
    return provider
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}
export function providerStatusTone(status) {
    const s = status.toUpperCase().trim();
    if (s === "DISCONNECTED" || s === "NOT_CONNECTED" || s === "UNAVAILABLE")
        return "danger";
    if (s === "CONNECTED" || s === "ACTIVE" || s === "AVAILABLE")
        return "ok";
    if (s === "SYNCING" || s === "STALE")
        return "hold";
    if (s.includes("ERROR") || s.includes("FAILED"))
        return "danger";
    if (s.includes("SYNC") || s.includes("STALE"))
        return "hold";
    if (s.includes("CONNECTED") || s.includes("ACTIVE") || s.includes("AVAILABLE"))
        return "ok";
    return "hold";
}
export function providerDotClass(status) {
    const tone = providerStatusTone(status);
    if (tone === "ok")
        return "ok";
    if (tone === "hold")
        return "idle";
    return "bad";
}
