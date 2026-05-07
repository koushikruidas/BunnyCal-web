import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export function OnboardingSuccessPage() {
    const [copied, setCopied] = useState(false);
    const link = useMemo(() => sessionStorage.getItem("createdEventLink") ?? `${window.location.origin}/book/samantha/intro-30`, []);
    const copy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
    };
    return (_jsx("div", { className: "min-h-screen grid place-items-center bg-[#f8faff] px-6", children: _jsxs("div", { className: "w-full max-w-xl bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-lg text-center", children: [_jsx("div", { className: "text-4xl mb-3", children: "\uD83C\uDF89" }), _jsx("h1", { className: "text-3xl font-semibold text-[#111827]", children: "Your scheduling link is ready" }), _jsx("p", { className: "text-[#6b7280] mt-2", children: "Share this link so people can book instantly." }), _jsx("div", { className: "mt-5 rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#374151] break-all", children: link }), _jsxs("div", { className: "mt-6 flex gap-3 justify-center", children: [_jsx("button", { onClick: copy, className: "px-6 py-3 rounded-xl text-white bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899]", children: copied ? "Copied" : "Copy Link" }), _jsx("a", { href: link, className: "px-6 py-3 rounded-xl border border-[#d1d5db] bg-white", children: "Preview Booking Page" })] })] }) }));
}
