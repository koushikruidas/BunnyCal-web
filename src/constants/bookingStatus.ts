export const BookingLifecycleStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type BookingLifecycleStatus = (typeof BookingLifecycleStatus)[keyof typeof BookingLifecycleStatus];

