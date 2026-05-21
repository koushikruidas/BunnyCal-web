function normalizeApiBaseUrl(input) {
    try {
        const url = new URL(input);
        if (url.hostname === "127.0.0.1") {
            url.hostname = "localhost";
        }
        return url.toString().replace(/\/$/, "");
    }
    catch {
        return input;
    }
}
export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080");
