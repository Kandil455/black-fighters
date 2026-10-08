/**
 * Icon policy — one icon library, one module, no animation JSON.
 *
 * Context: the platform shipped THREE overlapping icon systems (18 Lottie JSON
 * animations duplicated at 2.4 MB in `public/lottie` + `src/assets/lottie`, 17
 * hand-rolled gradient SVGs, and a set of PNG "3D" icons). Beyond the download
 * cost, every one of them either repainted with `filter: drop-shadow()` or kept
 * an infinite keyframe alive, so a page with 30 icons never went idle — the
 * measured cause of the lag on 2–4 GB devices.
 *
 * `src/components/ui/icons.jsx` is now the only icon source.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, globSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

test("no Lottie animation assets or modules remain", () => {
  assert.equal(existsSync("public/lottie"), false, "public/lottie returned (2.4 MB of animation JSON)");
  assert.equal(existsSync("src/assets/lottie"), false, "src/assets/lottie returned");
  for (const retired of [
    "src/components/ui/LottieIcons.jsx",
    "src/components/ui/LottieSwitch.jsx",
    "src/components/ui/AnimatedMicroIcons.jsx",
    "src/components/ui/Custom3DIcons.jsx",
  ]) {
    assert.equal(existsSync(retired), false, `${retired} is back — it was replaced by src/components/ui/icons.jsx`);
  }
});

test("lottie-react is not a dependency", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const field of ["dependencies", "devDependencies"]) {
    const deps = pkg[field] || {};
    assert.equal("lottie-react" in deps, false, `lottie-react is listed in ${field}`);
  }
});

test("no module imports a retired icon system", () => {
  const offenders = [];
  for (const file of globSync("src/**/*.{js,jsx}")) {
    const source = read(file);
    if (/from\s+["'][^"']*(LottieIcons|LottieSwitch|AnimatedMicroIcons|Custom3DIcons)["']/.test(source)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], "these modules still import a retired icon system; use @/components/ui/icons");
});

test("icons.jsx is the single icon source and stays lucide-only", () => {
  const src = read("src/components/ui/icons.jsx");
  assert.ok(src.includes("lucide-react"), "the unified icon layer must import from lucide-react");
  assert.equal(
    /from\s+["']lottie-react["']/.test(src),
    false,
    "a Lottie import returned to the icon layer",
  );
  // Every semantic wrapper must reference a name that exists in ICON_MAP —
  // catches a typo that would silently render nothing.
  const mapBody = src.slice(src.indexOf("const ICON_MAP"), src.indexOf("const TONE_CLASS"));
  const known = new Set([...mapBody.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((m) => m[1]));
  assert.ok(known.size >= 30, `ICON_MAP looks truncated (${known.size} entries)`);
  const wrappers = [...src.matchAll(/export const (\w+) = semantic\("([^"]+)"\)/g)];
  assert.ok(wrappers.length >= 25, `expected the semantic icon vocabulary, found ${wrappers.length}`);
  for (const [, componentName, iconName] of wrappers) {
    assert.ok(known.has(iconName), `${componentName} points at unknown icon "${iconName}"`);
  }
});

test("the sidebar renders static icons (no infinite animation in repeated contexts)", () => {
  const layout = read("src/components/Layout.jsx");
  assert.equal(
    /AnimatedMicroIcons|LottieIcons/.test(layout),
    false,
    "the sidebar is back on an animated icon system — it mounts on every page and never unmounts",
  );
  assert.ok(
    layout.includes("@/components/ui/icons"),
    "the sidebar must use the unified icon module",
  );
});

test("retired 3D PNG icons are gone from public/", () => {
  assert.equal(existsSync("public/icons/credit-coin-3d.png"), false, "credit-coin-3d.png returned");
  assert.equal(existsSync("public/icons/file-save-3d.png"), false, "file-save-3d.png returned");
});
