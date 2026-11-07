import { getPurchasableProduct } from "../../../src/lib/economyCatalog.js";

export { getPurchasableProduct };

/**
 * Cosmetic catalogue — RETIRED.
 *
 * Frames, banners, titles, orbit gems and mascot skins were removed from the
 * product (owner decision, Nov 2026 — this is a study platform, not a game).
 *
 * `cosmeticItem()` is kept as a hard refusal instead of being deleted so any
 * stale client build still calling the purchase endpoint gets a clear error and
 * is never charged. The previous implementation imported the deleted avatar and
 * mascot catalogues and cost credits for items nobody could equip.
 */
export function cosmeticItem() {
  return null;
}

export function activationCode() {
  return `IIIAK-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
