import { publicApiClient } from "@/lib/publicApiClient";

export async function draftApiClient<T = unknown>(path: string, draftToken: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Draft-Token", draftToken);
  return publicApiClient<T>(path, {
    ...options,
    headers,
  });
}
