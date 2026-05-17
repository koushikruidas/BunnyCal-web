import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/urls";
import { PageShell, Stack, Inline } from "@/ui/layout";
import { Button } from "@/ui/controls";
export function DraftOnboardingSuccessPage() {
    const [copied, setCopied] = useState(false);
    const link = useMemo(() => {
        const stored = sessionStorage.getItem("createdEventLink");
        return stored ? toAbsoluteUrl(stored) : "";
    }, []);
    const slug = useMemo(() => sessionStorage.getItem("createdDraftSlug") ?? "", []);
    const copy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
    };
    return (_jsx(PageShell, { width: "comfort", children: _jsx("div", { className: "rounded-3xl border border-border-subtle bg-surface p-7 md:p-10 text-center shadow-floating", children: _jsxs(Stack, { gap: 5, children: [_jsx("div", { className: "mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 grid place-items-center text-2xl", children: "\u2713" }), _jsxs(Stack, { gap: 2, children: [_jsx("h1", { className: "text-3xl font-semibold tracking-tight text-text-primary", children: "Your booking link is live" }), _jsx("p", { className: "text-text-secondary", children: "Share it with clients and start accepting meetings instantly." })] }), _jsx("div", { className: "rounded-xl border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-text-secondary break-all", children: link }), _jsxs(Inline, { gap: 3, wrap: true, justify: "center", children: [_jsx(Button, { variant: "primary", disabled: !link, onClick: copy, children: copied ? "Copied" : "Copy link" }), _jsx("a", { href: link || "#", className: "rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-text-primary", children: "Preview booking page" }), slug && _jsx(Link, { to: `/d/${slug}/manage`, className: "rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-text-primary", children: "Manage link" })] })] }) }) }));
}
