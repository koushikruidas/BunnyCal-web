import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface PendingAction {
  kind: IntegrationKind;
  provider: IntegrationProviderId;
  action: "connect" | "disconnect";
}

interface IntegrationStateValue {
  calendarStatus: ProviderAwareStatusMap;
  conferencingStatus: ProviderAwareStatusMap;
  calendarCapabilities: ProviderCapabilityMap;
  conferencingCapabilities: ProviderCapabilityMap;
  statusMap: Record<string, string>;
  calendarConnections: CalendarConnectionRuntime[];
  conferencingRuntime: ConferencingRuntimeState;
  loading: boolean;
  error: string | null;
  banner: string | null;
  pendingAction: PendingAction | null;
  isResolvingOAuthReturn: boolean;
  isManuallyRefreshing: boolean;
  refreshStatus: (kind?: IntegrationKind, provider?: IntegrationProviderId) => Promise<void>;
  manualRefreshStatus: () => Promise<void>;
  startConnect: (kind: IntegrationKind, provider: IntegrationProviderId, returnTo?: string) => Promise<void>;
  disconnectProvider: (kind: IntegrationKind, provider: IntegrationProviderId) => Promise<void>;
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
  hasCalendarCapability: (providerEnum: string) => boolean;
  hasConferencingCapability: (providerEnum: string) => boolean;
}

const IntegrationContext = createContext<IntegrationStateValue | null>(null);

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

