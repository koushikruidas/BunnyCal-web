import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
export function OnboardingAvailabilityPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.upsertAvailabilityRules({
                rules: DAYS.map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00" })),
            });
            navigate("/onboarding/event");
        }
        catch (e) {
            console.error(e);
            setError("Unable to save availability rules.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-[#f8faff] p-6", children: _jsxs("div", { className: "max-w-3xl mx-auto bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm", children: [_jsx("div", { className: "text-sm text-[#6b7280]", children: "Step 2/3" }), _jsx("h1", { className: "text-2xl font-semibold text-[#111827] mt-1", children: "Set availability" }), _jsx("p", { className: "text-[#6b7280] mt-1", children: "Default template: weekdays, 9:00 AM to 5:00 PM." }), error && _jsx("p", { className: "text-sm text-[#dc2626] mt-3", children: error }), _jsx("div", { className: "mt-6 grid grid-cols-5 gap-2", children: DAYS.map((d) => (_jsx("div", { className: "rounded-xl border border-[#d1d5db] p-3 text-center text-sm bg-[#eef2ff]", children: d.slice(0, 3) }, d))) }), _jsx("div", { className: "mt-6 flex justify-end", children: _jsx("button", { onClick: save, disabled: saving, className: "px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7] disabled:opacity-60", children: saving ? "Saving..." : "Save and continue" }) })] }) }));
}
