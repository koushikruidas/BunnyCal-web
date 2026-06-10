export type EventTypeKind = "ONE_ON_ONE" | "GROUP" | "ROUND_ROBIN" | "COLLECTIVE";

export interface EventTypeCardConfig {
  kind: EventTypeKind;
  title: string;
  subtitle: string;
  description: string;
  stateLabel: string;
  actionLabel: string;
  available: boolean;
  badgeTone: "sage" | "butter" | "lilac" | "blush";
}

export const EVENT_TYPE_CARDS: EventTypeCardConfig[] = [
  {
    kind: "ONE_ON_ONE",
    title: "One-to-One",
    subtitle: "One host and one attendee.",
    description: "Perfect for meetings, interviews, coaching sessions, and consultations.",
    stateLabel: "Available",
    actionLabel: "Continue",
    available: true,
    badgeTone: "sage",
  },
  {
    kind: "GROUP",
    title: "Group",
    subtitle: "One host and multiple attendees.",
    description: "Workshops, webinars, classes, office hours, and group sessions.",
    stateLabel: "Available",
    actionLabel: "Continue",
    available: true,
    badgeTone: "butter",
  },
  {
    kind: "ROUND_ROBIN",
    title: "Round Robin",
    subtitle: "Distribute meetings across your team.",
    description: "Share the load fairly. BunnyCal rotates bookings to whoever was least recently assigned and is currently free.",
    stateLabel: "Available",
    actionLabel: "Continue",
    available: true,
    badgeTone: "lilac",
  },
  {
    kind: "COLLECTIVE",
    title: "Collective",
    subtitle: "Meet together with multiple hosts.",
    description: "Everyone hosts together. BunnyCal only offers slots when the full team is simultaneously free.",
    stateLabel: "Available",
    actionLabel: "Continue",
    available: true,
    badgeTone: "blush",
  },
];

export const SUPPORTED_EVENT_TYPE_KINDS = ["ONE_ON_ONE", "GROUP", "ROUND_ROBIN", "COLLECTIVE"] as const;

export type SupportedEventTypeKind = typeof SUPPORTED_EVENT_TYPE_KINDS[number];

export function isSupportedEventTypeKind(kind: string | null | undefined): kind is SupportedEventTypeKind {
  return kind === "ONE_ON_ONE" || kind === "GROUP" || kind === "ROUND_ROBIN" || kind === "COLLECTIVE";
}

export function normalizeEventTypeKind(kind: string | null | undefined): EventTypeKind | null {
  const token = String(kind ?? "").trim().toUpperCase();
  if (token === "ONE_ON_ONE" || token === "GROUP" || token === "ROUND_ROBIN" || token === "COLLECTIVE") {
    return token;
  }
  return null;
}

export function getEventTypeDisplayName(kind: string | null | undefined): string {
  switch (normalizeEventTypeKind(kind)) {
    case "ONE_ON_ONE":
      return "One-to-One";
    case "GROUP":
      return "Group";
    case "ROUND_ROBIN":
      return "Round Robin";
    case "COLLECTIVE":
      return "Collective";
    default:
      return "Unsupported";
  }
}

