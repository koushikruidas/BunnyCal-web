import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
function getInitials(name) {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0)
        return "?";
    if (words.length === 1)
        return words[0].slice(0, 1).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
export function Avatar({ name, image, className = "w-10 h-10" }) {
    const [hasImageError, setHasImageError] = useState(false);
    const initials = useMemo(() => getInitials(name), [name]);
    const showImage = Boolean(image) && !hasImageError;
    if (showImage) {
        return (_jsx("img", { src: image ?? undefined, alt: name, className: `${className} rounded-full object-cover border border-[#d1d5db]`, onError: () => setHasImageError(true) }));
    }
    return (_jsx("div", { "aria-label": name, className: `${className} rounded-full bg-[#e5e7eb] text-[#374151] border border-[#d1d5db] flex items-center justify-center text-sm font-semibold`, children: initials }));
}
