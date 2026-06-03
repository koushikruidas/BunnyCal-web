import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services";
import type {
  CalendarConnectionRuntime,
  ConferencingRuntimeState,
  ProviderAwareStatusMap,
  ProviderCalendarSummary,
  ProviderCapabilityFlags,
  ProviderCapabilityMap,
} from "@/services/types";
import { getCurrentRelativeUrl } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { oauthDebug } from "@/lib/authDebug";
import { redirectToExternal } from "@/lib/redirectSafety";
import { opsLogger } from "@/lib/opsLogger";
import { flattenStatusMap, normalizeIntegrationUiStatus, parseCalendarRuntimeStatus, parseStatusEnvelope, readStatusString } from "@/domain/adapters/integrationStatusAdapter";
import { isOAuthConferencingProvider, toCanonicalProviderId } from "@/lib/providerIds";
import { waitForNextPaint } from "@/lib/networkActivity";

export type IntegrationKind = "calendar" | "conferencing";
export type IntegrationProviderId = string;
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
  calendarConnections?: CalendarConnectionRuntime[];
  conferencingRuntime?: ConferencingRuntimeState;
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
  calendarConnections: CalendarConnectionRuntime[];
  conferencingRuntime: ConferencingRuntimeState;
  loading: boolean;
  error: string | null;
  banner: string | null;
  pendingAction: PendingAction | null;
  isResolvingOAuthReturn: boolean;
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
  getCalendarConnections: () => CalendarConnectionRuntime[];
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
      calendarConnections: parsed.calendarConnections ?? [],
      conferencingRuntime: parsed.conferencingRuntime ?? { zoomConnected: false, googleMeetAvailable: false, teamsAvailable: false },
    };
  } catch {
    return null;
  }
}

function writeCachedStatus(userId: string | undefined, status: CachedStatus) {
  if (!userId) return;
  localStorage.setItem(`${STATUS_CACHE_KEY}:${userId}`, JSON.stringify(status));
}

function buildCalendarStatusFromConnections(connections: CalendarConnectionRuntime[]): ProviderAwareStatusMap {
  const byProvider = new Map<string, string>();
  connections.forEach((connection) => {
    const provider = toCanonicalProviderId(connection.provider);
    const normalized = String(connection.status ?? "").toUpperCase();
    const next =
      normalized === "CONNECTED" ? "CONNECTED" :
      normalized.includes("SYNC") ? "SYNCING" :
      normalized.includes("ERROR") || normalized.includes("FAIL") ? "ERROR" :
      normalized || "DISCONNECTED";
    const current = byProvider.get(provider);
    // Keep strongest status precedence: CONNECTED > SYNCING > ERROR > DISCONNECTED.
    if (!current) {
      byProvider.set(provider, next);
      return;
    }
    if (current === "CONNECTED") return;
    if (next === "CONNECTED") {
      byProvider.set(provider, next);
      return;
    }
    if (current === "SYNCING") return;
    if (next === "SYNCING") {
      byProvider.set(provider, next);
      return;
    }
    if (current === "ERROR") return;
    if (next === "ERROR") byProvider.set(provider, next);
  });
  const out: ProviderAwareStatusMap = {};
  byProvider.forEach((status, provider) => {
    out[provider] = { status };
  });
  return out;
}

