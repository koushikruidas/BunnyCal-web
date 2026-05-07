import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import { clearAccessToken } from "@/lib/apiClient";
import { addUnauthorizedListener } from "@/lib/authEvents";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const refreshUser = useCallback(async () => {
        try {
            const me = await api.getMe();
            setUser(me);
        }
        catch {
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);
    useEffect(() => {
        const onUnauthorized = () => {
            clearAccessToken();
            setUser(null);
            navigate("/login", { replace: true });
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
            navigate("/login", { replace: true });
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
