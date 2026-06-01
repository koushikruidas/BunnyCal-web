const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((v) => Number(v));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isDevLikeHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return LOOPBACK_HOSTS.has(normalized)
    || normalized.endsWith(".local")
    || normalized.endsWith(".localhost")
    || normalized === "host.docker.internal"
    || isPrivateIpv4(normalized);
}

export function normalizeAuthRedirectUrl(rawUrl: string, apiBaseUrl: string) {
  const parsed = new URL(rawUrl, window.location.origin);

  if (import.meta.env.PROD && isDevLikeHost(parsed.hostname)) {
    const message = `[redirect-safety] Rejected unsafe redirect URL in production: ${parsed.toString()}`;
    console.error(message);
    throw new Error(message);
  }

  const appProtocol = window.location.protocol;
  if (import.meta.env.PROD && appProtocol === "https:" && parsed.protocol !== "https:") {
    const message = `[redirect-safety] Rejected non-HTTPS redirect URL in production: ${parsed.toString()}`;
    console.error(message);
    throw new Error(message);
  }

  // In local/dev runtime, recover from localhost provider payload variance by pinning to API origin.
  if (!import.meta.env.PROD && isDevLikeHost(parsed.hostname)) {
    const apiOrigin = new URL(apiBaseUrl).origin;
    parsed.protocol = new URL(apiOrigin).protocol;
    parsed.host = new URL(apiOrigin).host;
  }

  return parsed.toString();
}

export function assertSafeRedirectUrl(rawUrl: string, apiBaseUrl: string) {
  return normalizeAuthRedirectUrl(rawUrl, apiBaseUrl);
}

export function redirectToExternal(rawUrl: string, apiBaseUrl: string, mode: "href" | "assign" = "href") {
  const safeUrl = assertSafeRedirectUrl(rawUrl, apiBaseUrl);
  if (mode === "assign") {
    window.location.assign(safeUrl);
    return;
  }
  window.location.href = safeUrl;
}
