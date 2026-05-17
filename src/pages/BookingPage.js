import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect, useRef } from "react";
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
    const duration = ctx.eventInfo?.duration ?? "--";
    const eventName = ctx.eventInfo?.name ?? "Meeting";
    const stepTitles = {
        SLOTS: {
            title: _jsxs(_Fragment, { children: ["When works ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "for you?" })] }),
            body: "Pick a time that fits your week. Nothing offered will collide with your existing commitments.",
        },
        DETAILS: {
            title: _jsxs(_Fragment, { children: ["One quiet form, ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "and we're done." })] }),
            body: "A name, an email, and an optional note. Your slot is held while you finish.",
        },
        HELD: {
            title: _jsxs(_Fragment, { children: ["Almost there. ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "Just confirm." })] }),
            body: "We're holding your time gently. Lock it in whenever you're ready.",
        },
        EXPIRED: {
            title: _jsxs(_Fragment, { children: ["Let's pick another ", _jsx("em", { style: { fontStyle: "italic", color: "#5E4E99" }, children: "time." })] }),
            body: "Your previous hold expired, but everything else is ready. Select a new slot to continue.",
        },
        CONFIRMED: {
            title: _jsx(_Fragment, { children: "Beautifully done." }),
            body: "Your confirmation is ready with invitation details and next steps.",
        },
    };
    const currentHead = ctx.state === "SLOTS" ? stepTitles.SLOTS :
        ctx.state === "DETAILS" ? stepTitles.DETAILS :
            ctx.state === "HELD" ? stepTitles.HELD :
                ctx.state === "EXPIRED" ? stepTitles.EXPIRED :
                    stepTitles.CONFIRMED;
    if (ctx.state === "EVENT" && !ctx.eventInfo) {
        return (_jsx(PageShell, { width: "wide", children: _jsx("div", { className: "rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft", role: "status", "aria-live": "polite", children: ctx.error ? (_jsxs(_Fragment, { children: [_jsx("h1", { className: "text-xl font-semibold text-text-primary", children: "Unable to load booking page" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: ctx.error.message }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => loadEvent(username, eventTypeSlug), className: "mt-4", children: "Retry" })] })) : (_jsx("p", { className: "text-sm text-text-secondary", children: "Loading booking page..." })) }) }));
    }
    return (_jsx(PageShell, { width: "full", className: "!px-0 !py-0", children: _jsx("main", { className: "bk-wrap", "aria-label": "Public booking flow", children: _jsxs("div", { className: "bk-layout", children: [_jsxs("aside", { className: "bk-aside", children: [_jsxs("div", { className: "bk-brandline onb-brand", children: [_jsx(BunnyMark, { size: 45, color: "#2B1F3D" }), _jsx(BrandWordmark, { style: { fontFamily: '"Newsreader", serif', fontWeight: 500, fontSize: 26 } })] }), _jsxs("div", { className: "bk-event", children: [_jsx("div", { className: "bk-event-tag", children: "You're booking" }), _jsxs("h3", { children: [eventName, " ", _jsxs("em", { children: ["\u00B7 ", duration, " min"] })] }), _jsx("p", { children: ctx.eventInfo?.description || "Pick a time that fits your week. Nothing offered will collide with your existing commitments." }), _jsxs("div", { className: "bk-meta", children: [_jsxs("span", { children: [duration, " min"] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: ctx.eventInfo?.location ?? "--" }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: ctx.eventInfo?.timezone ?? "Local timezone" })] })] }), _jsxs("div", { className: "bk-trust", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "dot" }), "Slot holds are private and expire safely"] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "dot" }), "BunnyCal re-verifies before confirming"] })] })] }), _jsxs("section", { className: "bk-main", children: [_jsx("div", { className: "bk-steps", children: STEP_LABELS.map((label, idx) => (_jsxs(Fragment, { children: [_jsxs("div", { className: `s ${idx < step ? "done" : idx === step ? "active" : ""}`, children: [_jsx("span", { className: "num", children: idx + 1 }), _jsx("span", { className: "lbl", children: label })] }), idx < STEP_LABELS.length - 1 && _jsx("span", { className: "line" })] }, label))) }), _jsxs("div", { className: "bk-head", children: [_jsx("h1", { children: currentHead.title }), _jsx("p", { children: currentHead.body })] }), ctx.state === "CONFIRMED" ? (_jsx(ConfirmedView, { hostKind: hostKind })) : (_jsxs("div", { className: "bk-content", children: [ctx.state === "SLOTS" && _jsx(SlotsView, { hostKind: hostKind, today: new Date(), onContinue: () => send({ type: "GO_TO_DETAILS" }) }), ctx.state === "DETAILS" && _jsx(DetailsView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "HELD" && _jsx(HeldView, { hostKind: hostKind, onBack: () => send({ type: "BACK" }) }), ctx.state === "EXPIRED" && (_jsxs("div", { className: "p-6 rounded-card border border-accent-pink/30 bg-accent-pink/[.08]", children: [_jsx("div", { className: "text-[18px] font-medium mb-1.5", children: "Your hold expired" }), _jsx("div", { className: "text-[13.5px] text-fg-dim mb-4", children: "No worries, pick another slot and lock it again." }), _jsx("button", { onClick: () => send({ type: "BACK" }), className: "font-mono text-[12px] uppercase tracking-widest text-accent-pink", children: "Back to slots" })] }))] }))] })] }) }) }));
}
