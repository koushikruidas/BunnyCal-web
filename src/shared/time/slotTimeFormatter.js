import { formatTimeInBrowserTimezone } from "./dateTime";
export function formatSlotTime(utcTimestamp, _timezone) {
    return formatTimeInBrowserTimezone(utcTimestamp);
}
