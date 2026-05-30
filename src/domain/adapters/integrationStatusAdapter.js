import { asBoolean, asRecord, asString } from "@/domain/contracts/contractGuard";
import { toCanonicalProviderId } from "@/lib/providerIds";
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
    if (normalized === "CALENDAR_NOT_CONNECTED" ||
        normalized === "DISCONNECTED" ||
        normalized === "INACTIVE" ||
        normalized === "NOT_CONNECTED" ||
        normalized === "NOT_SUPPORTED")
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
        const key = toCanonicalProviderId(provider);
        if (typeof raw === "string") {
            out[key] = { status: raw || "NOT_CONNECTED" };
            continue;
        }
        const obj = asRecord(raw, `integrations.providers.${key}`);
        if (!obj)
            continue;
        const status = readStatusString(obj) || "NOT_CONNECTED";
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
function asBool(value) {
    return value === true;
}
function adaptConnectionCalendar(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    const calendarId = asString(obj.calendarId) ?? asString(obj.id) ?? "";
    if (!calendarId)
        return null;
    return {
        calendarId,
        name: asString(obj.name) ?? calendarId,
        isPrimary: asBool(obj.isPrimary) || asBool(obj.primary),
        canRead: obj.canRead === undefined ? true : asBool(obj.canRead),
        canWrite: obj.canWrite === undefined ? true : asBool(obj.canWrite),
        selectedForAvailability: asBool(obj.selectedForAvailability),
        selectedForProjection: asBool(obj.selectedForProjection),
    };
}
function adaptConnection(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    const connectionId = asString(obj.connectionId);
    if (!connectionId)
        return null;
    const status = asString(obj.status) ?? "UNKNOWN";
    const rolesObj = obj.roles ?? {};
    const capabilitiesObj = obj.capabilities ?? {};
    const accountObj = obj.account && typeof obj.account === "object"
        ? obj.account
        : null;
    const hasAvailabilityRole = rolesObj.availabilityEligible !== undefined;
    const hasProjectionRole = rolesObj.projectionEligible !== undefined;
    const hasConferencingRole = rolesObj.conferencingEligible !== undefined;
    const calendars = Array.isArray(obj.calendars)
        ? obj.calendars.map(adaptConnectionCalendar).filter((entry) => Boolean(entry))
        : [];
    const providerCalendarId = asString(obj.externalCalendarId)
        ?? asString(obj.calendarId)
        ?? asString(obj.id)
        ?? calendars[0]?.calendarId
        ?? "";
    return {
        connectionId,
        provider: toCanonicalProviderId(String(obj.provider ?? "")),
        displayName: asString(obj.displayName) ?? asString(obj.name) ?? connectionId,
        email: asString(obj.email) ?? "",
        account: accountObj
            ? {
                type: asString(accountObj.type) ?? undefined,
                supportsNativeTeams: accountObj.supportsNativeTeams === true
                    ? true
                    : accountObj.supportsNativeTeams === false
                        ? false
                        : undefined,
            }
            : null,
        status,
        actionRequired: asBool(obj.actionRequired),
        capabilities: {
            availability: asBool(capabilitiesObj.availability),
            projection: asBool(capabilitiesObj.projection),
            conferencingProvisioning: asBool(capabilitiesObj.conferencingProvisioning),
            webhooks: asBool(capabilitiesObj.webhooks),
        },
        roles: {
            // If roles are omitted by runtime payload, treat connected calendar
            // connections as availability/projection eligible by default.
            availabilityEligible: hasAvailabilityRole ? asBool(rolesObj.availabilityEligible) : status.toUpperCase() === "CONNECTED",
            projectionEligible: hasProjectionRole ? asBool(rolesObj.projectionEligible) : status.toUpperCase() === "CONNECTED",
            conferencingEligible: hasConferencingRole ? asBool(rolesObj.conferencingEligible) : false,
        },
        externalCalendarId: providerCalendarId,
        calendars,
    };
}
export function parseCalendarRuntimeStatus(raw) {
    const root = raw && typeof raw === "object" ? raw : {};
    const obj = root.data && typeof root.data === "object" ? root.data : root;
    const connectionList = Array.isArray(obj.connections) ? obj.connections : [];
    const connections = connectionList.map(adaptConnection).filter((c) => Boolean(c));
    const conferencingObj = obj.conferencing && typeof obj.conferencing === "object"
        ? obj.conferencing
        : {};
    return {
        lifecycleAuthority: asString(obj.lifecycleAuthority) ?? "",
        identity: (obj.identity && typeof obj.identity === "object" ? obj.identity : {}),
        connections,
        conferencing: {
            zoomConnected: asBool(conferencingObj.zoomConnected),
            googleMeetAvailable: asBool(conferencingObj.googleMeetAvailable),
            teamsAvailable: asBool(conferencingObj.teamsAvailable),
        },
    };
}
