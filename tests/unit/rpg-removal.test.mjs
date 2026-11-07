/**
 * RPG cosmetics removal — regression guard.
 *
 * Owner decision (Nov 2026): this is a study platform, not a game. Dragon
 * frames, animated titles, 3D orbit gems, banners, the theme/3D tab, 3D mascot
 * models and the "Final Boss" title were all removed. These tests fail if any
 * of it is reintroduced, or if a deleted module is imported again.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;

/**
 * Strip comments before asserting, so a file may explain WHY the RPG layer was
 * removed without tripping its own guard.
 */
const code = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const REMOVED_FILES = [
  "src/components/profile/AnimatedDragonFrame.jsx",
  "src/components/profile/AnimatedTitle.jsx",
  "src/components/profile/Avatar3DOrbit.jsx",
  "src/components/profile/BannerStore.jsx",
  "src/components/profile/DecorPicker.jsx",
  "src/components/profile/FrameStore.jsx",
  "src/components/profile/OrbitEffectGlyph.jsx",
  "src/components/profile/OrbitStore.jsx",
  "src/components/profile/ProfileBanner.jsx",
  "src/components/profile/Tilt3DCard.jsx",
  "src/components/profile/TitleStore.jsx",
  "src/components/course/Mascot3DModel.jsx",
  "src/components/course/MascotSkin.jsx",
  "src/components/course/MascotSkinStore.jsx",
  "src/lib/mascotSkins.js",
];

test("every RPG/mascot module is gone from disk", () => {
  for (const file of REMOVED_FILES) {
    assert.equal(
      existsSync(join(ROOT, file)),
      false,
      `${file} came back — the RPG cosmetics feature was removed on purpose`,
    );
  }
});

test("nothing imports a removed RPG/mascot module", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
      } else if (/\.(jsx?|mjs)$/.test(entry.name)) {
        const src = code(readFileSync(join(ROOT, rel), "utf8"));
        for (const removed of REMOVED_FILES) {
          const base = removed.split("/").pop().replace(/\.jsx?$/, "");
          if (
            new RegExp(`from\\s+["'][^"']*${base}(\\.jsx?)?["']`).test(src)
          ) {
            offenders.push(`${rel} → ${base}`);
          }
        }
      }
    }
  };
  walk("src");
  walk("netlify");
  assert.deepEqual(offenders, [], `dead imports found:\n${offenders.join("\n")}`);
});

test("the RPG frame/level catalogue is gone from avatars.js", () => {
  const src = code(readFileSync(join(ROOT, "src/lib/avatars.js"), "utf8"));
  for (const token of [
    "AVATAR_FRAMES",
    "PROFILE_BANNERS",
    "ORBIT_EFFECTS",
    "PROFILE_TITLES",
    "finalboss",
  ]) {
    assert.equal(
      src.includes(token),
      false,
      `${token} is still exported from avatars.js`,
    );
  }
  // The pieces the live UI still needs must remain.
  assert.match(src, /export const AVATAR_STYLES/);
  assert.match(src, /export const PROFILE_COLORS/);
});

test("the Final Boss title is gone everywhere", () => {
  const files = [
    "src/lib/avatars.js",
    "src/pages/Profile.jsx",
    "src/components/profile/ProfileCard.jsx",
  ];
  for (const file of files) {
    const src = code(readFileSync(join(ROOT, file), "utf8"));
    assert.equal(
      /الزعيم النهائي|FINAL BOSS|finalboss/i.test(src),
      false,
      `${file} still mentions the Final Boss title`,
    );
  }
});

test("the profile page no longer offers RPG/3D tabs", () => {
  const src = readFileSync(join(ROOT, "src/pages/Profile.jsx"), "utf8");
  for (const token of [
    "RPG Frames",
    "3D Orbits",
    "Banners",
    "Theme & 3D",
    "3D Models",
    "الإطارات المتحركة",
    "جواهر المدار",
    "البنرات المتحركة",
    "المجسمات 3D",
  ]) {
    assert.equal(src.includes(token), false, `Profile.jsx still has the "${token}" tab`);
  }
});

test("AnimatedAvatar renders a photo only, not RPG frames", () => {
  const src = code(readFileSync(join(ROOT, "src/components/AnimatedAvatar.jsx"), "utf8"));
  for (const token of ["AVATAR_FRAMES", "RpgFrameArt", "SpecialFx", "archetype", "dragon"]) {
    assert.equal(
      src.includes(token),
      false,
      `AnimatedAvatar still draws RPG layer "${token}"`,
    );
  }
  assert.match(src, /<img/, "the avatar photo must still render");
});

test("cosmetic purchases are refused so no one is charged for a removed item", () => {
  const client = readFileSync(join(ROOT, "src/api/index.js"), "utf8");
  const server = readFileSync(
    join(ROOT, "netlify/functions/_shared/catalog.mjs"),
    "utf8",
  );
  assert.match(client, /purchaseCosmetic[\s\S]{0,400}?throw new Error/, "client must refuse");
  assert.match(server, /export function cosmeticItem\(\)\s*\{\s*return null;/, "server must refuse");
});

test("the daily credit reward survives the mascot removal", () => {
  const api = readFileSync(join(ROOT, "src/api/index.js"), "utf8");
  assert.match(api, /mascotDailyReward/, "students keep their daily credit");
  assert.match(api, /DAILY_REWARD/);
});
