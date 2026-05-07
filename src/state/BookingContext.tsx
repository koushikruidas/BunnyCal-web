import React, { createContext, useContext, useReducer, useMemo } from "react";
import { reducer, initialContext, type BookingContextData, type BookingEvent } from "./bookingMachine";

interface Ctx {
  ctx: BookingContextData;
  send: (ev: BookingEvent) => void;
}

const BookingCtx = createContext<Ctx | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [ctx, send] = useReducer(reducer, initialContext);
  const value = useMemo(() => ({ ctx, send }), [ctx]);
  return <BookingCtx.Provider value={value}>{children}</BookingCtx.Provider>;
}

export function useBooking() {
  const v = useContext(BookingCtx);
  if (!v) throw new Error("useBooking must be used inside BookingProvider");
  return v;
}
