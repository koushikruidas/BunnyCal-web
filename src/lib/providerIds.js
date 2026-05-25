export function toCanonicalProviderId(provider) {
    return provider.trim().toLowerCase().replace(/-/g, "_");
}
export function toRouteProviderToken(provider) {
    return toCanonicalProviderId(provider);
}
export function toCalendarProviderEnum(provider) {
    return provider === "microsoft" ? "MICROSOFT" : "GOOGLE";
}
export function toConferencingProviderEnum(provider) {
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
export function isOAuthConferencingProvider(provider) {
    const canonical = toCanonicalProviderId(provider);
    return canonical === "zoom" || canonical === "google_meet" || canonical === "microsoft_teams";
}
export function toManagedProviderLabel(provider) {
    const canonical = provider ? toCanonicalProviderId(provider) : "";
    if (canonical === "google_calendar" || canonical === "google")
        return "Google Calendar";
    if (canonical === "microsoft_calendar" || canonical === "microsoft")
        return "Microsoft Calendar";
    return canonical
        .split("_")
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}
