import type {
  IntegrationKind,
  ProviderAwareStatusMap,
  ProviderCalendarSummary,
  ProviderCapabilityFlags,
  ProviderCapabilityMap,
  ProviderStatusEntry,
} from "@/services/types";
import { asBoolean, asRecord, asString } from "@/domain/contracts/contractGuard";

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
  if (normalized === "CALENDAR_NOT_CONNECTED" || normalized === "DISCONNECTED" || normalized === "INACTIVE") return "disconnected";
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) return "failed";
  return "disconnected";
}

function coerceProviderAwareMap(input: unknown): ProviderAwareStatusMap {
  if (!input || typeof input !== "object") return {};
  const out: ProviderAwareStatusMap = {};
  for (const [provider, raw] of Object.entries(input as Record<string, unknown>)) {
    const key = provider.toLowerCase();
    if (typeof raw === "string") {
      out[key] = { status: raw };
      continue;
    }
    const obj = asRecord(raw, `integrations.providers.${key}`);
    if (!obj) continue;
    const status = readStatusString(obj as ProviderStatusEntry);
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

