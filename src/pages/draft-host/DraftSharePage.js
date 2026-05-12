import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/services";
import { getDraftPublicUrl, getDraftToken, saveDraftPublicUrl } from "@/modules/draft-host/tokenStore";
export function DraftSharePage() {
    const { slug } = useParams();
    const [publicUrl, setPublicUrl] = useState("");
    const [error, setError] = useState(null);
    useEffect(() => {
        const run = async () => {
            if (!slug || slug === "undefined" || slug === "null") {
                setError("Invalid draft link.");
                return;
            }
            const cached = getDraftPublicUrl(slug);
            if (cached)
                setPublicUrl(cached);
            const token = getDraftToken(slug);
            if (!token)
                return;
            try {
                const draft = await api.getDraftHost(slug, token);
                if (draft.publicUrl) {
                    setPublicUrl(draft.publicUrl);
                    saveDraftPublicUrl(slug, draft.publicUrl);
                }
            }
            catch (err) {
                console.error(err);
                setError("Unable to refresh share details.");
            }
        };
        void run();
    }, [slug]);
    const absolute = publicUrl.startsWith("http") ? publicUrl : `${window.location.origin}${publicUrl.startsWith("/") ? publicUrl : `/${publicUrl}`}`;
    return (_jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_42%,#f9fbff_100%)] px-4 py-6 sm:px-5 sm:py-8", children: _jsxs("div", { className: "mx-auto max-w-3xl rounded-3xl border border-[#dbe4f8] bg-white p-5 md:p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-[#64748b]", children: "Draft Share" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]", children: "Share scheduling link" }), error && _jsx("p", { className: "mt-3 text-sm text-[#dc2626]", children: error }), _jsxs("div", { className: "mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4", children: [_jsx("p", { className: "text-sm text-[#475569]", children: "Public booking URL" }), _jsx("p", { className: "mt-1 break-all text-sm text-[#1d4ed8]", children: absolute || "Unavailable" }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx("button", { disabled: !absolute, onClick: () => navigator.clipboard.writeText(absolute), className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm disabled:opacity-50", children: "Copy link" }), _jsx("a", { href: absolute || "#", className: "rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm", children: "Open link" })] })] }), slug && (_jsxs("div", { className: "mt-6 flex flex-wrap gap-2", children: [_jsx(Link, { to: `/d/${slug}/manage`, className: "rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm", children: "Back to manage" }), _jsx(Link, { to: `/d/${slug}/claim`, className: "rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-medium text-white", children: "Claim account" })] }))] }) }));
}
