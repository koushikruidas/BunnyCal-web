import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/services";
import { providerLabel } from "@/components/integrations/providerUi";
import { ProviderStatusRow } from "@/components/integrations/ProviderStatusRow";
export function DashboardLinkedAccountsSection() {
    const [session, setSession] = useState(null);
    const [providers, setProviders] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingProvider, setPendingProvider] = useState(null);
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
                if (cancelled)
                    return;
                setSession(sessionData ?? null);
                setProviders(providerData ?? null);
            }
            catch (e) {
                console.error(e);
                if (!cancelled)
                    setError("Unable to load linked account state.");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, []);
    const linkedSet = useMemo(() => new Set((session?.linkedProviders ?? []).map((p) => p.toUpperCase())), [session?.linkedProviders]);
    const startLink = async (provider) => {
        setPendingProvider(provider);
        setError(null);
        try {
            const result = await api.linkProvider(provider.toLowerCase());
            if (result?.authorizationUrl) {
                window.location.href = result.authorizationUrl;
            }
        }
        catch (e) {
            console.error(e);
            setError(`Unable to start ${providerLabel(provider)} linking.`);
        }
        finally {
            setPendingProvider(null);
        }
    };
    const options = providers?.providers ?? [];
    return (_jsxs("div", { className: "dash-section", children: [_jsx("div", { className: "dash-section-head", children: _jsxs("div", { children: [_jsxs("h2", { children: ["Linked ", _jsx("em", { children: "accounts" })] }), _jsx("div", { className: "sub", children: "Identity confidence for sign-in and provider access." })] }) }), error && _jsx("div", { className: "dash-alert error", children: error }), _jsxs("div", { className: "panel", style: { marginBottom: 16 }, children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Identity session" }), _jsx("div", { className: "sub", children: "Current auth source and linked-provider continuity." })] }) }), loading ? (_jsx("div", { className: "dash-skel", style: { height: 80 } })) : (_jsxs("div", { style: { display: "grid", gap: 10 }, children: [_jsxs("div", { style: { fontSize: 14, color: "var(--plum-700)" }, children: ["Active provider: ", _jsx("strong", { children: session?.activeAuthProvider ? providerLabel(session.activeAuthProvider) : "Not reported" })] }), _jsxs("div", { style: { fontSize: 13, color: "var(--plum-500)" }, children: ["Onboarding state: ", session?.onboardingState ?? "READY"] }), (session?.organizationHints?.length ?? 0) > 0 && (_jsxs("div", { style: { fontSize: 13, color: "var(--plum-500)" }, children: ["Workspace hints: ", session?.organizationHints?.join(" · ")] }))] }))] }), _jsxs("div", { className: "panel", children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Provider identities" }), _jsx("div", { className: "sub", children: "Link providers for safe continuity across scheduling surfaces." })] }) }), loading ? (_jsx("div", { style: { display: "grid", gap: 10 }, children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 56 } }, i)) })) : options.length === 0 ? (_jsxs("div", { className: "dash-empty", style: { padding: "12px 0" }, children: [_jsx("h3", { children: "No providers returned" }), _jsx("p", { children: "Auth provider options were not returned by backend contracts." })] })) : (_jsx("div", { style: { display: "grid", gap: 10 }, children: options.map((opt) => {
                            const provider = (opt.provider ?? "UNKNOWN").toUpperCase();
                            const linked = linkedSet.has(provider);
                            const busy = pendingProvider === provider;
                            return (_jsx(ProviderStatusRow, { iconText: (opt.label ?? providerLabel(provider)).slice(0, 1), name: opt.label ?? providerLabel(provider), subtitle: linked ? "Linked for sign-in continuity" : "Not linked yet", meta: opt.enabled ? "Available" : "Disabled by policy", status: linked ? "Linked" : undefined, statusClass: "ok", action: linked ? null : (_jsx("button", { className: "dash-btn-primary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 9 }, onClick: () => startLink(provider), disabled: !opt.enabled || busy, children: busy ? "Linking..." : "Link account" })) }, provider));
                        }) }))] })] }));
}
