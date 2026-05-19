import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services";
import type {
  ProviderAwareStatusMap,
  ProviderCalendarSummary,
  ProviderCapabilityFlags,
  ProviderCapabilityMap,
  ProviderStatusEntry,
} from "@/services/types";
import { getCurrentRelativeUrl } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { oauthDebug } from "@/lib/authDebug";
import { opsLogger } from "@/lib/opsLogger";

export type IntegrationKind = "calendar" | "conferencing";
export type CalendarProviderId = "google";
export type ConferencingProviderId = "zoom";
export type IntegrationProviderId = CalendarProviderId | ConferencingProviderId | "microsoft";
export type IntegrationUiStatus = "connected" | "disconnected" | "syncing" | "failed";

const OAUTH_PENDING_KEY = "integration-oauth-pending";
const STATUS_CACHE_KEY = "integration-status-cache-v2";

interface PendingAction {
  kind: IntegrationKind;
  provider: IntegrationProviderId;
  action: "connect" | "disconnect";
}

interface CachedStatus {
  calendar: ProviderAwareStatusMap;
  conferencing: ProviderAwareStatusMap;
  calendarCapabilities: ProviderCapabilityMap;
  conferencingCapabilities: ProviderCapabilityMap;
}

interface IntegrationStateValue {
  // Provider-aware status maps
  calendarStatus: ProviderAwareStatusMap;
  conferencingStatus: ProviderAwareStatusMap;
  // Capability metadata keyed by backend enum casing (GOOGLE, MICROSOFT, GOOGLE_MEET, ZOOM, CUSTOM_URL, NONE).
  calendarCapabilities: ProviderCapabilityMap;
  conferencingCapabilities: ProviderCapabilityMap;
  // Legacy flat map for callers that still consume it.
  statusMap: Record<string, string>;
  loading: boolean;
  error: string | null;
  banner: string | null;
  pendingAction: PendingAction | null;
  refreshStatus: (force?: boolean) => Promise<void>;
  startConnect: (kind: IntegrationKind, provider: IntegrationProviderId, returnTo?: string) => Promise<void>;
  disconnectProvider: (kind: IntegrationKind, provider: IntegrationProviderId) => Promise<void>;
  // Legacy helpers preserved so older callers keep working unchanged.
  startGoogleConnect: (returnTo?: string) => Promise<void>;
  disconnect: (provider: IntegrationProviderId) => Promise<void>;
  clearBanner: () => void;
  getProviderStatus: (provider: IntegrationProviderId) => IntegrationUiStatus;
  getCalendarProviderStatus: (provider: IntegrationProviderId) => IntegrationUiStatus;
  getConferencingProviderStatus: (provider: IntegrationProviderId) => IntegrationUiStatus;
  getProviderCalendars: (provider: IntegrationProviderId) => ProviderCalendarSummary[];
  getCalendarCapability: (providerEnum: string) => ProviderCapabilityFlags | null;
  getConferencingCapability: (providerEnum: string) => ProviderCapabilityFlags | null;
  // True when the backend explicitly reports a capability entry for this provider.
  // Used by UIs to decide whether to render a tile / chip without hardcoding enum lists.
  hasCalendarCapability: (providerEnum: string) => boolean;
  hasConferencingCapability: (providerEnum: string) => boolean;
}

const IntegrationContext = createContext<IntegrationStateValue | null>(null);

function readCachedStatus(userId: string | undefined): CachedStatus | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${STATUS_CACHE_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedStatus>;
    return {
      calendar: parsed.calendar ?? {},
      conferencing: parsed.conferencing ?? {},
      calendarCapabilities: parsed.calendarCapabilities ?? {},
      conferencingCapabilities: parsed.conferencingCapabilities ?? {},
    };
  } catch {
    return null;
  }
}

function writeCachedStatus(userId: string | undefined, status: CachedStatus) {
  if (!userId) return;
  localStorage.setItem(`${STATUS_CACHE_KEY}:${userId}`, JSON.stringify(status));
}

