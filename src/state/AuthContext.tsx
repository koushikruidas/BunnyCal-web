import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { clearAccessToken } from "@/lib/apiClient";
import { buildSignInUrl, getCurrentRelativeUrl, saveAuthIntent } from "@/lib/authRedirect";
import type { UserDto } from "@/services/types";
import { addUnauthorizedListener } from "@/lib/authEvents";
import { getBrowserTimezone } from "@/shared/time/timezone";
import { authDebug, routeDebug } from "@/lib/authDebug";

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  isHydratingAuth: boolean;
  authInitialized: boolean;
  logoutLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserDto | null>>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export const ME_QUERY_KEY = ["me"] as const;

export function getMeQueryOptions() {
  return {
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      authDebug("/api/me request start");
      const me = await api.getMe();
      authDebug("/api/me request success", { hasUser: Boolean(me?.id) });
      return me;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false as const,
    retry: false as const,
  };
}

function isProtectedPath(path: string) {
  return path.startsWith("/dashboard")
    || path.startsWith("/settings")
    || path.startsWith("/availability")
    || path.startsWith("/bookings")
    || path.startsWith("/integrations")
    || path.startsWith("/onboarding/")
    || path.startsWith("/invitations/");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastSyncedTimezoneRef = useRef<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const meQuery = useQuery(getMeQueryOptions());

  const user = meQuery.data ?? null;
  const loading = meQuery.isPending && !meQuery.data;
  const isHydratingAuth = loading;
  const authInitialized = meQuery.status !== "pending";

  const setUser = useCallback<React.Dispatch<React.SetStateAction<UserDto | null>>>((next) => {
    queryClient.setQueryData<UserDto | null>(["me"], (prev) => {
      const resolved = typeof next === "function" ? next(prev ?? null) : next;
      return resolved;
    });
  }, [queryClient]);

  const syncTimezoneIfNeeded = useCallback(async (currentUser: UserDto) => {
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
      // Merge so optional fields the timezone endpoint may omit (e.g. profileImage) are preserved.
      setUser((prev) => ({ ...((prev ?? {}) as UserDto), ...updated }));
    } catch (error) {
      console.warn("Failed to sync browser timezone with backend", error);
    }
  }, [setUser]);

  const refreshUser = useCallback(async () => {
    authDebug("refreshUser start", { path: getCurrentRelativeUrl() });
    const result = await meQuery.refetch();
    if (result.data) {
      await syncTimezoneIfNeeded(result.data);
    }
    authDebug("refreshUser success", { userRestored: Boolean(result.data) });
  }, [meQuery, syncTimezoneIfNeeded]);

  useEffect(() => {
    if (!meQuery.data || !meQuery.isStale || meQuery.isFetching) return;
    void meQuery.refetch();
  }, [location.hash, location.pathname, location.search, meQuery.data, meQuery.isFetching, meQuery.isStale, meQuery.refetch]);

  useEffect(() => {
    const onUnauthorized = () => {
      routeDebug("unauthorized event received", { path: getCurrentRelativeUrl(), authInitialized });
      clearAccessToken();
      // Clear all cached queries so no authenticated data lingers after session expiry.
      queryClient.clear();
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
  }, [authInitialized, navigate, queryClient]);

  const logout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout request failed, forcing frontend logout", error);
    } finally {
      clearAccessToken();
      queryClient.clear();
      setLogoutLoading(false);
      navigate("/", { replace: true });
    }
  }, [navigate, queryClient]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isHydratingAuth,
      authInitialized,
      logoutLoading,
      setUser,
      refreshUser,
      logout,
    }),
    [authInitialized, isHydratingAuth, loading, logout, logoutLoading, refreshUser, setUser, user]
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
