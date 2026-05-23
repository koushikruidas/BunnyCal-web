export type CalendarProviderId = "google" | "microsoft";
export type ConferencingProviderId =
  | "zoom"
  | "google_meet"
  | "microsoft_teams"
  | "custom_url"
  | "none";

export type IntegrationProviderId = CalendarProviderId | ConferencingProviderId;

export function toCanonicalProviderId(provider: string): string {
  return provider.trim().toLowerCase().replace(/-/g, "_");
}

export function toRouteProviderToken(provider: string): string {
  return toCanonicalProviderId(provider);
}

export function toCalendarProviderEnum(provider: CalendarProviderId): "GOOGLE" | "MICROSOFT" {
  return provider === "microsoft" ? "MICROSOFT" : "GOOGLE";
}

export function toConferencingProviderEnum(
  provider: ConferencingProviderId,
): "ZOOM" | "GOOGLE_MEET" | "MICROSOFT_TEAMS" | "CUSTOM_URL" | "NONE" {
  switch (provider) {
    case "google_meet":
      return "GOOGLE_MEET";
    case "microsoft_teams":
      return "MICROSOFT_TEAMS";
    case "custom_url":
      return "CUSTOM_URL";
    case "none":
      return "NONE";
    default:
      return "ZOOM";
  }
}

export function isOAuthConferencingProvider(provider: string): boolean {
  const canonical = toCanonicalProviderId(provider);
  return canonical === "zoom" || canonical === "google_meet" || canonical === "microsoft_teams";
}
