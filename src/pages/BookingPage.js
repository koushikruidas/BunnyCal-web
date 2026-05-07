import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Stepper } from "@/components/Stepper";
import { EventSummary } from "@/components/EventSummary";
import { SlotsView } from "./SlotsView";
import { DetailsView } from "./DetailsView";
import { HeldView } from "./HeldView";
import { ConfirmedView } from "./ConfirmedView";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { STEP_LABELS, stepIndex } from "@/state/bookingMachine";
export function BookingPage({ username, eventTypeSlug }) {
    const { ctx, send } = useBooking();
    const { loadEvent } = useBookingActions();
    const today = new Date();
    useEffect(() => {
        loadEvent(username, eventTypeSlug);
        if (ctx.state === "EVENT") {
            // Initialize selected date to today + 2
            const d = new Date(today);
            d.setDate(d.getDate() + 2);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            send({ type: "SELECT_DATE", date: k });
            send({ type: "GO_TO_SLOTS" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const step = stepIndex(ctx.state);
    return (_jsxs("div", { className: "min-h-screen p-5 sm:p-8 max-w-[1200px] mx-auto flex flex-col gap-4", children: [_jsxs("div", { className: "rounded-[24px] p-6 sm:p-8 bg-gradient-header text-white shadow-card relative overflow-hidden flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5 min-w-0", children: [_jsx("div", { className: "w-[52px] h-[52px] rounded-[16px] bg-white/20 text-white grid place-items-center font-semibold text-[18px] tracking-tight", children: ctx.eventInfo ? ctx.eventInfo.hostName.split(" ").map(p => p[0]).join("").slice(0, 2) : "—" }), _jsxs("div", { children: [_jsxs("h1", { className: "m-0 text-[22px] sm:text-[28px] font-semibold tracking-tight", children: ["Book a time with ", ctx.eventInfo?.hostName.split(" ")[0] ?? "…"] }), _jsxs("div", { className: "font-mono text-[13px] opacity-75", children: ["@", username, " / ", eventTypeSlug] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("span", { className: "px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono", children: ["\u23F1 ", ctx.eventInfo?.duration ?? "—", " min"] }), _jsxs("span", { className: "px-3 py-2 rounded-full bg-white/15 border border-white/30 text-[12px] font-mono", children: ["\u25D0 ", ctx.eventInfo?.location ?? "—"] })] })] }), _jsx(Stepper, { current: step, steps: STEP_LABELS, onJump: (i) => {
                    if (i === 1)
                        send({ type: "BACK" });
                    if (i === 2 && ctx.state === "HELD")
                        send({ type: "BACK" });
                } }), ctx.state === "CONFIRMED" ? (_jsx(ConfirmedView, {})) : (_jsxs("div", { className: "grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr] items-start", children: [_jsx(EventSummary, { info: ctx.eventInfo }), _jsxs("div", { children: [ctx.state === "SLOTS" && _jsx(SlotsView, { today: today, onContinue: () => send({ type: "GO_TO_DETAILS" }) }), ctx.state === "DETAILS" && _jsx(DetailsView, { onBack: () => send({ type: "BACK" }) }), ctx.state === "HELD" && _jsx(HeldView, { onBack: () => send({ type: "BACK" }) }), ctx.state === "EXPIRED" && (_jsxs("div", { className: "p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]", children: [_jsx("div", { className: "text-[18px] font-medium mb-1.5", children: "Your hold expired" }), _jsx("div", { className: "text-[13.5px] text-fg-dim mb-4", children: "No worries \u2014 pick another slot and we'll lock it again." }), _jsx("button", { onClick: () => send({ type: "BACK" }), className: "font-mono text-[12px] uppercase tracking-widest text-accent-pink", children: "\u2190 back to slots" })] }))] })] }))] }));
}
