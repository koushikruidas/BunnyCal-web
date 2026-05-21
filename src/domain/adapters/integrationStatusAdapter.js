import { asBoolean, asRecord, asString } from "@/domain/contracts/contractGuard";
const STATUS_FIELDS = ["status", "state", "connectionStatus", "integrationStatus"];
const BOOLEAN_CONNECTED_FIELDS = ["connected", "isConnected", "active", "isActive"];
const CONNECTED_HINT_FIELDS = [
    "calendars",
    "accountEmail",
    "accountId",
    "providerAccountId",
    "externalAccountId",
    "connectionId",
    "lastSyncedAt",
    "scopes",
];
export function readStatusString(entry) {
    if (!entry)
        return "";
    if (typeof entry === "string")
        return entry;
    const obj = asRecord(entry, "integrations.status.entry");
    if (!obj)
        return "";
    for (const field of STATUS_FIELDS) {
        const value = asString(obj[field]);
        if (value)
            return value;
    }
    for (const field of BOOLEAN_CONNECTED_FIELDS) {
        const value = asBoolean(obj[field]);
        if (value !== null)
            return value ? "CONNECTED" : "DISCONNECTED";
    }
    if (CONNECTED_HINT_FIELDS.some((field) => obj[field] !== undefined && obj[field] !== null))
        return "CONNECTED";
    return "";
}
export function normalizeIntegrationUiStatus(status) {
    const normalized = (status ?? "").trim().toUpperCase();
    if (!normalized)
        return "disconnected";
    if (normalized === "CONNECTED" || normalized === "ACTIVE" || normalized === "AVAILABLE")
        return "connected";
    if (normalized === "CALENDAR_SYNC_IN_PROGRESS" || normalized === "SYNCING" || normalized === "STALE_CALENDAR_DATA")
        return "syncing";
    if (normalized === "CALENDAR_NOT_CONNECTED" || normalized === "DISCONNECTED" || normalized === "INACTIVE")
        return "disconnected";
    if (normalized.includes("ERROR") || normalized.includes("FAIL"))
        return "failed";
    return "disconnected";
}
function coerceProviderAwareMap(input) {
    if (!input || typeof input !== "object")
        return {};
    const out = {};
    for (const [provider, raw] of Object.entries(input)) {
        const key = provider.toLowerCase();
        if (typeof raw === "string") {
            out[key] = { status: raw };
            continue;
        }
        const obj = asRecord(raw, `integrations.providers.${key}`);
        if (!obj)
            continue;
        const status = readStatusString(obj);
        const calendars = Array.isArray(obj.calendars) ? obj.calendars : undefined;
        out[key] = { ...obj, status, ...(calendars ? { calendars } : {}) };
    }
    return out;
}
function coerceCapabilityMap(input) {
    if (!input || typeof input !== "object")
        return {};
    const out = {};
    for (const [providerEnum, raw] of Object.entries(input)) {
        if (raw && typeof raw === "object")
            out[providerEnum.toUpperCase()] = raw;
    }
    return out;
}
export function parseStatusEnvelope(raw, kind) {
    if (!raw || typeof raw !== "object")
        return { providers: {}, capabilities: {} };
    const obj = raw;
    const providersField = kind === "calendar" ? obj.calendar : obj.providers;
    const capabilitiesRoot = obj.capabilities && typeof obj.capabilities === "object"
        ? obj.capabilities
        : null;
    const capabilitiesField = capabilitiesRoot
        ? (kind === "calendar" ? capabilitiesRoot.calendar : capabilitiesRoot.conferencing)
        : null;
    if (providersField !== undefined || capabilitiesField !== undefined) {
        return {
            providers: coerceProviderAwareMap(providersField),
            capabilities: coerceCapabilityMap(capabilitiesField),
        };
    }
    return { providers: coerceProviderAwareMap(raw), capabilities: {} };
}
export function flattenStatusMap(...maps) {
    const flat = {};
    for (const map of maps) {
        for (const [provider, entry] of Object.entries(map)) {
            flat[provider] = readStatusString(entry);
        }
    }
    return flat;
}
