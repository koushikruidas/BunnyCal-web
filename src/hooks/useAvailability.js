import { useCallback, useEffect, useState } from "react";
import { getBookingResolver } from "@/services/bookingResolver";
import { opsLogger } from "@/lib/opsLogger";
const FRIENDLY_ERROR = "Unable to load available times right now.";
export function useAvailability(username, slug, date, hostKind = "authenticated-host") {
    const bookingResolver = getBookingResolver(hostKind);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (import.meta.env.DEV) {
            console.debug("[availability] refresh called", { username, slug, date });
        }
        if (!date || !username || !slug) {
            setData(null);
            setError(null);
            if (import.meta.env.DEV) {
                console.debug("[availability] skipped fetch due to missing params", { username, slug, date });
            }
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (import.meta.env.DEV) {
                console.debug("[availability] requesting slots", { username, slug, date });
            }
            const res = await bookingResolver.getAvailability(username, slug, date);
            setData(res);
            setError(null);
            if (import.meta.env.DEV) {
                console.debug("[availability] slots loaded", { count: res?.slots?.length ?? 0, timezone: res?.timezone });
            }
        }
        catch {
            // Keep previously loaded slots if any, but block progression until retry succeeds.
            setError(FRIENDLY_ERROR);
            opsLogger.warn({
                category: "slot_render_anomaly",
                message: "Availability request failed",
                details: { username, slug, date },
            });
            if (import.meta.env.DEV) {
                console.debug("[availability] slots request failed", { username, slug, date });
            }
        }
        finally {
            setLoading(false);
        }
    }, [bookingResolver, date, username, slug]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    useEffect(() => {
        if (!date || !username || !slug)
            return;
        const syncing = data?.status === "CALENDAR_SYNC_IN_PROGRESS";
        const id = setInterval(refresh, syncing ? 20_000 : 45_000);
        return () => clearInterval(id);
    }, [data?.status, date, refresh, username, slug]);
    return { data, loading, error, refresh };
}
