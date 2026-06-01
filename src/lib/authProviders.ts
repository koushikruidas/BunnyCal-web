import { api } from "@/services";
import { adaptAuthProviders, type AuthProviderOptionView } from "@/domain/adapters/authAdapters";

function canonicalProviderId(provider: string) {
  return provider.trim().toLowerCase();
}

export async function fetchEnabledAuthProviders() {
  const response = await api.getAuthProviders();
  const adapted = adaptAuthProviders(response);
  return adapted.providers.filter((p) => p.enabled);
}

export function chooseProvider(
  providers: AuthProviderOptionView[],
  preferredProvider?: string,
): AuthProviderOptionView | null {
  if (providers.length === 0) return null;
  if (preferredProvider) {
    const preferred = canonicalProviderId(preferredProvider);
    const matched = providers.find((p) => canonicalProviderId(p.providerId) === preferred);
    if (matched) return matched;
  }
  return providers[0] ?? null;
}

