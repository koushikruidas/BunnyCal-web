import type { CalendarConnectionRuntime, ConferencingRuntimeState, ProviderCapabilityFlags, ProviderCapabilityMap } from "@/services/types";
import { toConferencingProviderEnum, type ConferencingProviderId } from "@/lib/providerIds";

function normalizeAccountType(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function isPersonalMsaAccount(capability: ProviderCapabilityFlags | null): boolean {
  if (!capability) return false;
  return normalizeAccountType(capability.accountType) === "PERSONAL_MSA";
}

export function isConferencingCapabilityMapPopulated(capabilities: ProviderCapabilityMap): boolean {
  return Object.keys(capabilities).length > 0;
}

export function hasConferencingProviderCapability(
  capabilities: ProviderCapabilityMap,
  provider: ConferencingProviderId,
): boolean {
  return Object.prototype.hasOwnProperty.call(capabilities, toConferencingProviderEnum(provider));
}

export function isNativeTeamsSupported(capabilities: ProviderCapabilityMap): boolean {
  const teamsCapability = capabilities.MICROSOFT_TEAMS ?? null;
  if (teamsCapability && teamsCapability.supportsNativeTeams === false) return false;
  if (isPersonalMsaAccount(teamsCapability)) return false;
  return hasConferencingProviderCapability(capabilities, "microsoft_teams");
}

export function isTeamsHiddenForAccountCapability(capabilities: ProviderCapabilityMap): boolean {
  return isConferencingCapabilityMapPopulated(capabilities) && !isNativeTeamsSupported(capabilities);
}

export function unsupportedCapabilityMessage(): string {
  return "Microsoft Teams meetings are available for Microsoft 365 work or school accounts. Zoom and Google Meet are fully supported with personal Outlook.com accounts.";
}

export function isTeamsAvailableFromRuntime(runtime: ConferencingRuntimeState): boolean {
  return runtime.teamsAvailable === true;
}

export function hasConsumerMicrosoftConnection(connections: CalendarConnectionRuntime[]): boolean {
  return connections.some((connection) =>
    connection.provider === "microsoft" && connection.account?.supportsNativeTeams === false);
}

export function isTeamsDisabledByRuntimeCapability(
  connections: CalendarConnectionRuntime[],
  runtime: ConferencingRuntimeState,
): boolean {
  return !isTeamsAvailableFromRuntime(runtime) || hasConsumerMicrosoftConnection(connections);
}

export function toCapabilityAwareUnsupportedMessage(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const normalized = `${code} ${message}`.toUpperCase();
  if (normalized.includes("UNSUPPORTED_ACCOUNT_CAPABILITY")) return unsupportedCapabilityMessage();
  return message || fallback;
}
