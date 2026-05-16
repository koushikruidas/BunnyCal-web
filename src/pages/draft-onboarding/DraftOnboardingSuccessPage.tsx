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

  return (
    <PageShell width="comfort">
      <div className="rounded-3xl border border-border-subtle bg-surface p-7 md:p-10 text-center shadow-floating">
        <Stack gap={5}>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 grid place-items-center text-2xl">✓</div>
          <Stack gap={2}>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Your booking link is live</h1>
            <p className="text-text-secondary">Share it with clients and start accepting meetings instantly.</p>
          </Stack>
          <div className="rounded-xl border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-text-secondary break-all">{link}</div>
          <Inline gap={3} wrap justify="center">
            <Button variant="primary" disabled={!link} onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a href={link || "#"} className="rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-text-primary">Preview booking page</a>
            {slug && <Link to={`/d/${slug}/manage`} className="rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-text-primary">Manage link</Link>}
          </Inline>
        </Stack>
      </div>
    </PageShell>
  );
}
