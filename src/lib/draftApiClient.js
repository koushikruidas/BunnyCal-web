import { publicApiClient } from "@/lib/publicApiClient";
export async function draftApiClient(path, draftToken, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("X-Draft-Token", draftToken);
    return publicApiClient(path, {
        ...options,
        headers,
    });
}
