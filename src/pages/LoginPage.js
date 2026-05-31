import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getIntentFromSearch, peekAuthIntent, resolvePostLoginPath, saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import { fetchEnabledAuthProviders, chooseProvider } from "@/lib/authProviders";
import { api } from "@/services";
import { adaptLinkProvider } from "@/domain/adapters/authAdapters";
import "./login.css";
export function LoginPage() {
    const location = useLocation();
    const { user, loading } = useAuth();
    const brandHref = user ? "/dashboard" : "/";
    const authIntent = getIntentFromSearch(location.search) ?? peekAuthIntent() ?? { mode: "APP_LOGIN" };
    const [providers, setProviders] = useState([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    const [providersError, setProvidersError] = useState(null);
    const [bunnyCurious, setBunnyCurious] = useState(false);
    useEffect(() => {
        let alive = true;
        const load = async () => {
            setProvidersLoading(true);
            setProvidersError(null);
            try {
                const next = await fetchEnabledAuthProviders();
                if (!alive)
                    return;
                setProviders(next);
            }
            catch (error) {
                console.error("Failed to load auth providers", error);
                if (!alive)
                    return;
                setProvidersError("Sign-in options are temporarily unavailable.");
            }
            finally {
                if (alive)
                    setProvidersLoading(false);
            }
        };
        void load();
        return () => {
            alive = false;
        };
    }, []);
    const primaryProvider = useMemo(() => chooseProvider(providers, authIntent.mode === "INTEGRATION" ? authIntent.provider : undefined), [authIntent, providers]);
    const handleProviderConnect = async (provider) => {
        if (!provider)
            return;
        try {
            saveAuthIntent(authIntent);
            let loginUrl = provider.authorizationPath
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
        }
        catch (error) {
            console.error("Failed to start provider sign-in", error);
            setProvidersError("Unable to start sign-in right now. Please try again.");
        }
    };
    if (!loading && user) {
        return _jsx(Navigate, { to: resolvePostLoginPath(authIntent), replace: true });
    }
    return (_jsx("div", { className: "login-page", children: _jsxs("main", { className: "signin", children: [_jsxs("section", { className: "stage", "aria-hidden": "true", children: [_jsxs(Link, { className: "stage-brand", to: brandHref, children: [_jsx("span", { className: "brand-mark", children: _jsx(BunnyMark, { size: 45 }) }), _jsx(BrandWordmark, { className: "onb-brand-name", style: { fontFamily: "var(--sans)", fontWeight: 600 } })] }), _jsxs("div", { className: "chip-float chip-1", children: [_jsx("span", { className: "cdot lilac" }), "Tue \u00B7 2:00 PM"] }), _jsxs("div", { className: "chip-float chip-2", children: [_jsx("span", { className: "cdot sage" }), "Confirmed"] }), _jsxs("div", { className: "chip-float chip-3", children: [_jsx("span", { className: "cdot peach" }), "3 slots free"] }), _jsx("div", { className: "stage-scene", children: _jsxs("div", { className: `bunny-bob${bunnyCurious ? " curious" : ""}`, children: [_jsx("div", { className: "bunny-shadow" }), _jsxs("div", { className: "bunny", children: [_jsx("div", { className: "ear left", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "ear right", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "body", children: _jsx("span", { className: "belly" }) }), _jsx("div", { className: "paw left" }), _jsx("div", { className: "paw right" }), _jsxs("div", { className: "head", children: [_jsx("span", { className: "cheek left" }), _jsx("span", { className: "cheek right" }), _jsx("span", { className: "eye left" }), _jsx("span", { className: "eye right" }), _jsx("span", { className: "nose" }), _jsx("span", { className: "mouth" }), _jsxs("span", { className: "whiskers", children: [_jsx("span", { className: "wl1" }), _jsx("span", { className: "wl2" }), _jsx("span", { className: "wr1" }), _jsx("span", { className: "wr2" })] })] })] })] }) }), _jsxs("div", { className: "stage-caption", children: [_jsxs("span", { className: "line", children: [_jsx("span", { className: "dot" }), "Your meetings, always calm."] }), _jsxs("h2", { children: ["Hop in. Your schedule ", _jsx("em", { children: "has been waiting." })] })] })] }), _jsx("section", { className: "panel", children: _jsxs("div", { className: "panel-inner", children: [_jsx("span", { className: "eyebrow", children: "Sign in" }), _jsxs("h1", { children: ["Welcome", "\u00A0", _jsx("em", { children: "amigo." })] }), _jsx("p", { className: "sub", children: "Manage your booking links and meetings. Pick how you'd like to continue." }), _jsxs("div", { className: "auth-stack", children: [_jsxs("button", { className: "auth-btn primary", type: "button", onMouseEnter: () => setBunnyCurious(true), onMouseLeave: () => setBunnyCurious(false), onFocus: () => setBunnyCurious(true), onBlur: () => setBunnyCurious(false), onClick: () => void handleProviderConnect(primaryProvider), disabled: providersLoading || !primaryProvider, children: [_jsx("span", { className: "glyph", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 48 48", "aria-hidden": "true", children: [_jsx("path", { fill: "#EA4335", d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" }), _jsx("path", { fill: "#4285F4", d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" }), _jsx("path", { fill: "#FBBC05", d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" }), _jsx("path", { fill: "#34A853", d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" })] }) }), _jsx("span", { className: "label", children: providersLoading ? "Loading sign-in options..." : `Continue with ${primaryProvider?.displayName ?? "provider"}` }), _jsx("span", { className: "arrow", children: "\u2192" })] }), providers.filter((provider) => provider.providerId !== primaryProvider?.providerId).map((provider) => (_jsxs("button", { className: "auth-btn secondary", type: "button", onMouseEnter: () => setBunnyCurious(true), onMouseLeave: () => setBunnyCurious(false), onFocus: () => setBunnyCurious(true), onBlur: () => setBunnyCurious(false), onClick: () => void handleProviderConnect(provider), children: [_jsx("span", { className: "glyph", children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 23 23", "aria-hidden": "true", children: [_jsx("rect", { x: "1", y: "1", width: "10", height: "10", fill: "#F25022" }), _jsx("rect", { x: "12", y: "1", width: "10", height: "10", fill: "#7FBA00" }), _jsx("rect", { x: "1", y: "12", width: "10", height: "10", fill: "#00A4EF" }), _jsx("rect", { x: "12", y: "12", width: "10", height: "10", fill: "#FFB900" })] }) }), _jsxs("span", { className: "label", children: ["Continue with ", provider.displayName] }), _jsx("span", { className: "arrow", children: "\u2192" })] }, provider.providerId)))] }), providersError && _jsx("p", { className: "providers-error", children: providersError }), _jsx("div", { className: "nopass", children: _jsx("span", { children: "No passwords here. BunnyCal signs you in with your existing account provider." }) }), _jsxs("p", { className: "panel-foot", children: ["By continuing you agree to our ", _jsx("a", { href: "#terms", children: "Terms" }), " and ", _jsx("a", { href: "#privacy", children: "Privacy Policy" }), "."] })] }) })] }) }));
}
