import type { MeetingSummaryResponse, SessionSummaryResponse } from "@/services/types";
import { BookingLifecycleStatus } from "@/constants/bookingStatus";

export type DashboardItemKind = "ONE_ON_ONE" | "GROUP" | "ROUND_ROBIN" | "COLLECTIVE";
export type DashboardItemSource = "booking" | "session";
export type DashboardItemTab = "upcoming" | "past" | "cancelled";

export interface DashboardMeetingCard {
  id: string;
  kind: DashboardItemKind;
  source: DashboardItemSource;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  joinUrl?: string;
  occupancy?: {
    confirmed: number;
    pending: number;
    capacity: number;
  };
  past: boolean;
  sortKey: number;
  booking?: MeetingSummaryResponse;
  session?: SessionSummaryResponse;
}

function inferKind(raw: unknown, fallback: DashboardItemKind): DashboardItemKind {
  const token = String(raw ?? "").trim().toUpperCase();
  if (token === "ONE_ON_ONE" || token === "GROUP" || token === "ROUND_ROBIN" || token === "COLLECTIVE") {
    return token;
  }
  return fallback;
}

export function toMeetingDashboardItem(meeting: MeetingSummaryResponse): DashboardMeetingCard {
  const status = String(meeting.bookingStatus ?? "").toUpperCase();
  const past = new Date(meeting.endTime).getTime() < Date.now() || status === BookingLifecycleStatus.EXPIRED;
  const raw = meeting as unknown as Record<string, unknown>;
  return {
    id: meeting.bookingId,
    kind: inferKind(raw.kind ?? raw.eventTypeKind ?? raw.eventKind ?? raw.type, "ONE_ON_ONE"),
    source: "booking",
    title: meeting.eventTypeName,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    status,
    past,
    sortKey: new Date(meeting.startTime).getTime(),
    booking: meeting,
  };
}

export function toSessionDashboardItem(session: SessionSummaryResponse): DashboardMeetingCard {
  const status = String(session.status ?? "").toUpperCase();
  const full = Number(session.confirmedCount) >= Number(session.capacity);
  const normalizedStatus = full && status !== "CANCELLED" && status !== "COMPLETED" ? "FULL" : status;
  const past = Boolean(session.past) || normalizedStatus === "COMPLETED";
  const raw = session as unknown as Record<string, unknown>;
  return {
    id: session.sessionId,
    kind: inferKind(raw.kind ?? raw.eventTypeKind ?? raw.eventKind ?? raw.type, "GROUP"),
    source: "session",
    title: session.eventTypeName,
    startTime: session.startTime,
    endTime: session.endTime,
    status: normalizedStatus,
    joinUrl: session.sync?.conferenceUrl ?? undefined,
    occupancy: {
      confirmed: Number(session.confirmedCount ?? 0),
      pending: Number(session.pendingCount ?? 0),
      capacity: Number(session.capacity ?? 0),
    },
    past,
    sortKey: new Date(session.startTime).getTime(),
    session,
  };
}

export function getDashboardTab(item: DashboardMeetingCard): DashboardItemTab {
  const status = item.status.toUpperCase();
  if (status === "CANCELLED") return "cancelled";
  if (item.past || status === "COMPLETED") return "past";
  return "upcoming";
}

export function mergeDashboardItems(meetings: MeetingSummaryResponse[], sessions: SessionSummaryResponse[]): DashboardMeetingCard[] {
  return [
    ...meetings.map(toMeetingDashboardItem),
    ...sessions.map(toSessionDashboardItem),
  ].sort((a, b) => a.sortKey - b.sortKey);
}
