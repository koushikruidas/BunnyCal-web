import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useMemo } from "react";
import { reducer, initialContext } from "./bookingMachine";
const BookingCtx = createContext(null);
export function BookingProvider({ children }) {
    const [ctx, send] = useReducer(reducer, initialContext);
    const value = useMemo(() => ({ ctx, send }), [ctx]);
    return _jsx(BookingCtx.Provider, { value: value, children: children });
}
export function useBooking() {
    const v = useContext(BookingCtx);
    if (!v)
        throw new Error("useBooking must be used inside BookingProvider");
    return v;
}
