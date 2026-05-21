import type {
  AuthOnboardingResponse,
  AuthProviderOptionResponse,
  LinkProviderResponse,
  SessionContextResponse,
} from "@/services/types";
import { asArray, asRecord, asString } from "@/domain/contracts/contractGuard";
import { opsLogger } from "@/lib/opsLogger";

export interface SessionContextView {
  userId: string | null;
  linkedProviders: string[];
  activeAuthProvider: string | null;
  organizationHints: string[];
  authFreshness: string | null;
  onboardingState: string | null;
}

export interface AuthProviderOptionView {
  provider: string;
  label: string;
  loginUrl: string | null;
  enabled: boolean;
}

export interface AuthProvidersView {
  providers: AuthProviderOptionView[];
  linkedIdentityProviders: string[];
}

export interface LinkProviderView {
  authorizationUrl: string | null;
  expiresAt: string | null;
}

function toStringArray(value: unknown): string[] {
  return asArray(value).map(asString).filter((v): v is string => Boolean(v));
}

export function adaptSessionContext(raw: SessionContextResponse): SessionContextView {
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

export function adaptAuthProviders(raw: AuthOnboardingResponse): AuthProvidersView {
  const obj = asRecord(raw, "auth.providers") ?? {};
  const providerOptions = asArray(obj.providers)
    .map((entry) => {
      const p = asRecord(entry, "auth.providers.provider") as AuthProviderOptionResponse | null;
      if (!p) return null;
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
      } satisfies AuthProviderOptionView;
    })
    .filter((v): v is AuthProviderOptionView => Boolean(v));

  return {
    providers: providerOptions,
    linkedIdentityProviders: toStringArray(obj.linkedIdentityProviders),
  };
}

export function adaptLinkProvider(raw: LinkProviderResponse): LinkProviderView {
  const obj = asRecord(raw, "auth.link") ?? {};
  return {
    authorizationUrl: asString(obj.authorizationUrl),
    expiresAt: asString(obj.expiresAt),
  };
}

