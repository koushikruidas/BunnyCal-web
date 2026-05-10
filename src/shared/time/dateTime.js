import { getBrowserTimezone } from "./timezone";
export function utcToLocal(date) {
    return new Date(date);
}
export function formatInBrowserTimezone(utcTimestamp) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: getBrowserTimezone(),
        timeZoneName: "short",
    }).format(utcToLocal(utcTimestamp));
}
export function formatTimeInBrowserTimezone(utcTimestamp) {
    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: getBrowserTimezone(),
        timeZoneName: "short",
    }).format(utcToLocal(utcTimestamp));
}
export function formatRangeInBrowserTimezone(startUtc, endUtc) {
    const start = utcToLocal(startUtc);
    const end = utcToLocal(endUtc);
    const timeZone = getBrowserTimezone();
    const date = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone,
    }).format(start);
    const startTime = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
    }).format(start);
    const endTime = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
        timeZoneName: "short",
    }).format(end);
    return { date, time: `${startTime} - ${endTime}` };
}
