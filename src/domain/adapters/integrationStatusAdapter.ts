import type {
  CalendarConnectionRuntime,
  ConferencingRuntimeState,
  IntegrationKind,
  ProviderAwareStatusMap,
  ProviderCalendarSummary,
  ProviderCapabilityFlags,
  ProviderCapabilityMap,
  ProviderStatusEntry,
} from "@/services/types";
import { asBoolean, asRecord, asString } from "@/domain/contracts/contractGuard";
import { toCanonicalProviderId } from "@/lib/providerIds";

export type IntegrationUiStatus = "connected" | "disconnected" | "syncing" | "failed";

const STATUS_FIELDS = ["status", "state", "connectionStatus", "integrationStatus"] as const;
const BOOLEAN_CONNECTED_FIELDS = ["connected", "isConnected", "active", "isActive"] as const;
const CONNECTED_HINT_FIELDS = [
  "calendars",
  "accountEmail",
  "accountId",
  "providerAccountId",
  "externalAccountId",
  "connectionId",
  "lastSyncedAt",
  "scopes",
] as const;

export function readStatusString(entry: ProviderStatusEntry | string | undefined): string {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const obj = asRecord(entry, "integrations.status.entry");
  if (!obj) return "";

  for (const field of STATUS_FIELDS) {
    const value = asString(obj[field]);
    if (value) return value;
  }
  for (const field of BOOLEAN_CONNECTED_FIELDS) {
    const value = asBoolean(obj[field]);
    if (value !== null) return value ? "CONNECTED" : "DISCONNECTED";
  }
  if (CONNECTED_HINT_FIELDS.some((field) => obj[field] !== undefined && obj[field] !== null)) return "CONNECTED";
  return "";
}

export function normalizeIntegrationUiStatus(status?: string): IntegrationUiStatus {
  const normalized = (status ?? "").trim().toUpperCase();
  if (!normalized) return "disconnected";
  if (normalized === "CONNECTED" || normalized === "ACTIVE" || normalized === "AVAILABLE") return "connected";
  if (normalized === "CALENDAR_SYNC_IN_PROGRESS" || normalized === "SYNCING" || normalized === "STALE_CALENDAR_DATA") return "syncing";
  if (
    normalized === "CALENDAR_NOT_CONNECTED" ||
    normalized === "DISCONNECTED" ||
    normalized === "INACTIVE" ||
    normalized === "NOT_CONNECTED" ||
    normalized === "NOT_SUPPORTED"
  ) return "disconnected";
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) return "failed";
  return "disconnected";
}

function coerceProviderAwareMap(input: unknown): ProviderAwareStatusMap {
  if (!input || typeof input !== "object") return {};
  const out: ProviderAwareStatusMap = {};
  for (const [provider, raw] of Object.entries(input as Record<string, unknown>)) {
    const key = toCanonicalProviderId(provider);
    if (typeof raw === "string") {
      out[key] = { status: raw || "NOT_CONNECTED" };
      continue;
    }
    const obj = asRecord(raw, `integrations.providers.${key}`);
    if (!obj) continue;
    const status = readStatusString(obj as ProviderStatusEntry) || "NOT_CONNECTED";
    const calendars = Array.isArray(obj.calendars) ? (obj.calendars as ProviderCalendarSummary[]) : undefined;
    out[key] = { ...obj, status, ...(calendars ? { calendars } : {}) };
  }
  return out;
}

function coerceCapabilityMap(input: unknown): ProviderCapabilityMap {
  if (!input || typeof input !== "object") return {};
  const out: ProviderCapabilityMap = {};
  for (const [providerEnum, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw && typeof raw === "object") out[providerEnum.toUpperCase()] = raw as ProviderCapabilityFlags;
  }
  return out;
}

export function parseStatusEnvelope(
  raw: unknown,
  kind: IntegrationKind,
): { providers: ProviderAwareStatusMap; capabilities: ProviderCapabilityMap } {
  if (!raw || typeof raw !== "object") return { providers: {}, capabilities: {} };
  const obj = raw as Record<string, unknown>;
  const providersField = kind === "calendar" ? obj.calendar : obj.providers;
  const capabilitiesRoot = obj.capabilities && typeof obj.capabilities === "object"
    ? (obj.capabilities as Record<string, unknown>)
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

export function flattenStatusMap(...maps: ProviderAwareStatusMap[]): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const map of maps) {
    for (const [provider, entry] of Object.entries(map)) {
      flat[provider] = readStatusString(entry);
    }
  }
  return flat;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function adaptConnectionCalendar(raw: unknown): {
  calendarId: string;
  name: string;
  isPrimary: boolean;
  canRead: boolean;
  canWrite: boolean;
  selectedForAvailability: boolean;
  selectedForProjection: boolean;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const calendarId = asString(obj.calendarId) ?? asString(obj.id) ?? "";
  if (!calendarId) return null;
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

function adaptConnection(raw: unknown): CalendarConnectionRuntime | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const connectionId = asString(obj.connectionId);
  if (!connectionId) return null;
  const status = asString(obj.status) ?? "UNKNOWN";
  const rolesObj = (obj.roles as Record<string, unknown> | undefined) ?? {};
  const capabilitiesObj = (obj.capabilities as Record<string, unknown> | undefined) ?? {};
  const accountObj = obj.account && typeof obj.account === "object"
    ? (obj.account as Record<string, unknown>)
    : null;
  const hasAvailabilityRole = rolesObj.availabilityEligible !== undefined;
  const hasProjectionRole = rolesObj.projectionEligible !== undefined;
  const hasConferencingRole = rolesObj.conferencingEligible !== undefined;
  const calendars = Array.isArray(obj.calendars)
    ? obj.calendars.map(adaptConnectionCalendar).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [];
  const providerCalendarId =
    asString(obj.externalCalendarId)
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

export function parseCalendarRuntimeStatus(raw: unknown): {
  lifecycleAuthority: string;
  identity: Record<string, unknown>;
  connections: CalendarConnectionRuntime[];
  conferencing: ConferencingRuntimeState;
} {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const obj = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const connectionList = Array.isArray(obj.connections) ? obj.connections : [];
  const connections = connectionList.map(adaptConnection).filter((c): c is CalendarConnectionRuntime => Boolean(c));
  const conferencingObj = obj.conferencing && typeof obj.conferencing === "object"
    ? (obj.conferencing as Record<string, unknown>)
    : {};
  return {
    lifecycleAuthority: asString(obj.lifecycleAuthority) ?? "",
    identity: (obj.identity && typeof obj.identity === "object" ? (obj.identity as Record<string, unknown>) : {}),
    connections,
    conferencing: {
      zoomConnected: asBool(conferencingObj.zoomConnected),
      googleMeetAvailable: asBool(conferencingObj.googleMeetAvailable),
      teamsAvailable: asBool(conferencingObj.teamsAvailable),
    },
  };
}
