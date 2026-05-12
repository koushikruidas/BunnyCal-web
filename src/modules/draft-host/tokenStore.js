const keyFor = (slug) => `draft_mgmt_${slug}`;
const publicUrlKeyFor = (slug) => `draft_public_${slug}`;
const assertSlug = (slug) => {
    if (!slug || slug === "undefined" || slug === "null") {
        throw new Error("Invalid draft slug for storage");
    }
};
export function saveDraftToken(slug, token) {
    assertSlug(slug);
    localStorage.setItem(keyFor(slug), token);
}
export function getDraftToken(slug) {
    assertSlug(slug);
    return localStorage.getItem(keyFor(slug));
}
export function removeDraftToken(slug) {
    assertSlug(slug);
    localStorage.removeItem(keyFor(slug));
}
export function saveDraftPublicUrl(slug, publicUrl) {
    assertSlug(slug);
    localStorage.setItem(publicUrlKeyFor(slug), publicUrl);
}
export function getDraftPublicUrl(slug) {
    assertSlug(slug);
    return localStorage.getItem(publicUrlKeyFor(slug));
}
