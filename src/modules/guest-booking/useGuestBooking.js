import { useCallback, useEffect, useState } from "react";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import { opsLogger } from "@/lib/opsLogger";
import { isTokenInvalidProblem, parseTokenError } from "./tokenErrors";
function isNotFoundError(error) {
    if (!(error instanceof ApiError))
        return false;
    return /resource_not_found|not.?found|404/i.test(`${error.code} ${error.message}`);
}
export function useGuestBooking(params) {
    const [booking, setBooking] = useState(null);
    const [loadState, setLoadState] = useState("idle");
    const [tokenProblem, setTokenProblem] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const refresh = useCallback(async () => {
        if (!params) {
            setBooking(null);
            setLoadState("idle");
            return;
        }
        setLoadState("loading");
        setTokenProblem(null);
        setNotFound(false);
        try {
            const data = await api.getPublicBooking(params.username, params.eventTypeSlug, params.bookingId, params.token);
            setBooking(data);
            setLoadState("success");
        }
        catch (error) {
            if (isNotFoundError(error)) {
                setNotFound(true);
                setLoadState("error");
                return;
            }
            const parsed = parseTokenError(error);
            opsLogger.warn({
                category: "booking_mutation_failure",
                message: "Guest manage view load failed",
                details: { code: error instanceof ApiError ? error.code : "UNKNOWN", stage: "load" },
            });
            setTokenProblem(parsed);
            if (isTokenInvalidProblem(parsed)) {
                params.clearStoredToken?.();
            }
            setLoadState("error");
        }
    }, [params]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return {
        booking,
        loading: loadState === "loading",
        loadState,
        tokenProblem,
        notFound,
        refresh,
    };
}
