import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Stepper } from "@/components/Stepper";
import { EventSummary } from "@/components/EventSummary";
import { SlotsView } from "./SlotsView";
import { DetailsView } from "./DetailsView";
import { HeldView } from "./HeldView";
import { ConfirmedView } from "./ConfirmedView";
import { useBooking } from "@/state/BookingContext";
import { useBookingActions } from "@/hooks/useBookingActions";
import { STEP_LABELS, stepIndex } from "@/state/bookingMachine";
import { PageShell } from "@/ui/layout";
import { Button } from "@/ui/controls";
function addDaysKey(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function BookingPage({ username, eventTypeSlug, hostKind = "authenticated-host" }) {
    const { ctx, send } = useBooking();
    const { loadEvent } = useBookingActions(hostKind);
    const initializedRef = useRef(false);
    useEffect(() => {
        initializedRef.current = false;
        if (import.meta.env.DEV) {
            console.debug("[booking] route init", { username, eventTypeSlug });
        }
        loadEvent(username, eventTypeSlug);
    }, [eventTypeSlug, loadEvent, username]);
    useEffect(() => {
        if (!ctx.eventInfo || initializedRef.current)
            return;
        if (ctx.state !== "EVENT")
            return;
        const defaultDate = addDaysKey(2);
        if (import.meta.env.DEV) {
            console.debug("[booking] event loaded -> initializing slots", {
                username: ctx.username,
                eventTypeSlug: ctx.eventTypeSlug,
                defaultDate,
            });
        }
        send({ type: "SELECT_DATE", date: defaultDate });
        send({ type: "GO_TO_SLOTS" });
        initializedRef.current = true;
    }, [ctx.eventInfo, ctx.state, send]);
    const step = stepIndex(ctx.state);
    if (ctx.state === "EVENT" && !ctx.eventInfo) {
        return (_jsx(PageShell, { width: "wide", children: _jsx("div", { className: "rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft", role: "status", "aria-live": "polite", children: ctx.error ? (_jsxs(_Fragment, { children: [_jsx("h1", { className: "text-xl font-semibold text-text-primary", children: "Unable to load booking page" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: ctx.error.message }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => loadEvent(username, eventTypeSlug), className: "mt-4", children: "Retry" })] })) : (_jsx("p", { className: "text-sm text-text-secondary", children: "Loading booking page..." })) }) }));
    }
    return (_jsx(PageShell, { width: "wide", children: _jsxs("main", { className: "mx-auto flex w-full max-w-[1200px] flex-col gap-5", "aria-label": "Public booking flow", children: [_jsxs("div", { className: "rounded-[24px] p-6 sm:p-8 md:p-9 bg-gradient-header text-white shadow-card relative overflow-hidden flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5 min-w-0", children: [_jsx("div", { className: "w-[52px] h-[52px] rounded-[16px] bg-white/20 text-white grid place-items-center font-semibold text-[18px] tracking-tight", children: ctx.eventInfo ? ctx.eventInfo.hostName.split(" ").map((p) => p[0]).join("").slice(0, 2) : "—" }), _jsxs("div", { children: [_jsxs("h1", { className: "m-0 text-h2 sm:text-h1 font-semibold", children: ["Book a time with ", ctx.eventInfo?.hostName.split(" ")[0] ?? "..."] }), _jsxs("div", { className: "font-mono text-body-sm opacity-75", children: ["@", username, " / ", eventTypeSlug] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("span", { className: "px-3 py-2 rounded-full bg-white/15 border border-white/30 text-caption font-mono", children: [ctx.eventInfo?.duration ?? "--", " min"] }), _jsx("span", { className: "px-3 py-2 rounded-full bg-white/15 border border-white/30 text-caption font-mono", children: ctx.eventInfo?.location ?? "--" })] })] }), _jsx(Stepper, { current: step, steps: STEP_LABELS, onJump: (i) => {
                        if (i === 1)
                            send({ type: "BACK" });
                        if (i === 2 && ctx.state === "HELD")
                            send({ type: "BACK" });
                    } }), ctx.state === "CONFIRMED" ? (_jsx(ConfirmedView, { hostKind: hostKind })) : (_jsxs("div", { className: "grid gap-4 md:gap-5 md:grid-cols-[minmax(260px,360px)_1fr] items-start", children: [_jsx(EventSummary, { info: ctx.eventInfo }), _jsxs("div", { children: [ctx.state === "SLOTS" && _jsx(SlotsView, { hostKind: hostKind, today: new Date(), onContinue: () => send({ type: "GO_TO_DETAILS" }) }), ctx.state === "DETAILS" && _jsx(DetailsView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "HELD" && _jsx(HeldView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "EXPIRED" && (_jsxs("div", { className: "p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]", children: [_jsx("div", { className: "text-[18px] font-medium mb-1.5", children: "Your hold expired" }), _jsx("div", { className: "text-[13.5px] text-fg-dim mb-4", children: "No worries, pick another slot and lock it again." }), _jsx("button", { onClick: () => send({ type: "BACK" }), className: "font-mono text-[12px] uppercase tracking-widest text-accent-pink", children: "back to slots" })] }))] })] }))] }) }));
}
