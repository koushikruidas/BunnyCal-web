import { api } from "@/services";
const resolver = {
    getEventInfo: (username, slug) => api.getEventInfo(username, slug),
    getAvailability: (username, slug, date) => api.getAvailability(username, slug, date),
    holdSlot: (username, slug, payload, idempotencyKey) => api.holdSlot(username, slug, payload, idempotencyKey),
    confirmBooking: (username, slug, bookingId) => api.confirmBooking(username, slug, bookingId),
    cancelBooking: (username, slug, bookingId, idempotencyKey, token) => api.cancelBooking(username, slug, bookingId, idempotencyKey, token),
    rescheduleBooking: (username, slug, bookingId, payload, idempotencyKey, token) => api.rescheduleBooking(username, slug, bookingId, payload, idempotencyKey, token),
};
export function getBookingResolver(_hostKind) {
    return resolver;
}
