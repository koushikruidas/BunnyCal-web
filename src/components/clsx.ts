// Tiny clsx replacement to avoid extra deps.
type V = string | number | false | null | undefined | Record<string, boolean>;
export default function clsx(...parts: V[]): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === "string" || typeof p === "number") out.push(String(p));
    else for (const k in p) if (p[k]) out.push(k);
  }
  return out.join(" ");
}
