import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import { clearAccessToken } from "@/lib/apiClient";
import { buildSignInUrl, getCurrentRelativeUrl, saveAuthIntent } from "@/lib/authRedirect";
import { addUnauthorizedListener } from "@/lib/authEvents";
import { getBrowserTimezone } from "@/shared/time/timezone";
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
    const [loading, setLoading] = useState(true);
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
        try {
            const me = await api.getMe();
            setUser(me);
            await syncTimezoneIfNeeded(me);
        }
        catch {
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }, [syncTimezoneIfNeeded]);
    useEffect(() => {
        refreshUser();
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
            clearAccessToken();
            setUser(null);
            const redirectTarget = getCurrentRelativeUrl();
            if (!isProtectedPath(redirectTarget)) {
                return;
            }
            if (redirectTarget.startsWith("/login") || redirectTarget.startsWith("/sign-in")) {
                navigate("/sign-in?mode=APP_LOGIN", { replace: true });
                return;
            }
            saveAuthIntent({ mode: "PROTECTED_ROUTE", returnTo: redirectTarget });
            navigate(buildSignInUrl({ mode: "PROTECTED_ROUTE", returnTo: redirectTarget }), { replace: true });
        };
        return addUnauthorizedListener(onUnauthorized);
    }, [navigate]);
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
    const value = useMemo(() => ({ user, loading, logoutLoading, setUser, refreshUser, logout }), [loading, logout, logoutLoading, refreshUser, user]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
