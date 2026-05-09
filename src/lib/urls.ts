export function toAbsoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return window.location.origin;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${window.location.origin}${path}`;
}

export function toPublicBookingPath(username: string, slug: string) {
  return `/public/${username}/${slug}`;
}
