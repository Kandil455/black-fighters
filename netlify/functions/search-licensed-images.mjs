import { requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { ALLOWED_MEDIA_LICENSES, isAllowedMediaUrl } from "./_shared/media-security.mjs";


function cleanQuery(value) {
  return String(value || "").replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function openverseItem(item) {
  const license = String(item.license || "").toLowerCase();
  if (!ALLOWED_MEDIA_LICENSES.has(license) || !isAllowedMediaUrl(item.url) || !item.foreign_landing_url) return null;
  return {
    id: `openverse:${item.id}`,
    provider: "openverse",
    title: item.title || "Educational image",
    url: item.url,
    thumbnailUrl: item.thumbnail || item.url,
    creator: item.creator || "Unknown",
    creatorUrl: item.creator_url || "",
    license,
    licenseVersion: item.license_version || "",
    licenseUrl: item.license_url || "",
    sourcePage: item.foreign_landing_url,
    attribution: item.attribution || `${item.title || "Image"} — ${item.creator || "Unknown"} (${license.toUpperCase()})`,
    requiresReview: true,
  };
}

function wikimediaLicense(value = "") {
  const normalized = String(value).toLowerCase().replace(/\s+/g, " ");
  if (/public domain/.test(normalized)) return "pdm";
  if (/cc0/.test(normalized)) return "cc0";
  if (/cc by-sa/.test(normalized)) return "by-sa";
  if (/cc by/.test(normalized)) return "by";
  return null;
}

async function searchWikimedia(query, count) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(count),
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "900", format: "json", origin: "*",
  }).toString();
  const response = await fetch(url, { headers: { "User-Agent": "IIIAK-Education/1.0" }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return [];
  const payload = await response.json();
  return Object.values(payload?.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    const license = wikimediaLicense(meta.LicenseShortName?.value || meta.UsageTerms?.value);
    if (!info?.url || !license || !isAllowedMediaUrl(info.url)) return null;
    return {
      id: `wikimedia:${page.pageid}`,
      provider: "wikimedia",
      title: page.title?.replace(/^File:/, "") || "Educational image",
      url: info.url,
      thumbnailUrl: info.thumburl || info.url,
      creator: String(meta.Artist?.value || "Wikimedia contributor").replace(/<[^>]+>/g, "").slice(0, 180),
      creatorUrl: "",
      license,
      licenseVersion: "",
      licenseUrl: meta.LicenseUrl?.value || "",
      sourcePage: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`,
      attribution: String(meta.Credit?.value || meta.Attribution?.value || page.title || "Wikimedia Commons").replace(/<[^>]+>/g, " ").slice(0, 300),
      requiresReview: true,
    };
  }).filter(Boolean);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    await requireUser(event);
    const body = parseBody(event);
    const query = cleanQuery(body.query);
    if (query.length < 2) throw new Error("INVALID_IMAGE_QUERY");
    const count = Math.max(1, Math.min(20, Number(body.limit) || 12));
    let results = [];
    try {
      const url = new URL("https://api.openverse.org/v1/images/");
      url.search = new URLSearchParams({ q: query, license: "cc0,pdm,by,by-sa", page_size: String(count) }).toString();
      const response = await fetch(url, { headers: { "User-Agent": "IIIAK-Education/1.0" }, signal: AbortSignal.timeout(8_000) });
      if (response.ok) {
        const payload = await response.json();
        results = (payload.results || []).map(openverseItem).filter(Boolean);
      }
    } catch {
      // Wikimedia below remains available when Openverse is rate limited.
    }
    if (results.length < Math.min(6, count)) {
      const secondary = await searchWikimedia(query, count - results.length).catch(() => []);
      results.push(...secondary);
    }
    return json(200, { results: results.slice(0, count), requiresUserApproval: true });
  } catch (error) {
    return handleError(error);
  }
};
