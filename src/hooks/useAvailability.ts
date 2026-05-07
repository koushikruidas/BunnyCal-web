import { useCallback, useEffect, useState } from "react";
import { api } from "@/services";
import type { SlotResponse } from "@/services/types";

export function useAvailability(username: string | null, slug: string | null, date: string | null) {
  const [data, setData] = useState<SlotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!date || !username || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAvailability(username, slug, date);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [date, username, slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!date || !username || !slug) return;
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [date, refresh, username, slug]);

  return { data, loading, error, refresh };
}
