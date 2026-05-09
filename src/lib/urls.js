export function toAbsoluteUrl(pathOrUrl) {
    if (!pathOrUrl)
        return window.location.origin;
    if (/^https?:\/\//i.test(pathOrUrl))
        return pathOrUrl;
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${window.location.origin}${path}`;
}
export function toPublicBookingPath(username, slug) {
    return `/public/${username}/${slug}`;
}
