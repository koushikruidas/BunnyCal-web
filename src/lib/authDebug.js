const enabled = import.meta.env.VITE_AUTH_DEBUG === "true";
function log(scope, ...args) {
    if (!enabled)
        return;
    console.log(`[AUTH DEBUG][${scope}]`, ...args);
}
export const authDebug = (...args) => log("auth", ...args);
export const routeDebug = (...args) => log("route", ...args);
export const oauthDebug = (...args) => log("oauth", ...args);
export function isAuthDebugEnabled() {
    return enabled;
}
