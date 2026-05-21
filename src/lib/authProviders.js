import { api } from "@/services";
import { adaptAuthProviders } from "@/domain/adapters/authAdapters";
function toUpperProvider(provider) {
    return provider.trim().toUpperCase();
}
export async function fetchEnabledAuthProviders() {
    const response = await api.getAuthProviders();
    const adapted = adaptAuthProviders(response);
    return adapted.providers.filter((p) => p.enabled);
}
export function chooseProvider(providers, preferredProvider) {
    if (providers.length === 0)
        return null;
    if (preferredProvider) {
        const preferred = toUpperProvider(preferredProvider);
        const matched = providers.find((p) => toUpperProvider(p.provider) === preferred);
        if (matched)
            return matched;
    }
    return providers[0] ?? null;
}
