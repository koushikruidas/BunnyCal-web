import { useCallback, useEffect, useState } from "react";
import { api } from "@/services";
export function useAvailability(username, slug, date) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!date || !username || !slug)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.getAvailability(username, slug, date);
            setData(res);
        }
        catch (e) {
            setError(e?.message ?? "Failed to load availability");
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
