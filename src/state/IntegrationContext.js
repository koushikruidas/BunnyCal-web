import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/services";
import { getCurrentRelativeUrl } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { oauthDebug } from "@/lib/authDebug";
const OAUTH_PENDING_KEY = "integration-oauth-pending";
const STATUS_CACHE_KEY = "integration-status-cache";
const IntegrationContext = createContext(null);
function readCachedStatus(userId) {
    if (!userId)
        return null;
    try {
        const raw = localStorage.getItem(`${STATUS_CACHE_KEY}:${userId}`);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function writeCachedStatus(userId, status) {
    if (!userId)
        return;
    localStorage.setItem(`${STATUS_CACHE_KEY}:${userId}`, JSON.stringify(status));
}
function normalizeStatus(status) {
    const normalized = (status ?? "").toLowerCase();
    if (normalized.includes("sync"))
        return "syncing";
    if (normalized.includes("error") || normalized.includes("fail"))
        return "failed";
    if (normalized.includes("active") || normalized.includes("connected"))
        return "connected";
    return "disconnected";
}
export function IntegrationProvider({ children }) {
    const location = useLocation();
    const { user } = useAuth();
    const [statusMap, setStatusMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [banner, setBanner] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const inFlightRef = useRef(null);
    const refreshStatus = useCallback(async (force = false) => {
        if (inFlightRef.current && !force)
            return inFlightRef.current;
        const work = (async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.getCalendarStatus();
                setStatusMap(response);
                writeCachedStatus(user?.id, response);
            }
            catch (e) {
                console.error(e);
                setError("Unable to load integration status.");
            }
            finally {
                setLoading(false);
                inFlightRef.current = null;
            }
        })();
        inFlightRef.current = work;
        return work;
    }, [user?.id]);
    const startGoogleConnect = useCallback(async (returnTo) => {
        const target = returnTo ?? getCurrentRelativeUrl();
        setPendingAction({ provider: "google", action: "connect" });
        setError(null);
        try {
            sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ provider: "google", returnTo: target }));
            const redirectUrl = await api.getCalendarConnectRedirectUrl({ source: "host-dashboard", returnTo: target });
            window.location.href = redirectUrl;
        }
        catch (e) {
            console.error(e);
            setError("Failed to start Google Calendar connect.");
            setPendingAction(null);
        }
    }, []);
    const disconnect = useCallback(async (provider) => {
        setPendingAction({ provider, action: "disconnect" });
        setError(null);
        try {
            await api.disconnectCalendar(provider);
            await refreshStatus(true);
            setBanner(`${provider[0].toUpperCase()}${provider.slice(1)} disconnected.`);
        }
        catch (e) {
            console.error(e);
            setError(`Failed to disconnect ${provider}.`);
        }
        finally {
            setPendingAction(null);
        }
    }, [refreshStatus]);
    useEffect(() => {
        const cached = readCachedStatus(user?.id);
        if (cached)
            setStatusMap(cached);
        if (user?.id) {
            void refreshStatus(true);
        }
    }, [refreshStatus, user?.id]);
    useEffect(() => {
        if (!user?.id)
            return;
        const onFocus = () => void refreshStatus();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [refreshStatus, user?.id]);
    useEffect(() => {
        if (!user?.id)
            return;
        const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
        if (!raw)
            return;
        try {
            const pending = JSON.parse(raw);
            if (!pending.returnTo)
                return;
            const current = `${location.pathname}${location.search}${location.hash}`;
            if (current !== pending.returnTo)
                return;
            sessionStorage.removeItem(OAUTH_PENDING_KEY);
            void refreshStatus(true).then(() => {
                setBanner("Integration updated.");
            });
        }
        catch {
            sessionStorage.removeItem(OAUTH_PENDING_KEY);
        }
    }, [location.hash, location.pathname, location.search, refreshStatus, user?.id]);
    useEffect(() => {
        if (!user?.id)
            return;
        const params = new URLSearchParams(location.search);
        const integrationSuccess = params.get("integrationSuccess");
        if (!integrationSuccess)
            return;
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
    const getProviderStatus = useCallback((provider) => {
        return normalizeStatus(statusMap[provider]);
    }, [statusMap]);
    const value = useMemo(() => ({
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
    return _jsx(IntegrationContext.Provider, { value: value, children: children });
}
export function useIntegrationState() {
    const ctx = useContext(IntegrationContext);
    if (!ctx)
        throw new Error("useIntegrationState must be used within IntegrationProvider");
    return ctx;
}
