import { useMemo, useState } from "react";
import { api } from "@/services";
import { ApiError } from "@/services/types";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type MutationState = "idle" | "pending" | "success" | "error";

type GuestTokenProblem = {
  title: string;
  message: string;
};

type BannerState = {
  tone: "good" | "bad";
  text: string;
};

type TerminalState = "ACTIVE" | "CANCELLED" | "RESCHEDULED";

function parseTokenError(error: unknown): GuestTokenProblem {
  const defaultMessage = "We could not verify this management link. Request a fresh link from your booking confirmation email.";
  if (!(error instanceof ApiError)) {
    return { title: "Unable to verify link", message: defaultMessage };
  }

  const normalized = `${error.code} ${error.message}`.toLowerCase();
  if (normalized.includes("expired")) {
    return {
      title: "This link has expired",
      message: "Request a fresh booking management link from your latest confirmation email.",
    };
  }
  if (normalized.includes("revoked") || normalized.includes("invalid")) {
    return {
      title: "This link is no longer valid",
      message: "The token was revoked or invalid. Open the latest management link from your confirmation email.",
    };
  }

  return { title: "Unable to verify link", message: defaultMessage };
}

interface Params {
  username: string;
  eventTypeSlug: string;
  bookingId: string;
  token: string;
  clearStoredToken: () => void;
}

function isAlreadyCancelledError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  const normalized = `${error.code} ${error.message}`.toLowerCase();
  return normalized.includes("already") && normalized.includes("cancel");
}

function isAlreadyRescheduledError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  const normalized = `${error.code} ${error.message}`.toLowerCase();
  return normalized.includes("already") && normalized.includes("resched");
}

export function useGuestBookingActions(params: Params | null) {
  const [cancelState, setCancelState] = useState<MutationState>("idle");
  const [rescheduleState, setRescheduleState] = useState<MutationState>("idle");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [tokenProblem, setTokenProblem] = useState<GuestTokenProblem | null>(null);
  const [terminalState, setTerminalState] = useState<TerminalState>("ACTIVE");

  const canMutate = Boolean(params?.username && params?.eventTypeSlug && params?.bookingId && params?.token);

  const minRescheduleDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d.toISOString().slice(0, 16);
  }, []);

  const cancelBooking = async () => {
    if (!params || !canMutate) return false;

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
    } catch (error) {
      if (isAlreadyCancelledError(error)) {
        setCancelState("success");
        setTerminalState("CANCELLED");
        setBanner({ tone: "good", text: "This booking is already cancelled." });
        return true;
      }
      const parsed = parseTokenError(error);
      setCancelState("error");
      setTokenProblem(parsed);
      if (parsed.title === "This link has expired" || parsed.title === "This link is no longer valid") {
        params.clearStoredToken();
      }
      setBanner({ tone: "bad", text: parsed.message });
      return false;
    }
  };

  const rescheduleBooking = async (rescheduleAt: string) => {
    if (!params || !canMutate) return false;
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
    } catch (error) {
      if (isAlreadyRescheduledError(error)) {
        setRescheduleState("success");
        setTerminalState("RESCHEDULED");
        setBanner({ tone: "good", text: "This booking has already been rescheduled." });
        return true;
      }
      const parsed = parseTokenError(error);
      setRescheduleState("error");
      setTokenProblem(parsed);
      if (parsed.title === "This link has expired" || parsed.title === "This link is no longer valid") {
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
