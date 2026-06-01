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
import { redirectToExternal } from "@/lib/redirectSafety";
import "./login.css";

export function LoginPage() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const brandHref = user ? "/dashboard" : "/";
  const authIntent = getIntentFromSearch(location.search) ?? peekAuthIntent() ?? { mode: "APP_LOGIN" as const };
  const [providers, setProviders] = useState<AuthProviderOptionView[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [bunnyCurious, setBunnyCurious] = useState(false);

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
      redirectToExternal(oauthUrl.toString(), api.baseUrl, "href");
    } catch (error) {
      console.error("Failed to start provider sign-in", error);
      setProvidersError("Unable to start sign-in right now. Please try again.");
    }
  };

  if (!loading && user) {
    return <Navigate to={resolvePostLoginPath(authIntent)} replace />;
  }

  return (
    <div className="login-page">
      <main className="signin">
        <section className="stage" aria-hidden="true">
          <Link className="stage-brand" to={brandHref}>
            <span className="brand-mark"><BunnyMark size={45} /></span>
            <BrandWordmark className="onb-brand-name" style={{ fontFamily: "var(--sans)", fontWeight: 600 }} />
          </Link>
          <div className="chip-float chip-1"><span className="cdot lilac" />Tue · 2:00 PM</div>
          <div className="chip-float chip-2"><span className="cdot sage" />Confirmed</div>
          <div className="chip-float chip-3"><span className="cdot peach" />3 slots free</div>
          <div className="stage-scene">
            <div className={`bunny-bob${bunnyCurious ? " curious" : ""}`}>
              <div className="bunny-shadow" />
              <div className="bunny">
                <div className="ear left"><span className="inner" /></div>
                <div className="ear right"><span className="inner" /></div>
                <div className="body"><span className="belly" /></div>
                <div className="paw left" />
                <div className="paw right" />
                <div className="head">
                  <span className="cheek left" />
                  <span className="cheek right" />
                  <span className="eye left" />
                  <span className="eye right" />
                  <span className="nose" />
                  <span className="mouth" />
                  <span className="whiskers">
                    <span className="wl1" /><span className="wl2" />
                    <span className="wr1" /><span className="wr2" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="stage-caption">
            <span className="line"><span className="dot" />Your meetings, always calm.</span>
            <h2>Hop in. Your schedule <em>has been waiting.</em></h2>
          </div>
        </section>
        <section className="panel">
          <div className="panel-inner">
            <span className="eyebrow">Sign in</span>
            <h1>Welcome{"\u00A0"}<em>amigo.</em></h1>
            <p className="sub">Manage your booking links and meetings. Pick how you&apos;d like to continue.</p>

            <div className="auth-stack">
              <button
                className="auth-btn primary"
                type="button"
                onMouseEnter={() => setBunnyCurious(true)}
                onMouseLeave={() => setBunnyCurious(false)}
                onFocus={() => setBunnyCurious(true)}
                onBlur={() => setBunnyCurious(false)}
                onClick={() => void handleProviderConnect(primaryProvider)}
                disabled={providersLoading || !primaryProvider}
              >
                <span className="glyph">
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </span>
                <span className="label">{providersLoading ? "Loading sign-in options..." : `Continue with ${primaryProvider?.displayName ?? "provider"}`}</span>
                <span className="arrow">→</span>
              </button>
              {providers.filter((provider) => provider.providerId !== primaryProvider?.providerId).map((provider) => (
                <button
                  key={provider.providerId}
                  className="auth-btn secondary"
                  type="button"
                  onMouseEnter={() => setBunnyCurious(true)}
                  onMouseLeave={() => setBunnyCurious(false)}
                  onFocus={() => setBunnyCurious(true)}
                  onBlur={() => setBunnyCurious(false)}
                  onClick={() => void handleProviderConnect(provider)}
                >
                  <span className="glyph">
                    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
                      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                    </svg>
                  </span>
                  <span className="label">Continue with {provider.displayName}</span>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
            {providersError && <p className="providers-error">{providersError}</p>}
            <div className="nopass">
              <span>No passwords here. BunnyCal signs you in with your existing account provider.</span>
            </div>
            <p className="panel-foot">
              By continuing you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
