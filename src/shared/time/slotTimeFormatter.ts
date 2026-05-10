import { formatTimeInBrowserTimezone } from "./dateTime";

export function formatSlotTime(utcTimestamp: string, _timezone?: string) {
  return formatTimeInBrowserTimezone(utcTimestamp);
}
