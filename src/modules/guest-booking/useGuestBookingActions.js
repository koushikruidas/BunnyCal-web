import { useMemo, useState } from "react";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import { opsLogger } from "@/lib/opsLogger";
import { isTokenInvalidProblem, parseTokenError } from "./tokenErrors";
function randomKey() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function isAlreadyCancelledError(error) {
    if (!(error instanceof ApiError))
        return false;
    const normalized = `${error.code} ${error.message}`.toLowerCase();
    return normalized.includes("already") && normalized.includes("cancel");
}
function isAlreadyRescheduledError(error) {
    if (!(error instanceof ApiError))
        return false;
    const normalized = `${error.code} ${error.message}`.toLowerCase();
    return normalized.includes("already") && normalized.includes("resched");
}
export function useGuestBookingActions(params) {
    const [cancelState, setCancelState] = useState("idle");
    const [rescheduleState, setRescheduleState] = useState("idle");
    const [banner, setBanner] = useState(null);
    const [tokenProblem, setTokenProblem] = useState(null);
    const [terminalState, setTerminalState] = useState("ACTIVE");
    const canMutate = Boolean(params?.username && params?.eventTypeSlug && params?.bookingId && params?.token);
    const minRescheduleDateTime = useMemo(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15);
        return d.toISOString().slice(0, 16);
    }, []);
    const cancelBooking = async () => {
        if (!params || !canMutate)
            return false;
        if (cancelState === "pending" || rescheduleState === "pending")
            return false;
        setCancelState("pending");
        setBanner(null);
        setTokenProblem(null);
        try {
            if (import.meta.env.DEV) {
                console.debug("[guest-manage] cancel mutation", {
                    bookingId: params.bookingId,
                    username: params.username,
                    eventTypeSlug: params.eventTypeSlug,
                });
            }
            await api.cancelBooking(params.username, params.eventTypeSlug, params.bookingId, randomKey(), params.token);
            setCancelState("success");
            setTerminalState("CANCELLED");
            setBanner({ tone: "good", text: "Booking cancelled. If it was already cancelled, this request was treated as a safe no-op." });
            return true;
        }
        catch (error) {
            if (isAlreadyCancelledError(error)) {
                setCancelState("success");
                setTerminalState("CANCELLED");
                setBanner({ tone: "good", text: "This booking is already cancelled." });
                return true;
            }
            const parsed = parseTokenError(error);
            opsLogger.warn({
                category: "booking_mutation_failure",
                message: "Guest cancel request failed",
                details: { code: error instanceof ApiError ? error.code : "UNKNOWN" },
            });
            setCancelState("error");
            setTokenProblem(parsed);
            if (isTokenInvalidProblem(parsed)) {
                params.clearStoredToken();
            }
            setBanner({ tone: "bad", text: parsed.message });
            return false;
        }
    };
    const rescheduleBooking = async (rescheduleAt) => {
        if (!params || !canMutate)
            return false;
        if (cancelState === "pending" || rescheduleState === "pending")
            return false;
        if (!rescheduleAt) {
            setBanner({ tone: "bad", text: "Select a new time before submitting." });
            return false;
        }
        setRescheduleState("pending");
        setBanner(null);
        setTokenProblem(null);
        try {
            const iso = new Date(rescheduleAt).toISOString();
            if (import.meta.env.DEV) {
                console.debug("[guest-manage] reschedule mutation", {
                    bookingId: params.bookingId,
                    username: params.username,
                    eventTypeSlug: params.eventTypeSlug,
                    startTime: iso,
                });
            }
            await api.rescheduleBooking(params.username, params.eventTypeSlug, params.bookingId, { startTime: iso }, randomKey(), params.token);
            setRescheduleState("success");
            setTerminalState("RESCHEDULED");
            setBanner({ tone: "good", text: "Reschedule request submitted. We will sync it shortly if provider updates are still converging." });
            return true;
        }
        catch (error) {
            if (isAlreadyRescheduledError(error)) {
                setRescheduleState("success");
                setTerminalState("RESCHEDULED");
                setBanner({ tone: "good", text: "This booking has already been rescheduled." });
                return true;
            }
            const parsed = parseTokenError(error);
            opsLogger.warn({
                category: "booking_mutation_failure",
                message: "Guest reschedule request failed",
                details: { code: error instanceof ApiError ? error.code : "UNKNOWN" },
            });
            setRescheduleState("error");
            setTokenProblem(parsed);
            if (isTokenInvalidProblem(parsed)) {
                params.clearStoredToken();
            }
            setBanner({ tone: "bad", text: parsed.message });
            return false;
        }
    };
    return {
        canMutate,
        terminalState,
        cancelState,
        rescheduleState,
        banner,
        tokenProblem,
        minRescheduleDateTime,
        cancelBooking,
        rescheduleBooking,
    };
}
