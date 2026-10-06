// One place that decides where the server functions live (P7-01 / FRONTEND_TODO F-12b).
// VITE_FUNCTIONS_BASE_URL unset  => "/api" (same origin, exactly as before).
// VITE_FUNCTIONS_BASE_URL=https://api.blackfighters.site/api => every call goes to the dedicated API host.

/** @param {string | undefined} raw */
export function normalizeApiBase(raw) {
  const v = typeof raw === "string" ? raw.trim() : "";
  return (v || "/api").replace(/\/+$/, "");
}

export const API_BASE = normalizeApiBase(import.meta.env?.VITE_FUNCTIONS_BASE_URL);

/** Full URL of a server function: apiUrl("upload-media") -> "<API_BASE>/upload-media". */
export function apiUrl(name, base = API_BASE) {
  return `${base}/${String(name).replace(/^\/+/, "")}`;
}

/**
 * Stored media URLs look like "/api/stream-media?p=...&t=...". When the API lives on another origin, a relative
 * URL would hit the web host instead, so prefix the API origin. Everything else (absolute URLs, data:, blob:,
 * other paths) is returned unchanged; with the default base nothing changes at all.
 * @param {unknown} url
 */
export function resolveMediaUrl(url, base = API_BASE) {
  if (typeof url !== "string" || !url.startsWith("/api/stream-media")) return url;
  if (!/^https?:\/\//i.test(base)) return url;
  return base + url.slice("/api".length);
}