function isCalendarBackedConferencingProvider(provider?: IntegrationProviderId | null) {
  return provider === "google" || provider === "microsoft";
}

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isResolvingOAuthReturn, setIsResolvingOAuthReturn] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  const calendarQuery = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => api.getCalendarStatus(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: Boolean(user?.id),
  });

  const conferencingQuery = useQuery({
    queryKey: ["conferencing-status"],
    queryFn: () => api.getConferencingStatus(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: Boolean(user?.id),
  });

  const calendarData = calendarQuery.data;
  const conferencingData = conferencingQuery.data;

  const calendarParsed = useMemo(() => {
    if (!calendarData) {
      return {
        calendarStatus: {} as ProviderAwareStatusMap,
        calendarCapabilities: {} as ProviderCapabilityMap,
        calendarConnections: [] as CalendarConnectionRuntime[],
        conferencingRuntime: { zoomConnected: false, googleMeetAvailable: false, teamsAvailable: false } satisfies ConferencingRuntimeState,
      };
    }

    const runtime = parseCalendarRuntimeStatus(calendarData);
    const parsed = parseStatusEnvelope(calendarData, "calendar");
    const derived = buildCalendarStatusFromConnections(runtime.connections);
    const calendarStatus = Object.keys(parsed.providers).length > 0
      ? { ...derived, ...parsed.providers }
      : derived;

    return {
      calendarStatus,
      calendarCapabilities: parsed.capabilities,
      calendarConnections: runtime.connections,
      conferencingRuntime: runtime.conferencing,
    };
  }, [calendarData]);

  const conferencingParsed = useMemo(() => {
    if (!conferencingData) {
      return {
        conferencingStatus: {} as ProviderAwareStatusMap,
        conferencingCapabilities: {} as ProviderCapabilityMap,
      };
    }

    const parsed = parseStatusEnvelope(conferencingData, "conferencing");
    return {
      conferencingStatus: parsed.providers,
      conferencingCapabilities: parsed.capabilities,
    };
  }, [conferencingData]);

  const loading = calendarQuery.isLoading || conferencingQuery.isLoading;
  const error = useMemo(() => {
    if (manualError) return manualError;
    if (calendarData || conferencingData) return null;
    const hasCalendarError = calendarQuery.isError;
    const hasConferencingError = conferencingQuery.isError;
    if (!hasCalendarError && !hasConferencingError) return null;
    return "Unable to load integration status.";
  }, [calendarData, calendarQuery.isError, conferencingData, conferencingQuery.isError, manualError]);

  useEffect(() => {
    if (!user?.id) return;
    if (calendarQuery.data && calendarQuery.isStale && !calendarQuery.isFetching) {
      void queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    }
    if (conferencingQuery.data && conferencingQuery.isStale && !conferencingQuery.isFetching) {
      void queryClient.invalidateQueries({ queryKey: ["conferencing-status"] });
    }
  }, [
    calendarQuery.data,
    calendarQuery.isFetching,
    calendarQuery.isStale,
    conferencingQuery.data,
    conferencingQuery.isFetching,
    conferencingQuery.isStale,
    location.hash,
    location.pathname,
    location.search,
    queryClient,
    user?.id,
  ]);

  const refreshStatus = useCallback(async (kind?: IntegrationKind, provider?: IntegrationProviderId) => {
    if (!user?.id) return;
    const shouldAlsoRefreshConferencing = kind === "calendar" && isCalendarBackedConferencingProvider(provider);
    if (kind === "calendar") {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar-status"] }),
        ...(shouldAlsoRefreshConferencing
          ? [queryClient.invalidateQueries({ queryKey: ["conferencing-status"] })]
          : []),
      ]);
      return;
    }
    if (kind === "conferencing") {
      await queryClient.invalidateQueries({ queryKey: ["conferencing-status"] });
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] }),
      queryClient.invalidateQueries({ queryKey: ["conferencing-status"] }),
    ]);
  }, [queryClient, user?.id]);

  const manualRefreshStatus = useCallback(async () => {
    setIsManuallyRefreshing(true);
    try {
      await refreshStatus();
    } finally {
      setIsManuallyRefreshing(false);
    }
  }, [refreshStatus]);

  const startConnect = useCallback(async (kind: IntegrationKind, provider: IntegrationProviderId, returnTo?: string) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    if (kind === "conferencing" && !isOAuthConferencingProvider(canonicalProvider)) {
      setManualError("This conferencing provider does not support OAuth connection.");
      return;
    }
    const target = returnTo ?? getCurrentRelativeUrl();
    setPendingAction({ kind, provider: canonicalProvider, action: "connect" });
    setManualError(null);
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
      setManualError(msg || `Failed to start ${canonicalProvider} connect.`);
      setPendingAction(null);
    }
  }, []);

  const startGoogleConnect = useCallback(async (returnTo?: string) => {
    await startConnect("calendar", "google", returnTo);
  }, [startConnect]);

  const disconnectProvider = useCallback(async (kind: IntegrationKind, provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    setPendingAction({ kind, provider: canonicalProvider, action: "disconnect" });
    setManualError(null);
    try {
      if (kind === "conferencing") {
        await api.disconnectConferencing(canonicalProvider);
      } else {
        await api.disconnectCalendar(canonicalProvider);
      }
      await refreshStatus(kind, canonicalProvider);
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
        setManualError("This conferencing provider is calendar-backed. Disconnect its calendar provider instead.");
      } else {
        setManualError(msg || `Failed to disconnect ${canonicalProvider}.`);
      }
    } finally {
      setPendingAction(null);
    }
  }, [refreshStatus]);

  const disconnect = useCallback(async (provider: IntegrationProviderId) => {
    const kind: IntegrationKind = conferencingParsed.conferencingStatus[provider] ? "conferencing" : "calendar";
    await disconnectProvider(kind, provider);
  }, [conferencingParsed.conferencingStatus, disconnectProvider]);

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
        const refreshKind: IntegrationKind = pendingKind ?? (pendingProvider && isOAuthConferencingProvider(pendingProvider) ? "conferencing" : "calendar");
        void refreshStatus(refreshKind, pendingProvider ?? undefined)
          .then(() => {
            setBanner("Integration updated.");
          })
          .finally(() => {
            setPendingAction(null);
            setIsResolvingOAuthReturn(false);
          });
        return;
      }
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
      setManualError(detail);
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
    const refreshKind: IntegrationKind = isOAuthConferencingProvider(integrationSuccess) ? "conferencing" : "calendar";
    const canonicalSuccessProvider = toCanonicalProviderId(integrationSuccess);
    void refreshStatus(refreshKind, canonicalSuccessProvider)
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

  const statusMap = useMemo(() => flattenStatusMap(calendarParsed.calendarStatus, conferencingParsed.conferencingStatus), [calendarParsed.calendarStatus, conferencingParsed.conferencingStatus]);

  const getCalendarProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    const baseStatus = normalizeIntegrationUiStatus(readStatusString(calendarParsed.calendarStatus[canonicalProvider]));
    return getOptimisticStatus(baseStatus, pendingAction, isResolvingOAuthReturn, "calendar", canonicalProvider);
  }, [calendarParsed.calendarStatus, isResolvingOAuthReturn, pendingAction]);

  const getConferencingProviderStatusFn = useCallback((provider: IntegrationProviderId) => {
    const canonicalProvider = toCanonicalProviderId(provider);
    const baseStatus = normalizeIntegrationUiStatus(readStatusString(conferencingParsed.conferencingStatus[canonicalProvider]));
    return getOptimisticStatus(baseStatus, pendingAction, isResolvingOAuthReturn, "conferencing", canonicalProvider);
  }, [conferencingParsed.conferencingStatus, isResolvingOAuthReturn, pendingAction]);

  const getProviderStatus = useCallback((provider: IntegrationProviderId) => {
    const calendar = getCalendarProviderStatusFn(provider);
    if (calendar !== "disconnected") return calendar;
    return getConferencingProviderStatusFn(provider);
  }, [getCalendarProviderStatusFn, getConferencingProviderStatusFn]);

  const getProviderCalendars = useCallback((provider: IntegrationProviderId) => {
    const entry = calendarParsed.calendarStatus[provider];
    if (!entry || typeof entry !== "object") return [];
    const list = Array.isArray(entry.calendars) ? entry.calendars : [];
    return list;
  }, [calendarParsed.calendarStatus]);

  const getCalendarConnections = useCallback(() => calendarParsed.calendarConnections, [calendarParsed.calendarConnections]);

  const getCalendarCapability = useCallback((providerEnum: string) => {
    return calendarParsed.calendarCapabilities[providerEnum.toUpperCase()] ?? null;
  }, [calendarParsed.calendarCapabilities]);

  const getConferencingCapability = useCallback((providerEnum: string) => {
    return conferencingParsed.conferencingCapabilities[providerEnum.toUpperCase()] ?? null;
  }, [conferencingParsed.conferencingCapabilities]);

  const hasCalendarCapability = useCallback((providerEnum: string) => {
    return Object.prototype.hasOwnProperty.call(calendarParsed.calendarCapabilities, providerEnum.toUpperCase());
  }, [calendarParsed.calendarCapabilities]);

  const hasConferencingCapability = useCallback((providerEnum: string) => {
    return Object.prototype.hasOwnProperty.call(conferencingParsed.conferencingCapabilities, providerEnum.toUpperCase());
  }, [conferencingParsed.conferencingCapabilities]);

  const value = useMemo<IntegrationStateValue>(() => ({
    calendarStatus: calendarParsed.calendarStatus,
    conferencingStatus: conferencingParsed.conferencingStatus,
    calendarCapabilities: calendarParsed.calendarCapabilities,
    conferencingCapabilities: conferencingParsed.conferencingCapabilities,
    calendarConnections: calendarParsed.calendarConnections,
    conferencingRuntime: calendarParsed.conferencingRuntime,
    statusMap,
    loading,
    error,
    banner,
    pendingAction,
    isResolvingOAuthReturn,
    isManuallyRefreshing,
    refreshStatus,
    manualRefreshStatus,
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
  }), [banner, calendarParsed, disconnect, disconnectProvider, error, getCalendarCapability, getCalendarConnections, getCalendarProviderStatusFn, getConferencingCapability, getConferencingProviderStatusFn, getProviderCalendars, getProviderStatus, hasCalendarCapability, hasConferencingCapability, isManuallyRefreshing, isResolvingOAuthReturn, loading, manualRefreshStatus, pendingAction, refreshStatus, startConnect, startGoogleConnect, statusMap, conferencingParsed]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationState() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error("useIntegrationState must be used within IntegrationProvider");
  return ctx;
}
