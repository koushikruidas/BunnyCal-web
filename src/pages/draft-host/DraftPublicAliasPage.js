import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getDraftPublicUrl } from "@/modules/draft-host/tokenStore";
export function DraftPublicAliasPage() {
    const { slug } = useParams();
    const [target, setTarget] = useState(null);
    useEffect(() => {
        if (!slug || slug === "undefined" || slug === "null")
            return;
        const publicUrl = getDraftPublicUrl(slug);
        if (publicUrl)
            setTarget(publicUrl);
    }, [slug]);
    const relativeTarget = useMemo(() => {
        if (!target)
            return null;
        if (target.startsWith("http")) {
            try {
                const u = new URL(target);
                return `${u.pathname}${u.search}${u.hash}`;
            }
            catch {
                return null;
            }
        }
        return target.startsWith("/") ? target : `/${target}`;
    }, [target]);
    if (relativeTarget) {
        return _jsx(Navigate, { to: relativeTarget, replace: true });
    }
    return (_jsx("div", { className: "min-h-screen grid place-items-center bg-[#f8faff] px-4", children: _jsxs("div", { className: "max-w-lg rounded-2xl border border-[#e2e8f0] bg-white p-6", children: [_jsx("h1", { className: "text-xl font-semibold text-[#0f172a]", children: "Link setup required" }), _jsx("p", { className: "mt-2 text-sm text-[#64748b]", children: "This draft link can be opened after a host initializes it from the management flow on this device." }), slug && _jsx(Link, { className: "mt-4 inline-block rounded-lg border border-[#d1d5db] px-3 py-2 text-sm", to: `/d/${slug}/manage`, children: "Open manage page" })] }) }));
}
