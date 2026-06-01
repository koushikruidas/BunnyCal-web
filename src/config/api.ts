function normalizeApiBaseUrl(input: string) {
  try {
    const url = new URL(input);
    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return input;
  }
}

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!RAW_API_BASE_URL) {
  throw new Error("[config] Missing required VITE_API_BASE_URL.");
}

const normalizedApiBaseUrl = normalizeApiBaseUrl(RAW_API_BASE_URL);

if (import.meta.env.PROD) {
  const parsed = new URL(normalizedApiBaseUrl);
  const host = parsed.hostname.toLowerCase();
  const isUnsafeHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isUnsafeHost) {
    throw new Error(`[config] Invalid VITE_API_BASE_URL for production: ${normalizedApiBaseUrl}`);
  }
}

export const API_BASE_URL = normalizedApiBaseUrl;
