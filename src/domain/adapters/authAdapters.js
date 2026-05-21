import { asArray, asRecord, asString } from "@/domain/contracts/contractGuard";
import { opsLogger } from "@/lib/opsLogger";
function toStringArray(value) {
    return asArray(value).map(asString).filter((v) => Boolean(v));
}
export function adaptSessionContext(raw) {
    const obj = asRecord(raw, "auth.session") ?? {};
    return {
        userId: asString(obj.userId),
        linkedProviders: toStringArray(obj.linkedProviders),
        activeAuthProvider: asString(obj.activeAuthProvider),
        organizationHints: toStringArray(obj.organizationHints),
        authFreshness: asString(obj.authFreshness),
        onboardingState: asString(obj.onboardingState),
    };
}
export function adaptAuthProviders(raw) {
    const obj = asRecord(raw, "auth.providers") ?? {};
    const providerOptions = asArray(obj.providers)
        .map((entry) => {
        const p = asRecord(entry, "auth.providers.provider");
        if (!p)
            return null;
        const provider = asString(p.provider);
        if (!provider) {
            opsLogger.warn({
                category: "api_contract_mismatch",
                message: "Auth provider entry missing provider id",
            });
            return null;
        }
        return {
            provider,
            label: asString(p.label) ?? provider,
            loginUrl: asString(p.loginUrl),
            enabled: p.enabled !== false,
        };
    })
        .filter((v) => Boolean(v));
    return {
        providers: providerOptions,
        linkedIdentityProviders: toStringArray(obj.linkedIdentityProviders),
    };
}
export function adaptLinkProvider(raw) {
    const obj = asRecord(raw, "auth.link") ?? {};
    return {
        authorizationUrl: asString(obj.authorizationUrl),
        expiresAt: asString(obj.expiresAt),
    };
}
