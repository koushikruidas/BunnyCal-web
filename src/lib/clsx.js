export function clsx(...parts) {
    const out = [];
    for (const p of parts) {
        if (!p)
            continue;
        if (typeof p === "string" || typeof p === "number")
            out.push(String(p));
        else
            for (const k in p)
                if (p[k])
                    out.push(k);
    }
    return out.join(" ");
}
export default clsx;
