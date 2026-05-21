import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services";
import { getCurrentRelativeUrl } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { oauthDebug } from "@/lib/authDebug";
import { opsLogger } from "@/lib/opsLogger";
import { flattenStatusMap, normalizeIntegrationUiStatus, parseStatusEnvelope, readStatusString } from "@/domain/adapters/integrationStatusAdapter";
const OAUTH_PENDING_KEY = "integration-oauth-pending";
const STATUS_CACHE_KEY = "integration-status-cache-v2";
const IntegrationContext = createContext(null);
function readCachedStatus(userId) {
    if (!userId)
        return null;
    try {
        const raw = localStorage.getItem(`${STATUS_CACHE_KEY}:${userId}`);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return {
            calendar: parsed.calendar ?? {},
            conferencing: parsed.conferencing ?? {},
            calendarCapabilities: parsed.calendarCapabilities ?? {},
            conferencingCapabilities: parsed.conferencingCapabilities ?? {},
        };
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
export function IntegrationProvider({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [calendarStatus, setCalendarStatus] = useState({});
    const [conferencingStatus, setConferencingStatus] = useState({});
    const [calendarCapabilities, setCalendarCapabilities] = useState({});
    const [conferencingCapabilities, setConferencingCapabilities] = useState({});
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
                const [calendarResult, conferencingResult] = await Promise.allSettled([
                    api.getCalendarProviderStatus(),
                    api.getConferencingStatus(),
                ]);
                let nextCalendar = {};
                let nextCalendarCaps = {};
                if (calendarResult.status === "fulfilled") {
                    const parsed = parseStatusEnvelope(calendarResult.value, "calendar");
                    nextCalendar = parsed.providers;
                    nextCalendarCaps = parsed.capabilities;
                }
                else {
                    // Fall back to legacy flat status map if provider-aware endpoint fails.
                    try {
                        const legacy = await api.getCalendarStatus();
                        nextCalendar = parseStatusEnvelope(legacy, "calendar").providers;
                    }
                    catch (legacyError) {
                        opsLogger.warn({
                            category: "calendar_integration_failure",
                            message: "Failed to load calendar status",
                        });
                        console.error(legacyError);
                    }
                }
                let nextConferencing = {};
                let nextConferencingCaps = {};
                if (conferencingResult.status === "fulfilled") {
                    const parsed = parseStatusEnvelope(conferencingResult.value, "conferencing");
                    nextConferencing = parsed.providers;
                    nextConferencingCaps = parsed.capabilities;
                }
                else {
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
            }
            catch (e) {
                opsLogger.warn({
                    category: "calendar_integration_failure",
                    message: "Failed to refresh integration status",
                });
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
    const startConnect = useCallback(async (kind, provider, returnTo) => {
        const target = returnTo ?? getCurrentRelativeUrl();
        setPendingAction({ kind, provider, action: "connect" });
        setError(null);
        try {
            sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ kind, provider, returnTo: target, startedAt: Date.now() }));
            const redirectUrl = await api.getIntegrationConnectRedirectUrl(kind, provider, { source: "host-dashboard", returnTo: target });
            window.location.href = redirectUrl;
        }
        catch (e) {
            opsLogger.warn({
                category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
                message: `Failed to start ${provider} ${kind} connect`,
            });
            console.error(e);
            setError(`Failed to start ${provider} connect.`);
            setPendingAction(null);
        }
    }, []);
    const startGoogleConnect = useCallback(async (returnTo) => {
        await startConnect("calendar", "google", returnTo);
    }, [startConnect]);
    const disconnectProvider = useCallback(async (kind, provider) => {
        setPendingAction({ kind, provider, action: "disconnect" });
        setError(null);
        try {
            if (kind === "conferencing") {
                await api.disconnectConferencing(provider);
            }
            else {
                await api.disconnectCalendar(provider);
            }
            await refreshStatus(true);
            setBanner(`${provider[0].toUpperCase()}${provider.slice(1)} disconnected.`);
        }
        catch (e) {
            opsLogger.warn({
                category: kind === "conferencing" ? "conferencing_integration_failure" : "calendar_integration_failure",
                message: "Failed to disconnect provider",
                details: { provider, kind },
            });
            console.error(e);
            setError(`Failed to disconnect ${provider}.`);
        }
        finally {
            setPendingAction(null);
        }
    }, [refreshStatus]);
    const disconnect = useCallback(async (provider) => {
        // Legacy callers; infer kind from where the provider currently appears.
        const kind = conferencingStatus[provider] ? "conferencing" : "calendar";
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
        }
        catch {
            sessionStorage.removeItem(OAUTH_PENDING_KEY);
        }
    }, [location.hash, location.pathname, location.search, navigate, refreshStatus, user?.id]);
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
    const statusMap = useMemo(() => flattenStatusMap(calendarStatus, conferencingStatus), [calendarStatus, conferencingStatus]);
    const getCalendarProviderStatusFn = useCallback((provider) => {
        return normalizeIntegrationUiStatus(readStatusString(calendarStatus[provider]));
    }, [calendarStatus]);
    const getConferencingProviderStatusFn = useCallback((provider) => {
        return normalizeIntegrationUiStatus(readStatusString(conferencingStatus[provider]));
    }, [conferencingStatus]);
    const getProviderStatus = useCallback((provider) => {
        // Treat connected in either kind as connected for legacy single-namespace callers.
        const calendar = getCalendarProviderStatusFn(provider);
        if (calendar !== "disconnected")
            return calendar;
        return getConferencingProviderStatusFn(provider);
    }, [getCalendarProviderStatusFn, getConferencingProviderStatusFn]);
    const getProviderCalendars = useCallback((provider) => {
        const entry = calendarStatus[provider];
        if (!entry || typeof entry !== "object")
            return [];
        const list = Array.isArray(entry.calendars) ? entry.calendars : [];
        return list;
    }, [calendarStatus]);
    const getCalendarCapability = useCallback((providerEnum) => {
        return calendarCapabilities[providerEnum.toUpperCase()] ?? null;
    }, [calendarCapabilities]);
    const getConferencingCapability = useCallback((providerEnum) => {
        return conferencingCapabilities[providerEnum.toUpperCase()] ?? null;
    }, [conferencingCapabilities]);
    const hasCalendarCapability = useCallback((providerEnum) => {
        return Object.prototype.hasOwnProperty.call(calendarCapabilities, providerEnum.toUpperCase());
    }, [calendarCapabilities]);
    const hasConferencingCapability = useCallback((providerEnum) => {
        return Object.prototype.hasOwnProperty.call(conferencingCapabilities, providerEnum.toUpperCase());
    }, [conferencingCapabilities]);
    const value = useMemo(() => ({
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
    return _jsx(IntegrationContext.Provider, { value: value, children: children });
}
export function useIntegrationState() {
    const ctx = useContext(IntegrationContext);
    if (!ctx)
        throw new Error("useIntegrationState must be used within IntegrationProvider");
    return ctx;
}
