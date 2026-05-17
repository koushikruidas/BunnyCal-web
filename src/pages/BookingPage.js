import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
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
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";
import "./booking/booking.css";
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
    return (_jsx(PageShell, { width: "full", children: _jsx("main", { className: "bk-wrap", "aria-label": "Public booking flow", children: _jsxs("div", { className: "bk-layout", children: [_jsxs("aside", { className: "bk-aside", children: [_jsxs("div", { className: "bk-brandline onb-brand", children: [_jsx(BunnyMark, { size: 45, color: "#2B1F3D" }), _jsx(BrandWordmark, { style: { fontFamily: '"Newsreader", serif', fontWeight: 500, fontSize: 26 } })] }), _jsxs("div", { className: "bk-host", children: [_jsx("div", { className: "font-mono text-[10.5px] uppercase tracking-[.16em] text-[#7A6BB0]", children: "A calm invitation" }), _jsxs("h2", { children: [ctx.eventInfo?.hostName?.split(" ")[0] ?? "Host", ", ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "let's find a time." })] }), _jsxs("p", { children: ["@", username, " / ", eventTypeSlug] })] }), _jsxs("div", { className: "bk-event", children: [_jsx("div", { className: "font-mono text-[10.5px] uppercase tracking-[.16em] text-[#7A6BB0]", children: "Meeting" }), _jsx("h3", { children: ctx.eventInfo?.name ?? "Loading event..." }), _jsx("p", { children: ctx.eventInfo?.description || "Pick a time that fits your week. Nothing offered will collide with your existing commitments." }), _jsxs("div", { className: "bk-meta", children: [_jsxs("span", { children: [ctx.eventInfo?.duration ?? "--", " min"] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: ctx.eventInfo?.location ?? "--" }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: ctx.eventInfo?.timezone ?? "Local timezone" })] })] }), _jsxs("div", { className: "bk-trust", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: 999, background: "#BFCDB9", boxShadow: "0 0 0 3px #DDE6D8" } }), "Slot holds are private and expire safely"] }), _jsxs("div", { style: { marginTop: 8, display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: 999, background: "#BFCDB9", boxShadow: "0 0 0 3px #DDE6D8" } }), "BunnyCal re-verifies before confirming"] })] })] }), _jsxs("section", { className: "bk-main", children: [_jsx("div", { className: "bk-steps", children: STEP_LABELS.map((label, idx) => (_jsxs("div", { className: idx === step ? "active" : "", style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { className: "dot", children: idx + 1 }), _jsx("span", { className: "lbl", children: label })] }, label))) }), _jsxs("div", { className: "bk-head", children: [_jsxs("h1", { children: ["When works ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "for you?" })] }), _jsx("p", { children: "Choose a slot and continue with a lightweight flow. Your selection is held briefly while you confirm details." })] }), ctx.state === "CONFIRMED" ? (_jsx(ConfirmedView, { hostKind: hostKind })) : (_jsxs("div", { className: "bk-content", children: [_jsx(EventSummary, { info: ctx.eventInfo }), _jsxs("div", { children: [ctx.state === "SLOTS" && _jsx(SlotsView, { hostKind: hostKind, today: new Date(), onContinue: () => send({ type: "GO_TO_DETAILS" }) }), ctx.state === "DETAILS" && _jsx(DetailsView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "HELD" && _jsx(HeldView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "EXPIRED" && (_jsxs("div", { className: "p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]", children: [_jsx("div", { className: "text-[18px] font-medium mb-1.5", children: "Your hold expired" }), _jsx("div", { className: "text-[13.5px] text-fg-dim mb-4", children: "No worries, pick another slot and lock it again." }), _jsx("button", { onClick: () => send({ type: "BACK" }), className: "font-mono text-[12px] uppercase tracking-widest text-accent-pink", children: "Back to slots" })] }))] })] }))] })] }) }) }));
}
