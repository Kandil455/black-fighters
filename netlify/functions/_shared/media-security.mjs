export const ALLOWED_MEDIA_HOSTS = Object.freeze([
  "upload.wikimedia.org",
  "live.staticflickr.com",
  "images.unsplash.com",
  "images.pexels.com",
  "cdn.pixabay.com",
]);

export const ALLOWED_MEDIA_LICENSES = Object.freeze(new Set(["cc0", "pdm", "by", "by-sa"]));

export function validateAllowedMediaUrl(value, errorCode = "INVALID_MEDIA_URL") {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error(errorCode);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error(errorCode);
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_MEDIA_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new Error("UNSUPPORTED_MEDIA_HOST");
  }
  return url;
}

export function isAllowedMediaUrl(value) {
  try {
    validateAllowedMediaUrl(value);
    return true;
  } catch {
    return false;
  }
}
