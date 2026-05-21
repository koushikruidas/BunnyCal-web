import { ApiError } from "@/services/types";

export interface GuestTokenProblem {
  title: string;
  message: string;
}

export function parseTokenError(error: unknown): GuestTokenProblem {
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

export function isTokenInvalidProblem(problem: GuestTokenProblem | null) {
  return Boolean(
    problem &&
      (problem.title === "This link has expired" || problem.title === "This link is no longer valid"),
  );
}
