const AUTH_INTENT_STORAGE_KEY = "auth-intent";

export type AuthIntent =
  | { mode: "APP_LOGIN" }
  | { mode: "PROTECTED_ROUTE"; returnTo: string }
  | { mode: "INTEGRATION"; returnTo: string; provider?: "GOOGLE" | "MICROSOFT" | "ZOOM" };

function safeWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

export function getCurrentRelativeUrl() {
  const w = safeWindow();
  if (!w) return "/";
  return `${w.location.pathname}${w.location.search}${w.location.hash}`;
}

export function normalizeReturnTo(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  try {
    const w = safeWindow();
    const base = w?.location.origin ?? "http://localhost";
    const url = new URL(trimmed, base);
    if (w && url.origin !== w.location.origin) return null;
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname.startsWith("//")) return null;
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    if (url.pathname === "/login" || url.pathname === "/sign-in") {
      const nested = getReturnToFromSearch(url.search);
      return nested;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function getReturnToFromSearch(search: string): string | null {
  const q = new URLSearchParams(search);
  return normalizeReturnTo(q.get("returnTo"));
}

export function getIntentFromSearch(search: string): AuthIntent | null {
  const q = new URLSearchParams(search);
  const mode = q.get("mode");
  if (mode === "APP_LOGIN") return { mode: "APP_LOGIN" };
  if (mode === "PROTECTED_ROUTE") {
    const returnTo = normalizeReturnTo(q.get("returnTo"));
    return returnTo ? { mode: "PROTECTED_ROUTE", returnTo } : null;
  }
  if (mode === "INTEGRATION") {
    const returnTo = normalizeReturnTo(q.get("returnTo"));
    if (!returnTo) return null;
    const provider = q.get("provider");
    const normalizedProvider = provider === "GOOGLE" || provider === "MICROSOFT" || provider === "ZOOM" ? provider : undefined;
    return { mode: "INTEGRATION", returnTo, provider: normalizedProvider };
  }
  return null;
}

export function buildSignInUrl(intent: AuthIntent = { mode: "APP_LOGIN" }) {
  if (intent.mode === "APP_LOGIN") return "/sign-in?mode=APP_LOGIN";
  if (intent.mode === "INTEGRATION") {
    const provider = intent.provider ? `&provider=${encodeURIComponent(intent.provider)}` : "";
    return `/sign-in?mode=INTEGRATION&returnTo=${encodeURIComponent(intent.returnTo)}${provider}`;
  }
  return `/sign-in?mode=PROTECTED_ROUTE&returnTo=${encodeURIComponent(intent.returnTo)}`;
}

export function saveAuthIntent(intent: AuthIntent) {
  const w = safeWindow();
  if (!w) return;
  if (intent.mode === "APP_LOGIN") {
    w.sessionStorage.setItem(AUTH_INTENT_STORAGE_KEY, JSON.stringify(intent));
    return;
  }
  const normalized = normalizeReturnTo(intent.returnTo);
  if (!normalized) return;
  w.sessionStorage.setItem(AUTH_INTENT_STORAGE_KEY, JSON.stringify({ ...intent, returnTo: normalized }));
}

export function peekAuthIntent(): AuthIntent | null {
  const w = safeWindow();
  if (!w) return null;
  const raw = w.sessionStorage.getItem(AUTH_INTENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthIntent;
    if (parsed.mode === "APP_LOGIN") return parsed;
    if (parsed.mode === "PROTECTED_ROUTE") {
      const normalized = normalizeReturnTo(parsed.returnTo);
      return normalized ? { mode: "PROTECTED_ROUTE", returnTo: normalized } : null;
    }
    if (parsed.mode === "INTEGRATION") {
      const normalized = normalizeReturnTo(parsed.returnTo);
      if (!normalized) return null;
      const provider = parsed.provider === "GOOGLE" || parsed.provider === "MICROSOFT" || parsed.provider === "ZOOM" ? parsed.provider : undefined;
      return { mode: "INTEGRATION", returnTo: normalized, provider };
    }
    return null;
  } catch {
    return null;
  }
}

export function consumeAuthIntent() {
  const w = safeWindow();
  if (!w) return null;
  const intent = peekAuthIntent();
  w.sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
  return intent;
}

export function resolvePostLoginPath(intent: AuthIntent | null) {
  if (!intent) return "/dashboard";
  if (intent.mode === "INTEGRATION" || intent.mode === "PROTECTED_ROUTE") {
    return intent.returnTo;
  }
  return "/dashboard";
}
