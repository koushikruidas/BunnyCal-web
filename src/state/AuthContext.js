import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import { clearAccessToken, hydrateAccessTokenFromStorage } from "@/lib/apiClient";
import { buildSignInUrl, getCurrentRelativeUrl, saveAuthIntent } from "@/lib/authRedirect";
import { addUnauthorizedListener } from "@/lib/authEvents";
import { getBrowserTimezone } from "@/shared/time/timezone";
import { authDebug, routeDebug } from "@/lib/authDebug";
const AuthContext = createContext(null);
function isProtectedPath(path) {
    return path.startsWith("/dashboard")
        || path.startsWith("/settings")
        || path.startsWith("/availability")
        || path.startsWith("/bookings")
        || path.startsWith("/integrations")
        || path.startsWith("/onboarding/");
}
export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isHydratingAuth, setIsHydratingAuth] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const lastSyncedTimezoneRef = useRef(null);
    const syncTimezoneIfNeeded = useCallback(async (currentUser) => {
        const browserTimezone = getBrowserTimezone();
        if (lastSyncedTimezoneRef.current === browserTimezone && currentUser.timezone === browserTimezone) {
            return;
        }
        lastSyncedTimezoneRef.current = browserTimezone;
        if (currentUser.timezone === browserTimezone) {
            return;
        }
        try {
            const updated = await api.updateMyTimezone(browserTimezone);
            setUser(updated);
        }
        catch (error) {
            console.warn("Failed to sync browser timezone with backend", error);
        }
    }, []);
    const refreshUser = useCallback(async () => {
        authDebug("refreshUser start", { path: getCurrentRelativeUrl() });
        let restored = false;
        try {
            authDebug("/api/me request start");
            const me = await api.getMe();
            authDebug("/api/me request success", { hasUser: Boolean(me?.id) });
            setUser(me);
            restored = true;
            await syncTimezoneIfNeeded(me);
            authDebug("refreshUser success", { userRestored: true });
        }
        catch (e) {
            setUser(null);
            const err = e;
            authDebug("/api/me request failed", { code: err.code, message: err.message });
            authDebug("refreshUser failed, user reset");
        }
        finally {
            setIsHydratingAuth(false);
            setAuthInitialized(true);
            authDebug("refreshUser end", { authInitialized: true, hasUser: restored });
        }
    }, [syncTimezoneIfNeeded]);
    useEffect(() => {
        authDebug("auth hydration start");
        hydrateAccessTokenFromStorage();
        void refreshUser().finally(() => {
            authDebug("auth hydration end");
        });
    }, [refreshUser]);
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible" && user) {
                void refreshUser();
            }
        };
        window.addEventListener("visibilitychange", onVisibilityChange);
        return () => window.removeEventListener("visibilitychange", onVisibilityChange);
    }, [refreshUser, user]);
    useEffect(() => {
        const onUnauthorized = () => {
            routeDebug("unauthorized event received", { path: getCurrentRelativeUrl(), authInitialized });
            clearAccessToken();
            setUser(null);
            setAuthInitialized(true);
            setIsHydratingAuth(false);
            const redirectTarget = getCurrentRelativeUrl();
            if (!isProtectedPath(redirectTarget)) {
                routeDebug("skipping redirect for public path", { redirectTarget });
                return;
            }
            if (redirectTarget.startsWith("/login") || redirectTarget.startsWith("/sign-in")) {
                routeDebug("redirecting to sign-in from auth path", { redirectTarget });
                navigate("/sign-in?mode=APP_LOGIN", { replace: true });
                return;
            }
            saveAuthIntent({ mode: "PROTECTED_ROUTE", returnTo: redirectTarget });
            routeDebug("redirecting to protected sign-in", { redirectTarget });
            navigate(buildSignInUrl({ mode: "PROTECTED_ROUTE", returnTo: redirectTarget }), { replace: true });
        };
        return addUnauthorizedListener(onUnauthorized);
    }, [authInitialized, navigate]);
    const logout = useCallback(async () => {
        setLogoutLoading(true);
        try {
            await api.logout();
        }
        catch (error) {
            console.error("Logout request failed, forcing frontend logout", error);
        }
        finally {
            clearAccessToken();
            setUser(null);
            setLogoutLoading(false);
            navigate("/", { replace: true });
        }
    }, [navigate]);
    const value = useMemo(() => ({ user, loading: isHydratingAuth, isHydratingAuth, authInitialized, logoutLoading, setUser, refreshUser, logout }), [authInitialized, isHydratingAuth, logout, logoutLoading, refreshUser, user]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
