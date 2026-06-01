import { useEffect, useMemo, useState } from "react";
import { api } from "@/services";
import type { AuthOnboardingResponse, SessionContextResponse } from "@/services/types";
import { providerLabel } from "@/components/integrations/providerUi";
import { ProviderStatusRow } from "@/components/integrations/ProviderStatusRow";
import { redirectToExternal } from "@/lib/redirectSafety";

export function DashboardLinkedAccountsSection() {
  const [session, setSession] = useState<SessionContextResponse | null>(null);
  const [providers, setProviders] = useState<AuthOnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessionData, providerData] = await Promise.all([
          api.getAuthSession(),
          api.getAuthProviders(),
        ]);
        if (cancelled) return;
        setSession(sessionData ?? null);
        setProviders(providerData ?? null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Unable to load linked account state.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedSet = useMemo(() => new Set((session?.linkedProviders ?? []).map((p) => p.toUpperCase())), [session?.linkedProviders]);

  const startLink = async (provider: string) => {
    setPendingProvider(provider);
    setError(null);
    try {
      const result = await api.linkProvider(provider.toLowerCase());
      if (result?.authorizationUrl) {
        redirectToExternal(result.authorizationUrl, api.baseUrl, "href");
      }
    } catch (e) {
      console.error(e);
      setError(`Unable to start ${providerLabel(provider)} linking.`);
    } finally {
      setPendingProvider(null);
    }
  };

  const options = providers?.providers ?? [];

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <div>
          <h2>Sign-in <em>accounts</em></h2>
          <div className="sub">Your sign-in accounts. Not related to scheduling.</div>
        </div>
      </div>

      {error && <div className="dash-alert error">{error}</div>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="h">
          <div>
            <h3>Current session</h3>
            <div className="sub">How you're signed in right now.</div>
          </div>
        </div>
        {loading ? (
          <div className="dash-skel" style={{ height: 80 }} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 14, color: "var(--plum-700)" }}>
              Signed in with: <strong>{session?.activeAuthProvider ? providerLabel(session.activeAuthProvider) : "Not reported"}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="h">
          <div>
            <h3>Sign-in accounts</h3>
            <div className="sub">Add more sign-in options so you're never locked out.</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 56 }} />)}
          </div>
        ) : options.length === 0 ? (
          <div className="dash-empty" style={{ padding: "12px 0" }}>
            <h3>No providers returned</h3>
            <p>Auth provider options were not returned by backend contracts.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {options.map((opt) => {
              const provider = (opt.providerId ?? "UNKNOWN").toUpperCase();
              const linked = linkedSet.has(provider);
              const busy = pendingProvider === provider;
              const name = opt.displayName ?? providerLabel(provider);
              return (
                <ProviderStatusRow
                  key={provider}
                  iconText={name.slice(0, 1)}
                  name={name}
                  subtitle={linked ? "Linked · can sign in" : "Not linked yet"}
                  meta={opt.enabled ? "Available" : "Disabled by policy"}
                  status={linked ? "Linked" : undefined}
                  statusClass="ok"
                  action={linked ? null : (
                    <button
                      className="dash-btn-primary"
                      style={{ fontSize: 11, padding: "5px 12px", borderRadius: 9 }}
                      onClick={() => startLink(provider)}
                      disabled={!opt.enabled || busy}
                    >
                      {busy ? "Linking..." : "Link account"}
                    </button>
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
