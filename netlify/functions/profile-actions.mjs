import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { isAdminProfile } from "./_shared/server-ai.mjs";

// ─── profile-actions: the single server-authoritative path for profile saves ──
// The browser can no longer write its own profile row: every save (the Save
// Loadout button, avatar auto-save, privacy toggles) goes through here so the
// server can enforce an explicit field whitelist, ownership of cosmetic items,
// and safe value shapes. Protected/economic fields (credits, plans, role…) are
// NOT settable here — those move only through their dedicated flows.

const MAX_NAME_CHARS = 35;
const MAX_AVATAR_CHARS = 2_000_000; // ~2 MB data-URL / https URL cap
const MAX_ORBIT_EFFECTS = 5;

const ALLOWED_PROFILE_COLORS = new Set([
  "cyan", "emerald", "amber", "rose", "violet", "sky", "slate", "gold",
]);

// Cosmetic whitelist mirrors src/lib/avatars.js + mascotSkins ids at runtime —
// the server never trusts client-owned lists for authorization.
async function loadCosmeticAllowlists() {
  const { AVATAR_FRAMES, PROFILE_BANNERS, PROFILE_TITLES, ORBIT_EFFECTS } = await import(
    "../../src/lib/avatars.js"
  );
  const { MASCOT_SKINS } = await import("../../src/lib/mascotSkins.js");
  // Catalogs are id→item objects; accept arrays too for future-proofing
  const ids = (catalog) => {
    const raw = Array.isArray(catalog)
      ? catalog.map((item) => [String(item?.id || item?.key || item), true])
      : Object.entries(catalog || {});
    return new Set(raw.map(([key]) => String(key)).filter(Boolean));
  };
  return {
    frames: ids(AVATAR_FRAMES),
    banners: ids(PROFILE_BANNERS),
    titles: ids(PROFILE_TITLES),
    orbits: ids(ORBIT_EFFECTS),
    mascots: ids(MASCOT_SKINS),
  };
}

function cleanFullName(value) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .trim()
    .slice(0, MAX_NAME_CHARS);
  return text;
}

function cleanAvatar(value) {
  const raw = String(value ?? "");
  if (!raw) return { url: "", isVideo: false };
  if (raw.startsWith("linear-gradient")) {
    return { url: raw.slice(0, 600), isVideo: false };
  }
  if (/^https:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/.test(raw)) {
    return { url: raw.slice(0, MAX_AVATAR_CHARS), isVideo: raw.endsWith(".mp4") || raw.endsWith(".webm") };
  }
  if (raw.startsWith("data:image/") && raw.length <= MAX_AVATAR_CHARS) {
    return { url: raw, isVideo: false };
  }
  // Anything else (javascript:, data:video, blob:) is rejected
  return { url: "", isVideo: false };
}

function cleanCosmeticKey(value, allowlist) {
  const key = String(value ?? "").trim();
  if (!key || key === "none") return "none";
  if (allowlist.has(key)) return key;
  return "none"; // not owned / unknown → fall back to default, never throw
}

function cleanOrbitEffects(value, allowlist) {
  const list = Array.isArray(value) ? value : value && value !== "none" ? [value] : [];
  return [...new Set(list.map((v) => String(v).trim()).filter((v) => allowlist.has(v)))].slice(0, MAX_ORBIT_EFFECTS);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const action = String(body.action || "");

    if (action !== "updateProfile") return json(400, { error: "UNSUPPORTED_ACTION" });

    const patch = body.patch && typeof body.patch === "object" ? body.patch : {};
    const allowlists = await loadCosmeticAllowlists();

    const userRef = adminDb.collection("users").doc(user.uid);
    const snap = await userRef.get();
    if (!snap.exists) throw new Error("PROFILE_NOT_FOUND");
    const profile = snap.data();
    const admin = isAdminProfile(user, profile);

    // ── Build a strictly whitelisted update object ──────────────────────────
    const update = { updatedAt: FieldValue.serverTimestamp() };

    if ("full_name" in patch) update.full_name = cleanFullName(patch.full_name) || profile.full_name || "Black Fighters Student";
    if ("avatar_url" in patch || "avatar_is_video" in patch) {
      const cleaned = cleanAvatar(patch.avatar_url ?? profile.avatar_url ?? "");
      update.avatar_url = cleaned.url || null;
      // The client's isVideo flag is authoritative for validated URLs — media
      // asset links have no file extension to sniff.
      update.avatar_is_video = cleaned.url ? Boolean("avatar_is_video" in patch ? patch.avatar_is_video : cleaned.isVideo) : false;
    }
    if ("profile_frame" in patch || "active_frame" in patch) {
      const key = cleanCosmeticKey(patch.profile_frame ?? patch.active_frame, allowlists.frames);
      update.profile_frame = key;
      update.active_frame = key;
    }
    if ("active_banner" in patch) update.active_banner = cleanCosmeticKey(patch.active_banner, allowlists.banners);
    if ("profile_title_key" in patch || "active_title" in patch) {
      const key = cleanCosmeticKey(patch.profile_title_key ?? patch.active_title, allowlists.titles);
      update.profile_title_key = key;
      update.active_title = key;
    }
    if ("profile_color" in patch) {
      const color = String(patch.profile_color || "").trim();
      update.profile_color = ALLOWED_PROFILE_COLORS.has(color) ? color : (profile.profile_color || "cyan");
    }
    if ("avatar_3d_model" in patch || "active_orbit_effects" in patch || "active_orbit_effect" in patch) {
      const effects = cleanOrbitEffects(
        patch.active_orbit_effects ?? patch.avatar_3d_model ?? patch.active_orbit_effect,
        allowlists.orbits
      );
      update.active_orbit_effects = effects;
      update.active_orbit_effect = effects[0] || "none";
      update.avatar_3d_model = effects[0] || "none";
    }
    if ("enable_3d" in patch) update.enable_3d = Boolean(patch.enable_3d);
    if ("allow_friend_requests" in patch) update.allow_friend_requests = Boolean(patch.allow_friend_requests);
    if ("show_stats" in patch) update.show_stats = Boolean(patch.show_stats);

    // ── Ownership enforcement (server-side source of truth) ─────────────────
    // A cosmetic key that the user does not OWN is silently reset to default.
    const owned = (field) => (Array.isArray(profile[field]) ? profile[field] : []);
    if (update.profile_frame && update.profile_frame !== "none" && !admin && !owned("owned_frames").includes(update.profile_frame)) {
      update.profile_frame = "none";
      update.active_frame = "none";
    }
    if (update.active_banner && update.active_banner !== "none" && !admin && !owned("owned_banners").includes(update.active_banner)) {
      update.active_banner = "none";
    }
    if (update.profile_title_key && update.profile_title_key !== "none" && !admin && !owned("owned_titles").includes(update.profile_title_key)) {
      update.profile_title_key = "none";
      update.active_title = "none";
    }
    if (!admin && update.active_orbit_effects?.length) {
      update.active_orbit_effects = update.active_orbit_effects.filter((key) => owned("owned_orbit_effects").includes(key));
      update.active_orbit_effect = update.active_orbit_effects[0] || "none";
      update.avatar_3d_model = update.active_orbit_effects[0] || "none";
    }

    await userRef.update(update);

    const afterSnap = await userRef.get();
    const { email: _email, ...safeProfile } = afterSnap.data() || {};
    return json(200, { ok: true, profile: safeProfile });
  } catch (error) {
    return handleError(error);
  }
};
