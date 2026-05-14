import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/services";
import { getCurrentRelativeUrl } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { oauthDebug } from "@/lib/authDebug";
import { opsLogger } from "@/lib/opsLogger";

export type IntegrationProviderId = "google" | "microsoft" | "zoom";
export type IntegrationUiStatus = "connected" | "disconnected" | "syncing" | "failed";

const OAUTH_PENDING_KEY = "integration-oauth-pending";
const STATUS_CACHE_KEY = "integration-status-cache";

interface IntegrationStateValue {
  statusMap: Record<string, string>;
  loading: boolean;
  error: string | null;
  banner: string | null;
  pendingAction: { provider: IntegrationProviderId; action: "connect" | "disconnect" } | null;
  refreshStatus: (force?: boolean) => Promise<void>;
  startGoogleConnect: (returnTo?: string) => Promise<void>;
  disconnect: (provider: IntegrationProviderId) => Promise<void>;
  clearBanner: () => void;
  getProviderStatus: (provider: IntegrationProviderId) => IntegrationUiStatus;
}

const IntegrationContext = createContext<IntegrationStateValue | null>(null);

function readCachedStatus(userId: string | undefined): Record<string, string> | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${STATUS_CACHE_KEY}:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

function writeCachedStatus(userId: string | undefined, status: Record<string, string>) {
  if (!userId) return;
  localStorage.setItem(`${STATUS_CACHE_KEY}:${userId}`, JSON.stringify(status));
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

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ provider: IntegrationProviderId; action: "connect" | "disconnect" } | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refreshStatus = useCallback(async (force = false) => {
    if (inFlightRef.current && !force) return inFlightRef.current;

    const work = (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getCalendarStatus();
        setStatusMap(response);
        writeCachedStatus(user?.id, response);
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

  const startGoogleConnect = useCallback(async (returnTo?: string) => {
    const target = returnTo ?? getCurrentRelativeUrl();
    setPendingAction({ provider: "google", action: "connect" });
    setError(null);
    try {
      sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ provider: "google", returnTo: target }));
      const redirectUrl = await api.getCalendarConnectRedirectUrl({ source: "host-dashboard", returnTo: target });
      window.location.href = redirectUrl;
    } catch (e) {
      opsLogger.warn({
        category: "calendar_integration_failure",
        message: "Failed to start Google connect",
      });
      console.error(e);
      setError("Failed to start Google Calendar connect.");
      setPendingAction(null);
    }
  }, []);

  const disconnect = useCallback(async (provider: IntegrationProviderId) => {
    setPendingAction({ provider, action: "disconnect" });
    setError(null);
    try {
      await api.disconnectCalendar(provider);
      await refreshStatus(true);
      setBanner(`${provider[0].toUpperCase()}${provider.slice(1)} disconnected.`);
    } catch (e) {
      opsLogger.warn({
        category: "calendar_integration_failure",
        message: "Failed to disconnect provider",
        details: { provider },
      });
      console.error(e);
      setError(`Failed to disconnect ${provider}.`);
    } finally {
      setPendingAction(null);
    }
  }, [refreshStatus]);

  useEffect(() => {
    const cached = readCachedStatus(user?.id);
    if (cached) setStatusMap(cached);
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
      const pending = JSON.parse(raw) as { provider?: string; returnTo?: string };
      if (!pending.returnTo) return;
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (current !== pending.returnTo) return;
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      void refreshStatus(true).then(() => {
        setBanner("Integration updated.");
      });
    } catch {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
    }
  }, [location.hash, location.pathname, location.search, refreshStatus, user?.id]);

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

  const getProviderStatus = useCallback((provider: IntegrationProviderId) => {
    return normalizeStatus(statusMap[provider]);
  }, [statusMap]);

  const value = useMemo<IntegrationStateValue>(() => ({
    statusMap,
    loading,
    error,
    banner,
    pendingAction,
    refreshStatus,
    startGoogleConnect,
    disconnect,
    clearBanner: () => setBanner(null),
    getProviderStatus,
  }), [banner, disconnect, error, getProviderStatus, loading, pendingAction, refreshStatus, startGoogleConnect, statusMap]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationState() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error("useIntegrationState must be used within IntegrationProvider");
  return ctx;
}