function getOptimisticStatus(
  baseStatus: IntegrationUiStatus,
  pendingAction: PendingAction | null,
  isResolvingOAuthReturn: boolean,
  kind: IntegrationKind,
  provider: IntegrationProviderId,
): IntegrationUiStatus {
  if (pendingAction?.kind === kind && pendingAction.provider === provider) {
    return pendingAction.action === "disconnect" ? "disconnected" : "syncing";
  }
  if (isResolvingOAuthReturn && pendingAction?.kind === kind && pendingAction.provider === provider && baseStatus === "disconnected") {
    return "syncing";
  }
  return baseStatus;
}

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarStatus, setCalendarStatus] = useState<ProviderAwareStatusMap>({});
  const [conferencingStatus, setConferencingStatus] = useState<ProviderAwareStatusMap>({});
  const [calendarCapabilities, setCalendarCapabilities] = useState<ProviderCapabilityMap>({});
  const [conferencingCapabilities, setConferencingCapabilities] = useState<ProviderCapabilityMap>({});
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnectionRuntime[]>([]);
  const [conferencingRuntime, setConferencingRuntime] = useState<ConferencingRuntimeState>({ zoomConnected: false, googleMeetAvailable: false, teamsAvailable: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isResolvingOAuthReturn, setIsResolvingOAuthReturn] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refreshStatus = useCallback(async (force = false) => {
    if (inFlightRef.current && !force) return inFlightRef.current;

    const work = (async () => {
      setLoading(true);
      setError(null);
      try {
        const [calendarResult, conferencingResult] = await Promise.allSettled([
          api.getCalendarStatus(),
          api.getConferencingStatus(),
        ]);

        let nextCalendar: ProviderAwareStatusMap = {};
        let nextCalendarCaps: ProviderCapabilityMap = {};
        let nextConnections: CalendarConnectionRuntime[] = [];
        let nextConferencingRuntime: ConferencingRuntimeState = { zoomConnected: false, googleMeetAvailable: false, teamsAvailable: false };
        if (calendarResult.status === "fulfilled") {
          const runtime = parseCalendarRuntimeStatus(calendarResult.value);
          nextConnections = runtime.connections;
          nextConferencingRuntime = runtime.conferencing;
          const parsed = parseStatusEnvelope(calendarResult.value, "calendar");
          const derived = buildCalendarStatusFromConnections(runtime.connections);
          nextCalendar = Object.keys(parsed.providers).length > 0
            ? { ...derived, ...parsed.providers }
            : derived;
          nextCalendarCaps = parsed.capabilities;
        } else {
          opsLogger.warn({
            category: "calendar_integration_failure",
            message: "Failed to load calendar status",
          });
          console.error(calendarResult.reason);
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
        setCalendarConnections(nextConnections);
        setConferencingRuntime(nextConferencingRuntime);
        writeCachedStatus(user?.id, {
          calendar: nextCalendar,
          conferencing: nextConferencing,
          calendarCapabilities: nextCalendarCaps,
          conferencingCapabilities: nextConferencingCaps,
          calendarConnections: nextConnections,
          conferencingRuntime: nextConferencingRuntime,
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
    const canonicalProvider = toCanonicalProviderId(provider);
    if (kind === "conferencing" && !isOAuthConferencingProvider(canonicalProvider)) {
      setError("This conferencing provider does not support OAuth connection.");
      return;
    }
    const target = returnTo ?? getCurrentRelativeUrl();
    setPendingAction({ kind, provider: canonicalProvider, action: "connect" });
    setError(null);
    try {
      sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ kind, provider: canonicalProvider, returnTo: target, startedAt: Date.now() }));
      const redirectUrl = await api.getIntegrationConnectRedirectUrl(kind, canonicalProvider, { source: "host-dashboard", returnTo: target });
      await waitForNextPaint();
      redirectToExternal(redirectUrl, api.baseUrl, "href");
    } catch (e) {
      opsLogger.warn({
        category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
        message: `Failed to start ${canonicalProvider} ${kind} connect`,
      });
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      setError(msg || `Failed to start ${canonicalProvider} connect.`);
      setPendingAction(null);
    }
  }, []);

  const startGoogleConnect = useCallback(async (returnTo?: string) => {
    await startConnect("calendar", "google", returnTo);
  }, [startConnect]);

  const disconnectProvider = useCallback(async (kind: IntegrationKind, provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    setPendingAction({ kind, provider: canonicalProvider, action: "disconnect" });
    setError(null);
    try {
      if (kind === "conferencing") {
        await api.disconnectConferencing(canonicalProvider);
      } else {
        await api.disconnectCalendar(canonicalProvider);
      }
      await refreshStatus(true);
      setBanner(`${canonicalProvider[0].toUpperCase()}${canonicalProvider.slice(1)} disconnected.`);
    } catch (e) {
      opsLogger.warn({
        category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
        message: "Failed to disconnect provider",
        details: { provider: canonicalProvider, kind },
      });
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (
        kind === "conferencing" &&
        (canonicalProvider === "google_meet" || canonicalProvider === "microsoft_teams") &&
        msg.toLowerCase().includes("disconnect")
      ) {
        setError("This conferencing provider is calendar-backed. Disconnect its calendar provider instead.");
      } else {
        setError(msg || `Failed to disconnect ${canonicalProvider}.`);
      }
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
      setCalendarConnections(cached.calendarConnections ?? []);
      setConferencingRuntime(cached.conferencingRuntime ?? { zoomConnected: false, googleMeetAvailable: false, teamsAvailable: false });
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
      const pendingProvider = typeof pending.provider === "string" ? toCanonicalProviderId(pending.provider) : null;
      const pendingKind = pending.kind === "conferencing" ? "conferencing" : pending.kind === "calendar" ? "calendar" : null;
      const startedAt = typeof pending.startedAt === "number" ? pending.startedAt : 0;
      // Drop stale OAuth pending entries so we don't redirect users unexpectedly.
      if (startedAt && Date.now() - startedAt > 10 * 60 * 1000) {
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        return;
      }
      if (pendingProvider && pendingKind) {
        setPendingAction({ provider: pendingProvider, kind: pendingKind, action: "connect" });
      }
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (current === pending.returnTo) {
        setIsResolvingOAuthReturn(true);
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        void refreshStatus(true)
          .then(() => {
            setBanner("Integration updated.");
          })
          .finally(() => {
            setPendingAction(null);
            setIsResolvingOAuthReturn(false);
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
    const integrationError = params.get("error");
    const integrationErrorCode = params.get("code");
    if (!integrationSuccess && !integrationError) return;
    if (integrationError) {
      const detail = integrationErrorCode ? `${integrationError} (${integrationErrorCode})` : integrationError;
      setError(detail);
      params.delete("error");
      params.delete("code");
    }
    if (!integrationSuccess) {
      const nextSearch = params.toString();
      const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`;
      window.history.replaceState({}, "", nextUrl);
      return;
    }
    oauthDebug("integration success query detected", {
      provider: integrationSuccess,
      pathname: location.pathname,
    });
    setIsResolvingOAuthReturn(true);
    void refreshStatus(true)
      .then(() => {
        setBanner(`${integrationSuccess} connected.`);
        params.delete("integrationSuccess");
        const nextSearch = params.toString();
        const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`;
        window.history.replaceState({}, "", nextUrl);
        oauthDebug("cleaned integration success query param", { nextUrl });
      })
      .finally(() => {
        setPendingAction(null);
        setIsResolvingOAuthReturn(false);
      });
  }, [location.hash, location.pathname, location.search, refreshStatus, user?.id]);

  const statusMap = useMemo(() => flattenStatusMap(calendarStatus, conferencingStatus), [calendarStatus, conferencingStatus]);

  const getCalendarProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    const baseStatus = normalizeIntegrationUiStatus(readStatusString(calendarStatus[canonicalProvider]));
    return getOptimisticStatus(baseStatus, pendingAction, isResolvingOAuthReturn, "calendar", canonicalProvider);
  }, [calendarStatus, isResolvingOAuthReturn, pendingAction]);

  const getConferencingProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    const baseStatus = normalizeIntegrationUiStatus(readStatusString(conferencingStatus[canonicalProvider]));
    return getOptimisticStatus(baseStatus, pendingAction, isResolvingOAuthReturn, "conferencing", canonicalProvider);
  }, [conferencingStatus, isResolvingOAuthReturn, pendingAction]);

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
  const getCalendarConnections = useCallback(() => calendarConnections, [calendarConnections]);

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
    calendarConnections,
    conferencingRuntime,
    statusMap,
    loading,
    error,
    banner,
    pendingAction,
    isResolvingOAuthReturn,
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
    getCalendarConnections,
    getCalendarCapability,
    getConferencingCapability,
    hasCalendarCapability,
    hasConferencingCapability,
  }), [banner, calendarCapabilities, calendarConnections, calendarStatus, conferencingCapabilities, conferencingRuntime, conferencingStatus, disconnect, disconnectProvider, error, getCalendarCapability, getCalendarConnections, getCalendarProviderStatusFn, getConferencingCapability, getConferencingProviderStatusFn, getProviderCalendars, getProviderStatus, hasCalendarCapability, hasConferencingCapability, isResolvingOAuthReturn, loading, pendingAction, refreshStatus, startConnect, startGoogleConnect, statusMap]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationState() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error("useIntegrationState must be used within IntegrationProvider");
  return ctx;
}
