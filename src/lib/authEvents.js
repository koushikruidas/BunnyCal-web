const UNAUTHORIZED_EVENT = "auth:unauthorized";
export function emitUnauthorized() {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
export function addUnauthorizedListener(handler) {
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}
