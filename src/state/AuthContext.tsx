import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import { clearAccessToken } from "@/lib/apiClient";
import type { UserDto } from "@/services/types";
import { addUnauthorizedListener } from "@/lib/authEvents";

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  logoutLoading: boolean;
  setUser: (user: UserDto | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
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
    } catch (error) {
      console.error("Logout request failed, forcing frontend logout", error);
    } finally {
      clearAccessToken();
      setUser(null);
      setLogoutLoading(false);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const value = useMemo(
    () => ({ user, loading, logoutLoading, setUser, refreshUser, logout }),
    [loading, logout, logoutLoading, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
