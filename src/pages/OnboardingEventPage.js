import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function OnboardingEventPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("Intro Call");
    const [location, setLocation] = useState("Google Meet");
    const [duration, setDuration] = useState(30);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const slug = useMemo(() => slugify(name || "event"), [name]);
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
            sessionStorage.setItem("createdEventLink", created.link);
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
    return (_jsx("div", { className: "min-h-screen bg-[#f8faff] p-6", children: _jsxs("div", { className: "max-w-5xl mx-auto grid md:grid-cols-2 gap-5", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm", children: [_jsx("div", { className: "text-sm text-[#6b7280]", children: "Step 3/3" }), _jsx("h1", { className: "text-2xl font-semibold text-[#111827] mt-1", children: "Create first event type" }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-3", children: error }), _jsxs("div", { className: "mt-5 space-y-3", children: [_jsx("input", { value: name, onChange: (e) => setName(e.target.value), className: "w-full border rounded-xl px-3 py-2.5", placeholder: "Event name" }), _jsx("input", { value: location, onChange: (e) => setLocation(e.target.value), className: "w-full border rounded-xl px-3 py-2.5", placeholder: "Location" }), _jsxs("label", { className: "text-sm text-[#6b7280]", children: ["Duration: ", duration, " min"] }), _jsx("input", { type: "range", min: 15, max: 60, step: 15, value: duration, onChange: (e) => setDuration(Number(e.target.value)), className: "w-full" })] }), _jsx("button", { onClick: create, disabled: saving, className: "mt-6 px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7] disabled:opacity-60", children: saving ? "Creating..." : "Create event" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm", children: [_jsx("div", { className: "text-sm text-[#6b7280]", children: "Live preview" }), _jsxs("div", { className: "mt-3 rounded-xl border border-[#e5e7eb] p-4 bg-[#f9fafb]", children: [_jsx("h3", { className: "font-semibold text-[#111827]", children: name }), _jsxs("p", { className: "text-sm text-[#6b7280] mt-1", children: [duration, " min \u00B7 ", location] }), _jsxs("p", { className: "text-xs text-[#9ca3af] mt-3", children: ["/book/yourname/", slug] })] })] })] }) }));
}