function readStatusString(entry: ProviderStatusEntry | string | undefined): string {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const obj = entry as Record<string, unknown>;
  // Try a few common field names the backend may use.
  for (const key of ["status", "state", "connectionStatus", "integrationStatus"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  // Boolean flags fall back to CONNECTED/DISCONNECTED.
  for (const key of ["connected", "isConnected", "active", "isActive"]) {
    const v = obj[key];
    if (typeof v === "boolean") return v ? "CONNECTED" : "DISCONNECTED";
  }
  // If there are meaningful keys (calendars, accountEmail, providerAccountId, etc) treat as connected.
  const hints = ["calendars", "accountEmail", "accountId", "providerAccountId", "externalAccountId", "connectionId", "lastSyncedAt", "scopes"];
  if (hints.some((k) => obj[k] !== undefined && obj[k] !== null)) return "CONNECTED";
  return "";
}

function normalizeStatus(status?: string): IntegrationUiStatus {
  const normalized = (status ?? "").trim().toUpperCase();
  if (!normalized) return "disconnected";
  if (normalized === "CONNECTED" || normalized === "ACTIVE" || normalized === "AVAILABLE") return "connected";
  if (normalized === "CALENDAR_SYNC_IN_PROGRESS" || normalized === "SYNCING") return "syncing";
  if (normalized === "STALE_CALENDAR_DATA") return "syncing";
  if (normalized === "CALENDAR_NOT_CONNECTED" || normalized === "DISCONNECTED" || normalized === "INACTIVE") return "disconnected";
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) return "failed";
  return "disconnected";
}

function coerceProviderAwareMap(input: unknown): ProviderAwareStatusMap {
  if (!input || typeof input !== "object") return {};
  const out: ProviderAwareStatusMap = {};
  for (const [provider, raw] of Object.entries(input as Record<string, unknown>)) {
    const key = provider.toLowerCase();
    if (typeof raw === "string") {
      out[key] = { status: raw };
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const status = readStatusString(raw as ProviderStatusEntry);
      const calendars = Array.isArray(obj.calendars) ? (obj.calendars as ProviderCalendarSummary[]) : undefined;
      out[key] = { ...obj, status, ...(calendars ? { calendars } : {}) };
    }
  }
  return out;
}

function coerceCapabilityMap(input: unknown): ProviderCapabilityMap {
  if (!input || typeof input !== "object") return {};
  const out: ProviderCapabilityMap = {};
  for (const [providerEnum, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw && typeof raw === "object") {
      out[providerEnum.toUpperCase()] = raw as ProviderCapabilityFlags;
    }
  }
  return out;
}

// Backend may return either the new envelope { calendar/providers, capabilities } or a
// flat { google: "CONNECTED", microsoft: {...} } map. Normalize to a single shape.
function parseStatusEnvelope(
  raw: unknown,
  kind: IntegrationKind,
): { providers: ProviderAwareStatusMap; capabilities: ProviderCapabilityMap } {
  if (!raw || typeof raw !== "object") {
    return { providers: {}, capabilities: {} };
  }
  const obj = raw as Record<string, unknown>;
  const providersField = kind === "calendar" ? obj.calendar : obj.providers;
  const capabilitiesRoot = obj.capabilities && typeof obj.capabilities === "object"
    ? (obj.capabilities as Record<string, unknown>)
    : null;
  const capabilitiesField = capabilitiesRoot
    ? (kind === "calendar" ? capabilitiesRoot.calendar : capabilitiesRoot.conferencing)
    : null;
  const hasEnvelope = providersField !== undefined || capabilitiesField !== undefined;
  if (hasEnvelope) {
    return {
      providers: coerceProviderAwareMap(providersField),
      capabilities: coerceCapabilityMap(capabilitiesField),
    };
  }
  // Legacy flat shape.
  return { providers: coerceProviderAwareMap(raw), capabilities: {} };
}

function flattenStatusMap(...maps: ProviderAwareStatusMap[]): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const map of maps) {
    for (const [provider, entry] of Object.entries(map)) {
      flat[provider] = readStatusString(entry);
    }
  }
  return flat;
}

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarStatus, setCalendarStatus] = useState<ProviderAwareStatusMap>({});
  const [conferencingStatus, setConferencingStatus] = useState<ProviderAwareStatusMap>({});
  const [calendarCapabilities, setCalendarCapabilities] = useState<ProviderCapabilityMap>({});
  const [conferencingCapabilities, setConferencingCapabilities] = useState<ProviderCapabilityMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refreshStatus = useCallback(async (force = false) => {
    if (inFlightRef.current && !force) return inFlightRef.current;

    const work = (async () => {
      setLoading(true);
      setError(null);
      try {
        const [calendarResult, conferencingResult] = await Promise.allSettled([
          api.getCalendarProviderStatus(),
          api.getConferencingStatus(),
        ]);

        let nextCalendar: ProviderAwareStatusMap = {};
        let nextCalendarCaps: ProviderCapabilityMap = {};
        if (calendarResult.status === "fulfilled") {
          const parsed = parseStatusEnvelope(calendarResult.value, "calendar");
          nextCalendar = parsed.providers;
          nextCalendarCaps = parsed.capabilities;
        } else {
          // Fall back to legacy flat status map if provider-aware endpoint fails.
          try {
            const legacy = await api.getCalendarStatus();
            nextCalendar = coerceProviderAwareMap(legacy);
          } catch (legacyError) {
            opsLogger.warn({
              category: "calendar_integration_failure",
              message: "Failed to load calendar status",
            });
            console.error(legacyError);
          }
        }

        let nextConferencing: ProviderAwareStatusMap = {};
        let nextConferencingCaps: ProviderCapabilityMap = {};
        if (conferencingResult.status === "fulfilled") {
          const parsed = parseStatusEnvelope(conferencingResult.value, "conferencing");
          nextConferencing = parsed.providers;
          nextConferencingCaps = parsed.capabilities;
        } else {
          opsLogger.warn({
            category: "conferencing_integration_failure",
            message: "Failed to load conferencing status",
          });
          console.error(conferencingResult.reason);
        }

        setCalendarStatus(nextCalendar);
        setConferencingStatus(nextConferencing);
        setCalendarCapabilities(nextCalendarCaps);
        setConferencingCapabilities(nextConferencingCaps);
        writeCachedStatus(user?.id, {
          calendar: nextCalendar,
          conferencing: nextConferencing,
          calendarCapabilities: nextCalendarCaps,
          conferencingCapabilities: nextConferencingCaps,
        });
      } catch (e) {
        opsLogger.warn({
          category: "calendar_integration_failure",
          message: "Failed to refresh integration status",
        });
        console.error(e);
        setError("Unable to load integration status.");
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = work;
    return work;
  }, [user?.id]);

  const startConnect = useCallback(async (kind: IntegrationKind, provider: IntegrationProviderId, returnTo?: string) => {
    const target = returnTo ?? getCurrentRelativeUrl();
    setPendingAction({ kind, provider, action: "connect" });
    setError(null);
    try {
      sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ kind, provider, returnTo: target, startedAt: Date.now() }));
      const redirectUrl = await api.getIntegrationConnectRedirectUrl(kind, provider, { source: "host-dashboard", returnTo: target });
      window.location.href = redirectUrl;
    } catch (e) {
      opsLogger.warn({
        category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
        message: `Failed to start ${provider} ${kind} connect`,
      });
      console.error(e);
      setError(`Failed to start ${provider} connect.`);
      setPendingAction(null);
    }
  }, []);

  const startGoogleConnect = useCallback(async (returnTo?: string) => {
    await startConnect("calendar", "google", returnTo);
  }, [startConnect]);

  const disconnectProvider = useCallback(async (kind: IntegrationKind, provider: IntegrationProviderId) => {
    setPendingAction({ kind, provider, action: "disconnect" });
    setError(null);
    try {
      if (kind === "conferencing") {
        await api.disconnectConferencing(provider);
      } else {
        await api.disconnectCalendar(provider);
      }
      await refreshStatus(true);
      setBanner(`${provider[0].toUpperCase()}${provider.slice(1)} disconnected.`);
    } catch (e) {
      opsLogger.warn({
        category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
        message: "Failed to disconnect provider",
        details: { provider, kind },
      });
      console.error(e);
      setError(`Failed to disconnect ${provider}.`);
    } finally {
      setPendingAction(null);
    }
  }, [refreshStatus]);

  const disconnect = useCallback(async (provider: IntegrationProviderId) => {
    // Legacy callers; infer kind from where the provider currently appears.
    const kind: IntegrationKind = conferencingStatus[provider] ? "conferencing" : "calendar";
    await disconnectProvider(kind, provider);
  }, [conferencingStatus, disconnectProvider]);

  useEffect(() => {
    const cached = readCachedStatus(user?.id);
    if (cached) {
      setCalendarStatus(cached.calendar);
      setConferencingStatus(cached.conferencing);
      setCalendarCapabilities(cached.calendarCapabilities);
      setConferencingCapabilities(cached.conferencingCapabilities);
    }
    if (user?.id) {
      void refreshStatus(true);
    }
  }, [refreshStatus, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => void refreshStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshStatus, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as { provider?: string; kind?: string; returnTo?: string; startedAt?: number };
      if (!pending.returnTo) return;
      const startedAt = typeof pending.startedAt === "number" ? pending.startedAt : 0;
      // Drop stale OAuth pending entries so we don't redirect users unexpectedly.
      if (startedAt && Date.now() - startedAt > 10 * 60 * 1000) {
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        return;
      }
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (current === pending.returnTo) {
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        void refreshStatus(true).then(() => {
          setBanner("Integration updated.");
        });
        return;
      }
      // OAuth landed us somewhere other than where we started (e.g. some providers
      // ignore returnTo and bounce to the app root). Recover by navigating the user
      // back to the originating page so the connected state is visible there.
      const safeTarget = pending.returnTo.startsWith("/") ? pending.returnTo : `/${pending.returnTo}`;
      navigate(safeTarget, { replace: true });
    } catch {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
    }
  }, [location.hash, location.pathname, location.search, navigate, refreshStatus, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(location.search);
    const integrationSuccess = params.get("integrationSuccess");
    if (!integrationSuccess) return;
    oauthDebug("integration success query detected", {
      provider: integrationSuccess,
      pathname: location.pathname,
    });
    void refreshStatus(true).then(() => {
      setBanner(`${integrationSuccess} connected.`);
      params.delete("integrationSuccess");
      const nextSearch = params.toString();
      const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`;
      window.history.replaceState({}, "", nextUrl);
      oauthDebug("cleaned integration success query param", { nextUrl });
    });
  }, [location.hash, location.pathname, location.search, refreshStatus, user?.id]);

  const statusMap = useMemo(() => flattenStatusMap(calendarStatus, conferencingStatus), [calendarStatus, conferencingStatus]);

  const getCalendarProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    return normalizeStatus(readStatusString(calendarStatus[provider]));
  }, [calendarStatus]);

  const getConferencingProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    return normalizeStatus(readStatusString(conferencingStatus[provider]));
  }, [conferencingStatus]);

  const getProviderStatus = useCallback((provider: IntegrationProviderId) => {
    // Treat connected in either kind as connected for legacy single-namespace callers.
    const calendar = getCalendarProviderStatusFn(provider);
    if (calendar !== "disconnected") return calendar;
    return getConferencingProviderStatusFn(provider);
  }, [getCalendarProviderStatusFn, getConferencingProviderStatusFn]);

  const getProviderCalendars = useCallback((provider: IntegrationProviderId) => {
    const entry = calendarStatus[provider];
    if (!entry || typeof entry !== "object") return [];
    const list = Array.isArray(entry.calendars) ? entry.calendars : [];
    return list;
  }, [calendarStatus]);

  const getCalendarCapability = useCallback((providerEnum: string) => {
    return calendarCapabilities[providerEnum.toUpperCase()] ?? null;
  }, [calendarCapabilities]);

  const getConferencingCapability = useCallback((providerEnum: string) => {
    return conferencingCapabilities[providerEnum.toUpperCase()] ?? null;
  }, [conferencingCapabilities]);

  const hasCalendarCapability = useCallback((providerEnum: string) => {
    return Object.prototype.hasOwnProperty.call(calendarCapabilities, providerEnum.toUpperCase());
  }, [calendarCapabilities]);

  const hasConferencingCapability = useCallback((providerEnum: string) => {
    return Object.prototype.hasOwnProperty.call(conferencingCapabilities, providerEnum.toUpperCase());
  }, [conferencingCapabilities]);

  const value = useMemo<IntegrationStateValue>(() => ({
    calendarStatus,
    conferencingStatus,
    calendarCapabilities,
    conferencingCapabilities,
    statusMap,
    loading,
    error,
    banner,
    pendingAction,
    refreshStatus,
    startConnect,
    disconnectProvider,
    startGoogleConnect,
    disconnect,
    clearBanner: () => setBanner(null),
    getProviderStatus,
    getCalendarProviderStatus: getCalendarProviderStatusFn,
    getConferencingProviderStatus: getConferencingProviderStatusFn,
    getProviderCalendars,
    getCalendarCapability,
    getConferencingCapability,
    hasCalendarCapability,
    hasConferencingCapability,
  }), [banner, calendarCapabilities, calendarStatus, conferencingCapabilities, conferencingStatus, disconnect, disconnectProvider, error, getCalendarCapability, getCalendarProviderStatusFn, getConferencingCapability, getConferencingProviderStatusFn, getProviderCalendars, getProviderStatus, hasCalendarCapability, hasConferencingCapability, loading, pendingAction, refreshStatus, startConnect, startGoogleConnect, statusMap]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationState() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error("useIntegrationState must be used within IntegrationProvider");
  return ctx;
}
