const enabled = import.meta.env.VITE_AUTH_DEBUG === "true";

function log(scope: string, ...args: unknown[]) {
  if (!enabled) return;
  console.log(`[AUTH DEBUG][${scope}]`, ...args);
}

export const authDebug = (...args: unknown[]) => log("auth", ...args);
export const routeDebug = (...args: unknown[]) => log("route", ...args);
export const oauthDebug = (...args: unknown[]) => log("oauth", ...args);

export function isAuthDebugEnabled() {
  return enabled;
}
