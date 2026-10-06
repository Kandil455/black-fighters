import { AVATAR_FRAMES, ORBIT_EFFECTS, PROFILE_BANNERS, PROFILE_TITLES } from "../../../src/lib/avatars.js";
import { MASCOT_SKINS } from "../../../src/lib/mascotSkins.js";
import { getPurchasableProduct } from "../../../src/lib/economyCatalog.js";

export { getPurchasableProduct };

export function cosmeticItem(type, key) {
  const catalogs = {
    frame: { items: AVATAR_FRAMES, field: "owned_frames" },
    banner: { items: PROFILE_BANNERS, field: "owned_banners" },
    title: { items: PROFILE_TITLES, field: "owned_titles" },
    orbit: { items: ORBIT_EFFECTS, field: "owned_orbit_effects" },
    mascot: {
      items: Object.fromEntries(MASCOT_SKINS.map((item) => [item.id, { ...item, label: item.name }])),
      field: "owned_mascot_skins",
      activeField: "active_mascot_skin",
    },
  };
  const catalog = catalogs[type];
  const item = catalog?.items?.[key];
  if (!catalog || !item || item.exclusive || Number(item.price) < 0) return null;
  return { catalog, item };
}

export function activationCode() {
  return `IIIAK-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
