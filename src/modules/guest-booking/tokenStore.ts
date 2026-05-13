export interface GuestManageTokenRecord {
  token: string;
  username?: string;
  eventTypeSlug?: string;
  updatedAt: number;
}

function keyFor(bookingId: string) {
  return `booking_manage_token:${bookingId}`;
}

function parseRecord(raw: string | null): GuestManageTokenRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GuestManageTokenRecord>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.token || typeof parsed.token !== "string") return null;
    return {
      token: parsed.token,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
      eventTypeSlug: typeof parsed.eventTypeSlug === "string" ? parsed.eventTypeSlug : undefined,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadGuestManageToken(bookingId: string): GuestManageTokenRecord | null {
  if (typeof window === "undefined") return null;
  return parseRecord(window.localStorage.getItem(keyFor(bookingId)));
}

export function saveGuestManageToken(bookingId: string, record: GuestManageTokenRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(bookingId), JSON.stringify(record));
}

export function clearGuestManageToken(bookingId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(bookingId));
}
