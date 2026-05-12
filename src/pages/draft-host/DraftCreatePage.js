import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
import { getBrowserTimezone } from "@/shared/time/timezone";
import { saveDraftPublicUrl, saveDraftToken } from "@/modules/draft-host/tokenStore";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
export function DraftCreatePage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [eventName, setEventName] = useState("Discovery Call");
    const [description, setDescription] = useState("30 minute intro call");
    const [location, setLocation] = useState("Google Meet");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(30);
    const [holdDurationMinutes, setHoldDurationMinutes] = useState(10);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const timezone = useMemo(() => getBrowserTimezone(), []);
    const rules = useMemo(() => DAYS.map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "17:00" })), []);
    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const created = await api.createDraftHost({
                email: email.trim().toLowerCase(),
                displayName: displayName.trim(),
                timezone,
                eventName: eventName.trim(),
                description: description.trim(),
                location: location.trim(),
                durationMinutes,
                slotIntervalMinutes,
                holdDurationMinutes,
                rules,
                overrides: [],
            });
            const slug = created.slug?.trim();
            const managementToken = created.managementToken?.trim();
            if (!slug) {
                throw new Error("Draft slug missing from response");
            }
            if (!managementToken) {
                throw new Error("Draft management token missing from response");
            }
            saveDraftToken(slug, managementToken);
            if (created.publicUrl) {
                saveDraftPublicUrl(slug, created.publicUrl);
            }
            navigate(`/d/${slug}/manage`, { replace: true });
        }
        catch (err) {
            console.error(err);
            setError("Unable to create draft scheduling link.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8", children: _jsxs("div", { className: "mx-auto max-w-3xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Draft Host" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]", children: "Create scheduling link" }), _jsx("p", { className: "mt-2 text-[#475569]", children: "This creates a host draft without requiring account sign-in." }), error && _jsx("p", { className: "mt-3 text-sm text-[#dc2626]", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Host email" }), _jsx("input", { value: email, onChange: (e) => setEmail(e.target.value), required: true, type: "email", className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Display name" }), _jsx("input", { value: displayName, onChange: (e) => setDisplayName(e.target.value), required: true, className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Event name" }), _jsx("input", { value: eventName, onChange: (e) => setEventName(e.target.value), required: true, className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Description" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Location" }), _jsx("input", { value: location, onChange: (e) => setLocation(e.target.value), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Duration" }), _jsx("input", { type: "number", min: 15, step: 15, value: durationMinutes, onChange: (e) => setDurationMinutes(Number(e.target.value)), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Slot interval" }), _jsx("input", { type: "number", min: 15, step: 15, value: slotIntervalMinutes, onChange: (e) => setSlotIntervalMinutes(Number(e.target.value)), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsxs("label", { className: "block sm:col-span-2", children: [_jsx("span", { className: "text-sm text-[#475569]", children: "Hold duration (minutes)" }), _jsx("input", { type: "number", min: 1, step: 1, value: holdDurationMinutes, onChange: (e) => setHoldDurationMinutes(Number(e.target.value)), className: "mt-1 w-full rounded-xl border border-[#d1d5db] px-3 py-2.5" })] }), _jsx("div", { className: "sm:col-span-2 mt-2 flex justify-end", children: _jsx("button", { disabled: saving, className: "rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-medium text-white disabled:opacity-60", children: saving ? "Creating..." : "Create draft link" }) })] })] }) }));
}
