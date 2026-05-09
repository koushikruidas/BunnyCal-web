import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/services";
import { useAuth } from "@/state/AuthContext";
import { toAbsoluteUrl, toPublicBookingPath } from "@/lib/urls";
function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const DRAFT_KEY = "eventDraft";
function readDraft() {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed.name || !parsed.location || !parsed.duration)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function OnboardingEventPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const initial = readDraft();
    const [name, setName] = useState(initial?.name || "30-min Intro");
    const [location, setLocation] = useState(initial?.location || "Google Meet");
    const [duration, setDuration] = useState(initial?.duration || 30);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const slug = useMemo(() => slugify(name || "event"), [name]);
    const previewPath = useMemo(() => {
        const username = user?.username || "yourname";
        return toPublicBookingPath(username, slug);
    }, [slug, user?.username]);
    useEffect(() => {
        const draft = { name, location, duration };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [duration, location, name]);
    const create = async () => {
        setSaving(true);
        setError(null);
        try {
            const created = await api.createEventType({
                name,
                description: "",
                location,
                durationMinutes: duration,
                bufferBeforeMinutes: 0,
                bufferAfterMinutes: 0,
                slotIntervalMinutes: duration,
                minNoticeMinutes: 60,
                maxAdvanceDays: 60,
                holdDurationMinutes: 5,
                slug,
            });
            const absoluteLink = created.link
                ? toAbsoluteUrl(created.link)
                : toAbsoluteUrl(toPublicBookingPath(user?.username || "yourname", slug));
            sessionStorage.setItem("createdEventLink", absoluteLink);
            sessionStorage.removeItem(DRAFT_KEY);
            navigate("/onboarding/success");
        }
        catch (e) {
            console.error(e);
            setError("Unable to create event type.");
        }
        finally {
            setSaving(false);
        }
    };
    const copyPreviewLink = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${previewPath}`);
        setCopied(true);
    };
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-5 py-8", children: _jsxs("div", { className: "max-w-5xl mx-auto grid lg:grid-cols-2 gap-5", children: [_jsxs("section", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-6 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Step 3 of 3" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]", children: "Create your first event" }), _jsx("p", { className: "mt-2 text-[#475569]", children: "You can preview, edit, and return anytime before publishing." }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-4", children: error }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Event name" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5", placeholder: "Event name" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Location" }), _jsx("input", { value: location, onChange: (e) => setLocation(e.target.value), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5", placeholder: "Location" })] }), _jsxs("label", { className: "block", children: [_jsxs("span", { className: "text-sm text-[#475569]", children: ["Duration (", duration, " min)"] }), _jsx("input", { type: "range", min: 15, max: 60, step: 15, value: duration, onChange: (e) => setDuration(Number(e.target.value)), className: "mt-2 w-full" })] })] }), _jsxs("div", { className: "mt-7 flex flex-wrap gap-2", children: [_jsx(Link, { to: "/onboarding/availability", className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm", children: "Back" }), _jsx("a", { href: previewPath, target: "_blank", rel: "noreferrer", className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm", children: "Open preview" }), _jsx("button", { onClick: copyPreviewLink, className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm", children: copied ? "Copied" : "Copy preview link" }), _jsx("button", { onClick: create, disabled: saving, className: "rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-60", children: saving ? "Creating..." : "Create event" })] })] }), _jsxs("aside", { className: "rounded-3xl border border-[#dbe4f8] bg-white p-6 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Booking preview" }), _jsxs("div", { className: "mt-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5", children: [_jsx("h3", { className: "text-xl font-semibold text-[#0f172a]", children: name }), _jsxs("p", { className: "text-sm text-[#475569] mt-1", children: [duration, " min \u00B7 ", location] }), _jsx("div", { className: "mt-5 h-px bg-[#e2e8f0]" }), _jsx("p", { className: "mt-4 text-xs uppercase tracking-[0.14em] text-[#64748b]", children: "Public URL" }), _jsx("p", { className: "mt-1 break-all text-sm text-[#1d4ed8]", children: previewPath }), _jsx("p", { className: "mt-3 text-xs text-[#64748b]", children: "This is the same route invitees will use when you share your link." })] })] })] }) }));
}
