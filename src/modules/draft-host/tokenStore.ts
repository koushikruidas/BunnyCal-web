const keyFor = (slug: string) => `draft_mgmt_${slug}`;
const publicUrlKeyFor = (slug: string) => `draft_public_${slug}`;

const assertSlug = (slug: string) => {
  if (!slug || slug === "undefined" || slug === "null") {
    throw new Error("Invalid draft slug for storage");
  }
};

export function saveDraftToken(slug: string, token: string) {
  assertSlug(slug);
  localStorage.setItem(keyFor(slug), token);
}

export function getDraftToken(slug: string) {
  assertSlug(slug);
  return localStorage.getItem(keyFor(slug));
}

export function removeDraftToken(slug: string) {
  assertSlug(slug);
  localStorage.removeItem(keyFor(slug));
}

export function saveDraftPublicUrl(slug: string, publicUrl: string) {
  assertSlug(slug);
  localStorage.setItem(publicUrlKeyFor(slug), publicUrl);
}

export function getDraftPublicUrl(slug: string) {
  assertSlug(slug);
  return localStorage.getItem(publicUrlKeyFor(slug));
}
