import { useCallback, useEffect, useState } from "react";
import { api } from "@/services";
const FRIENDLY_ERROR = "Unable to load available times right now.";
export function useAvailability(username, slug, date) {
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
            const res = await api.getAvailability(username, slug, date);
            setData(res);
            setError(null);
            if (import.meta.env.DEV) {
                console.debug("[availability] slots loaded", { count: res?.slots?.length ?? 0, timezone: res?.timezone });
            }
        }
        catch {
            // Keep previously loaded slots if any, but block progression until retry succeeds.
            setError(FRIENDLY_ERROR);
            if (import.meta.env.DEV) {
                console.debug("[availability] slots request failed", { username, slug, date });
            }
        }
        finally {
            setLoading(false);
        }
    }, [date, username, slug]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    useEffect(() => {
        if (!date || !username || !slug)
            return;
        const id = setInterval(refresh, 20_000);
        return () => clearInterval(id);
    }, [date, refresh, username, slug]);
    return { data, loading, error, refresh };
}
