import { toConferencingProviderEnum } from "@/lib/providerIds";
function normalizeAccountType(value) {
    return String(value ?? "").trim().toUpperCase();
}
function isPersonalMsaAccount(capability) {
    if (!capability)
        return false;
    return normalizeAccountType(capability.accountType) === "PERSONAL_MSA";
}
export function isConferencingCapabilityMapPopulated(capabilities) {
    return Object.keys(capabilities).length > 0;
}
export function hasConferencingProviderCapability(capabilities, provider) {
    return Object.prototype.hasOwnProperty.call(capabilities, toConferencingProviderEnum(provider));
}
export function isNativeTeamsSupported(capabilities) {
    const teamsCapability = capabilities.MICROSOFT_TEAMS ?? null;
    if (teamsCapability && teamsCapability.supportsNativeTeams === false)
        return false;
    if (isPersonalMsaAccount(teamsCapability))
        return false;
    return hasConferencingProviderCapability(capabilities, "microsoft_teams");
}
export function isTeamsHiddenForAccountCapability(capabilities) {
    return isConferencingCapabilityMapPopulated(capabilities) && !isNativeTeamsSupported(capabilities);
}
export function unsupportedCapabilityMessage() {
    return "Microsoft Teams meetings are available for Microsoft 365 work or school accounts. Zoom and Google Meet are fully supported with personal Outlook.com accounts.";
}
export function isTeamsAvailableFromRuntime(runtime) {
    return runtime.teamsAvailable === true;
}
export function hasConsumerMicrosoftConnection(connections) {
    return connections.some((connection) => connection.provider === "microsoft" && connection.account?.supportsNativeTeams === false);
}
export function isTeamsDisabledByRuntimeCapability(connections, runtime) {
    return !isTeamsAvailableFromRuntime(runtime) || hasConsumerMicrosoftConnection(connections);
}
export function toCapabilityAwareUnsupportedMessage(error, fallback) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code ?? "") : "";
    const message = typeof error === "object" && error && "message" in error ? String(error.message ?? "") : "";
    const normalized = `${code} ${message}`.toUpperCase();
    if (normalized.includes("UNSUPPORTED_ACCOUNT_CAPABILITY"))
        return unsupportedCapabilityMessage();
    return message || fallback;
}
