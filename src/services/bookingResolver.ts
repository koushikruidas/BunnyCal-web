import { api } from "@/services";
import type { HoldResponse, PublicBookRequest, PublicConfirmResponse, PublicEventInfoResponse, PublicRescheduleRequest, SlotResponse } from "@/services/types";

export type HostKind = "authenticated-host" | "draft-host";

export interface BookingResolver {
  getEventInfo: (username: string, slug: string) => Promise<PublicEventInfoResponse>;
  getAvailability: (username: string, slug: string, date: string) => Promise<SlotResponse>;
  holdSlot: (username: string, slug: string, payload: PublicBookRequest, idempotencyKey?: string) => Promise<HoldResponse>;
  confirmBooking: (username: string, slug: string, bookingId: string) => Promise<PublicConfirmResponse>;
  cancelBooking: (username: string, slug: string, bookingId: string, idempotencyKey?: string) => Promise<unknown>;
  rescheduleBooking: (username: string, slug: string, bookingId: string, payload: PublicRescheduleRequest, idempotencyKey?: string) => Promise<unknown>;
}

const resolver: BookingResolver = {
  getEventInfo: (username, slug) => api.getEventInfo(username, slug),
  getAvailability: (username, slug, date) => api.getAvailability(username, slug, date),
  holdSlot: (username, slug, payload, idempotencyKey) => api.holdSlot(username, slug, payload, idempotencyKey),
  confirmBooking: (username, slug, bookingId) => api.confirmBooking(username, slug, bookingId),
  cancelBooking: (username, slug, bookingId, idempotencyKey) => api.cancelBooking(username, slug, bookingId, idempotencyKey),
  rescheduleBooking: (username, slug, bookingId, payload, idempotencyKey) => api.rescheduleBooking(username, slug, bookingId, payload, idempotencyKey),
};

export function getBookingResolver(_hostKind: HostKind): BookingResolver {
  return resolver;
}
