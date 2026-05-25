import { Link, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getIntentFromSearch, peekAuthIntent, resolvePostLoginPath, saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { fetchEnabledAuthProviders, chooseProvider } from "@/lib/authProviders";
import type { AuthProviderOptionView } from "@/domain/adapters/authAdapters";
import { api } from "@/services";
import { adaptLinkProvider } from "@/domain/adapters/authAdapters";

export function LoginPage() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const brandHref = user ? "/dashboard" : "/";
  const authIntent = getIntentFromSearch(location.search) ?? peekAuthIntent() ?? { mode: "APP_LOGIN" as const };
  const [providers, setProviders] = useState<AuthProviderOptionView[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const next = await fetchEnabledAuthProviders();
        if (!alive) return;
        setProviders(next);
      } catch (error) {
        console.error("Failed to load auth providers", error);
        if (!alive) return;
        setProvidersError("Sign-in options are temporarily unavailable.");
      } finally {
        if (alive) setProvidersLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const primaryProvider = useMemo(
    () => chooseProvider(providers, authIntent.mode === "INTEGRATION" ? authIntent.provider : undefined),
    [authIntent, providers],
  );

  const handleProviderConnect = async (provider: AuthProviderOptionView | null) => {
    if (!provider) return;
    try {
      saveAuthIntent(authIntent);
      let loginUrl: string | null = provider.authorizationPath
        ? new URL(provider.authorizationPath, api.baseUrl).toString()
        : null;
      if (!loginUrl) {
        const linked = await api.linkProvider(provider.providerId);
        loginUrl = adaptLinkProvider(linked).authorizationUrl ?? null;
      }
      if (!loginUrl) {
        setProvidersError("Provider sign-in is temporarily unavailable.");
        return;
      }
      const oauthUrl = new URL(loginUrl, window.location.origin);
      if (authIntent.mode === "INTEGRATION" || authIntent.mode === "PROTECTED_ROUTE") {
        oauthUrl.searchParams.set("redirect", authIntent.returnTo);
      }
      window.location.href = oauthUrl.toString();
    } catch (error) {
      console.error("Failed to start provider sign-in", error);
      setProvidersError("Unable to start sign-in right now. Please try again.");
    }
  };

  if (!loading && user) {
    return <Navigate to={resolvePostLoginPath(authIntent)} replace />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "40px 20px",
      background: [
        "radial-gradient(60% 40% at 20% 10%, #E2D5F2 0%, transparent 60%)",
        "radial-gradient(50% 40% at 80% 90%, #FBE3CF 0%, transparent 60%)",
        "#FBF7F2",
      ].join(", "),
      fontFamily: '"Geist", "Inter", system-ui, sans-serif',
      position: "relative" as const,
    }}>
      {/* grain overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.18  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        opacity: 0.35,
        mixBlendMode: "multiply" as const,
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 440,
        background: [
          "radial-gradient(60% 60% at 0% 0%, #E2D5F2 0%, transparent 60%)",
          "#FFFDFA",
        ].join(", "),
        border: "1px solid rgba(31, 21, 48, 0.09)",
        borderRadius: 28,
        padding: "48px 44px",
        boxShadow: "0 4px 24px rgba(31, 21, 48, 0.09)",
      }}>
        {/* Brand mark */}
        <Link to={brandHref} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 40, textDecoration: "none", width: "fit-content" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(150deg, #E2D5F2, #FBE3CF)",
            border: "1px solid rgba(31, 21, 48, 0.09)",
            display: "grid", placeItems: "center",
          }}>
            <BunnyMark size={20} />
          </div>
          <BrandWordmark style={{ fontFamily: '"Geist", sans-serif', fontWeight: 600, fontSize: 22 }} />
        </Link>

        <h1 style={{
          fontFamily: '"Newsreader", "Georgia", serif',
          fontSize: "clamp(28px, 4vw, 36px)",
          fontWeight: 400,
          letterSpacing: "-0.025em",
          lineHeight: 1.06,
          color: "#1F1530",
          margin: "0 0 8px",
        }}>
          Welcome <em style={{ fontStyle: "italic", color: "#5E4E99" }}>back.</em>
        </h1>
        <p style={{ color: "#5E4E99", fontSize: 15, lineHeight: 1.5, margin: "0 0 32px" }}>
          Sign in to manage your booking links and meetings.
        </p>

        <button
          onClick={() => void handleProviderConnect(primaryProvider)}
          disabled={providersLoading || !primaryProvider}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 20px",
            background: "#1F1530",
            color: "#FFFDFA",
            border: "1px solid #1F1530",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background .15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#3D2F7A"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F1530"; }}
        >
          {providersLoading ? "Loading sign-in options..." : `Continue with ${primaryProvider?.displayName ?? "provider"}`}
        </button>
        {providersError && <p style={{ color: "#8f4a67", fontSize: 13, margin: "12px 0 0" }}>{providersError}</p>}

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "20px 0",
          color: "#9E8FC7", fontSize: 13,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(31, 21, 48, 0.09)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "rgba(31, 21, 48, 0.09)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {providers.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {providers
                .filter((provider) => provider.providerId !== primaryProvider?.providerId)
                .map((provider) => (
                  <button
                    key={provider.providerId}
                    onClick={() => void handleProviderConnect(provider)}
                    style={{
                      padding: "11px 14px",
                      background: "#FFFDFA",
                      color: "#1F1530",
                      border: "1px solid rgba(31, 21, 48, 0.14)",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    Continue with {provider.displayName}
                  </button>
                ))}
            </div>
          )}
          <input
            placeholder="Email"
            type="email"
            style={{
              padding: "13px 16px",
              background: "#FFFDFA",
              border: "1px solid rgba(31, 21, 48, 0.09)",
              borderRadius: 12,
              fontSize: 15,
              color: "#1F1530",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
              fontFamily: "inherit",
            }}
          />
          <input
            placeholder="Password"
            type="password"
            style={{
              padding: "13px 16px",
              background: "#FFFDFA",
              border: "1px solid rgba(31, 21, 48, 0.09)",
              borderRadius: 12,
              fontSize: 15,
              color: "#1F1530",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
              fontFamily: "inherit",
            }}
          />
          <button style={{
            padding: "13px 20px",
            background: "#FFFDFA",
            color: "#1F1530",
            border: "1px solid rgba(31, 21, 48, 0.18)",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            width: "100%",
            fontFamily: "inherit",
          }}>
            Sign in
          </button>
        </div>

        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid rgba(31, 21, 48, 0.09)",
          display: "flex", alignItems: "center", gap: 7,
          color: "#7A6BB0", fontSize: 12.5,
          fontFamily: '"Geist Mono", "Menlo", monospace',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#BFCDB9", flexShrink: 0 }} />
          Your meetings, always calm.
        </div>
      </div>
    </div>
  );
}
