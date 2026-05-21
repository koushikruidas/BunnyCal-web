function keyFor(bookingId) {
    return `booking_manage_token:${bookingId}`;
}
function parseRecord(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return null;
        if (!parsed.token || typeof parsed.token !== "string")
            return null;
        return {
            token: parsed.token,
            username: typeof parsed.username === "string" ? parsed.username : undefined,
            eventTypeSlug: typeof parsed.eventTypeSlug === "string" ? parsed.eventTypeSlug : undefined,
            updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
        };
    }
    catch {
        return null;
    }
}
export function loadGuestManageToken(bookingId) {
    if (typeof window === "undefined")
        return null;
    return parseRecord(window.localStorage.getItem(keyFor(bookingId)));
}
export function saveGuestManageToken(bookingId, record) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(keyFor(bookingId), JSON.stringify(record));
}
export function clearGuestManageToken(bookingId) {
    if (typeof window === "undefined")
        return;
    window.localStorage.removeItem(keyFor(bookingId));
}
