const REDIRECT_STORAGE_KEY = "post-login-redirect";
function safeWindow() {
    return typeof window !== "undefined" ? window : undefined;
}
export function getCurrentRelativeUrl() {
    const w = safeWindow();
    if (!w)
        return "/";
    return `${w.location.pathname}${w.location.search}${w.location.hash}`;
}
export function normalizeRedirectTarget(candidate) {
    if (!candidate)
        return null;
    const trimmed = candidate.trim();
    if (!trimmed)
        return null;
    try {
        const w = safeWindow();
        const base = w?.location.origin ?? "http://localhost";
        const url = new URL(trimmed, base);
        if (w && url.origin !== w.location.origin)
            return null;
        if (!url.pathname.startsWith("/"))
            return null;
        if (url.pathname.startsWith("//"))
            return null;
        const normalized = `${url.pathname}${url.search}${url.hash}`;
        if (url.pathname === "/login") {
            const nested = getRedirectFromSearch(url.search);
            return nested;
        }
        return normalized;
    }
    catch {
        return null;
    }
}
export function getRedirectFromSearch(search) {
    const q = new URLSearchParams(search);
    return normalizeRedirectTarget(q.get("redirect"));
}
export function buildLoginUrl(redirectTarget) {
    return `/login?redirect=${encodeURIComponent(redirectTarget)}`;
}
export function savePostLoginRedirect(target) {
    const w = safeWindow();
    if (!w)
        return;
    const normalized = normalizeRedirectTarget(target);
    if (!normalized)
        return;
    w.sessionStorage.setItem(REDIRECT_STORAGE_KEY, normalized);
}
export function peekPostLoginRedirect() {
    const w = safeWindow();
    if (!w)
        return null;
    return normalizeRedirectTarget(w.sessionStorage.getItem(REDIRECT_STORAGE_KEY));
}
export function consumePostLoginRedirect() {
    const w = safeWindow();
    if (!w)
        return null;
    const raw = w.sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    w.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    return normalizeRedirectTarget(raw);
}
