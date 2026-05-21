import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { api } from "@/services";
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
export function DashboardEventEditorSection({ events, eventsLoading, eventsError, onReload }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("Google Meet");
    const [duration, setDuration] = useState(30);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const slug = useMemo(() => slugify(name), [name]);
    const create = async () => {
        if (!name.trim() || !slug)
            return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            await api.createEventType({
                name: name.trim(),
                description: description.trim(),
                location: location.trim() || "Google Meet",
                durationMinutes: duration,
                bufferBeforeMinutes: 5,
                bufferAfterMinutes: 5,
                slotIntervalMinutes: 15,
                minNoticeMinutes: 120,
                maxAdvanceDays: 60,
                holdDurationMinutes: 10,
                slug,
            });
            setName("");
            setDescription("");
            setDuration(30);
            await onReload();
        }
        catch (e) {
            console.error(e);
            setSubmitError("Unable to create event type.");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "dash-section", children: [_jsx("div", { className: "dash-section-head", children: _jsxs("div", { children: [_jsxs("h2", { children: ["Event ", _jsx("em", { children: "editor" })] }), _jsx("div", { className: "sub", children: "Create and tune booking experiences with production scheduling defaults." })] }) }), (eventsError || submitError) && _jsx("div", { className: "dash-alert error", children: eventsError ?? submitError }), _jsxs("div", { className: "panel", style: { marginBottom: 16 }, children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Create event type" }), _jsx("div", { className: "sub", children: "Name, duration, and booking link identity." })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr", gap: 12 }, children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Name" }), _jsx("input", { className: "dash-input", value: name, onChange: (e) => setName(e.target.value), placeholder: "Intro call" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Duration (min)" }), _jsx("select", { className: "dash-input", value: duration, onChange: (e) => setDuration(Number(e.target.value)), children: [15, 30, 45, 60, 90].map((d) => _jsx("option", { value: d, children: d }, d)) })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Location" }), _jsx("input", { className: "dash-input", value: location, onChange: (e) => setLocation(e.target.value) })] })] }), _jsxs("div", { className: "dash-field", style: { marginTop: 12 }, children: [_jsx("label", { children: "Description" }), _jsx("textarea", { className: "dash-input", value: description, onChange: (e) => setDescription(e.target.value), rows: 3, placeholder: "What guests should expect in this meeting." })] }), _jsxs("div", { style: { marginTop: 10, fontSize: 12.5, color: "var(--plum-500)" }, children: ["Booking link slug: ", _jsx("strong", { children: slug || "(enter a name)" })] }), _jsx("div", { style: { marginTop: 14, display: "flex", justifyContent: "flex-end" }, children: _jsx("button", { className: "dash-btn-primary", disabled: !name.trim() || !slug || submitting, onClick: create, children: submitting ? "Creating..." : "Create event type" }) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Existing event types" }), _jsx("div", { className: "sub", children: "Production event links currently available." })] }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => onReload(), children: "Refresh" })] }), eventsLoading ? (_jsx("div", { style: { display: "grid", gap: 8 }, children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 56 } }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "dash-empty", style: { padding: "12px 0" }, children: [_jsx("h3", { children: "No event types yet" }), _jsx("p", { children: "Create your first event type using the editor above." })] })) : (_jsx("div", { style: { display: "grid", gap: 8 }, children: events.map((event) => (_jsxs("article", { className: "et-row", children: [_jsx("div", { className: "stripe lilac" }), _jsxs("div", { children: [_jsx("div", { className: "name", children: event.name }), _jsxs("div", { className: "slug", children: ["/", event.slug] })] }), _jsx("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: _jsx("a", { className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, href: event.link, target: "_blank", rel: "noreferrer", children: "Open" }) })] }, event.id))) }))] })] }));
}
