import type { CalendarConnectionRuntime, ProviderAwareStatusMap, ProviderCapabilityMap } from "@/services/types";
import { toCanonicalProviderId, toManagedProviderLabel } from "@/lib/providerIds";

const CANONICAL_CALENDAR_PROVIDERS = ["google", "microsoft"] as const;

export interface CalendarProviderOption {
  provider: string;
  label: string;
}

export function getAvailableCalendarProviderOptions(input: {
  calendarStatus: ProviderAwareStatusMap;
  calendarCapabilities: ProviderCapabilityMap;
  calendarConnections: CalendarConnectionRuntime[];
}): CalendarProviderOption[] {
  const { calendarStatus, calendarCapabilities, calendarConnections } = input;
  const merged = Array.from(new Set([
    ...CANONICAL_CALENDAR_PROVIDERS,
    ...Object.keys(calendarStatus),
    ...Object.keys(calendarCapabilities).map((key) => key.toLowerCase()),
    ...calendarConnections.map((connection) => connection.provider),
  ]))
    .map((provider) => toCanonicalProviderId(provider))
    .filter(Boolean)
    .filter((provider) => provider !== "none" && provider !== "custom_url");

  return merged
    .map((provider) => ({
      provider,
      label: toManagedProviderLabel(provider),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
