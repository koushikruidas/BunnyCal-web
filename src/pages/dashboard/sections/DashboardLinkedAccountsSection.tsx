import { useEffect, useMemo, useState } from "react";
import { api } from "@/services";
import type { AuthOnboardingResponse, SessionContextResponse } from "@/services/types";
import { providerLabel } from "@/components/integrations/providerUi";
import { ProviderStatusRow } from "@/components/integrations/ProviderStatusRow";

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
        window.location.href = result.authorizationUrl;
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
          <h2>Linked <em>accounts</em></h2>
          <div className="sub">Identity confidence for sign-in and provider access.</div>
        </div>
      </div>

      {error && <div className="dash-alert error">{error}</div>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="h">
          <div>
            <h3>Identity session</h3>
            <div className="sub">Current auth source and linked-provider continuity.</div>
          </div>
        </div>
        {loading ? (
          <div className="dash-skel" style={{ height: 80 }} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 14, color: "var(--plum-700)" }}>
              Active provider: <strong>{session?.activeAuthProvider ? providerLabel(session.activeAuthProvider) : "Not reported"}</strong>
            </div>
            <div style={{ fontSize: 13, color: "var(--plum-500)" }}>
              Onboarding state: {session?.onboardingState ?? "READY"}
            </div>
            {(session?.organizationHints?.length ?? 0) > 0 && (
              <div style={{ fontSize: 13, color: "var(--plum-500)" }}>
                Workspace hints: {session?.organizationHints?.join(" · ")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="h">
          <div>
            <h3>Provider identities</h3>
            <div className="sub">Link providers for safe continuity across scheduling surfaces.</div>
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
              const provider = (opt.provider ?? "UNKNOWN").toUpperCase();
              const linked = linkedSet.has(provider);
              const busy = pendingProvider === provider;
              return (
                <ProviderStatusRow
                  key={provider}
                  iconText={(opt.label ?? providerLabel(provider)).slice(0, 1)}
                  name={opt.label ?? providerLabel(provider)}
                  subtitle={linked ? "Linked for sign-in continuity" : "Not linked yet"}
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
