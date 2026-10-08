/**
 * Performance budgets and font hygiene.
 *
 * These are the guardrails for the "must be fast on a 2–4 GB phone" requirement:
 * a budget that nothing checks is a wish. The build-output assertions skip
 * themselves when `dist/` is absent (e.g. `npm test` on a clean checkout) so the
 * suite never depends on a prior build.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

// Ceilings are deliberately close to the measured post-refactor sizes so a
// regression fails here instead of on a student's phone.
const ENTRY_JS_BUDGET_KB = 700;      // was 982 KB before the icon/telegram cleanup
const FIRST_LOAD_JS_BUDGET_KB = 2400; // entry + its static vendor imports

function assetsDir() {
  return "dist/assets";
}

function jsFiles() {
  const dir = assetsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ file: `${dir}/${f}`, bytes: statSync(`${dir}/${f}`).size }));
}

test("entry chunk stays under budget", () => {
  const manifestPath = "dist/.vite/manifest.json";
  if (!existsSync(manifestPath)) return; // no build in this checkout
  const manifest = JSON.parse(read(manifestPath));
  const entry = Object.values(manifest).find((e) => e.isEntry);
  assert.ok(entry?.file, "no entry chunk in the Vite manifest");
  const kb = statSync(`dist/${entry.file}`).size / 1024;
  assert.ok(
    kb <= ENTRY_JS_BUDGET_KB,
    `entry chunk is ${kb.toFixed(0)} KB (budget ${ENTRY_JS_BUDGET_KB} KB). ` +
      "Something heavy (an animation runtime, a server module, a 3D library) was " +
      "imported into the app shell again.",
  );
});

test("first-load JS stays under budget", () => {
  const manifestPath = "dist/.vite/manifest.json";
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(read(manifestPath));
  const sizeOf = (key) => (manifest[key]?.file ? statSync(`dist/${manifest[key].file}`).size : 0);

  let total = 0;
  const seen = new Set();
  const visit = (key) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    total += sizeOf(key);
    for (const imp of manifest[key]?.imports || []) visit(imp);
  };
  for (const [key, entry] of Object.entries(manifest)) if (entry.isEntry) visit(key);

  const kb = total / 1024;
  assert.ok(
    kb <= FIRST_LOAD_JS_BUDGET_KB,
    `first-load JS is ${kb.toFixed(0)} KB (budget ${FIRST_LOAD_JS_BUDGET_KB} KB) — ` +
      "a heavy module joined the entry graph.",
  );
});

test("heavy optional libraries stay OUT of the entry graph (code-split)", () => {
  const manifestPath = "dist/.vite/manifest.json";
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(read(manifestPath));

  // Modules that must only ever load on demand. `three` powers the opt-in 3D
  // mascot, the PDF/Office stack powers export, and YouTubeAIStudio is a single
  // route — none of them may sit on the launch path for a 2 GB phone.
  const heavyMarkers = {
    "vendor-three": /three/i,
    "pdfjs": /pdfjs|pdf\.worker|build\/pdf/i,
    "jspdf": /jspdf/i,
    "pptxgen": /pptxgen/i,
    "html2canvas": /html2canvas/i,
    "tesseract": /tesseract/i,
  };

  const entryKeys = Object.entries(manifest).filter(([, e]) => e.isEntry).map(([k]) => k);
  const reachable = new Set();
  const visit = (key) => {
    if (!key || reachable.has(key) || !manifest[key]) return;
    reachable.add(key);
    for (const imp of manifest[key].imports || []) visit(imp);
  };
  entryKeys.forEach(visit);

  const leaked = [];
  for (const key of reachable) {
    const entry = manifest[key];
    const haystack = `${key} ${entry.file || ""} ${(entry.imports || []).join(" ")}`;
    for (const [label, marker] of Object.entries(heavyMarkers)) {
      if (marker.test(haystack)) leaked.push(`${label} (${key})`);
    }
  }
  assert.deepEqual(
    leaked,
    [],
    "a heavy optional library joined the entry graph — it now downloads before first paint on every device.",
  );
});

test("no single lazy chunk grows past the runaway threshold", () => {
  const files = jsFiles();
  if (!files.length) return;
  const biggest = files.reduce((a, b) => (a.bytes > b.bytes ? a : b));
  const kb = biggest.bytes / 1024;
  // Coarse alarm: catches an accidental static import of a whole library into
  // one chunk (the class of bug that took the entry chunk to ~1 MB).
  assert.ok(kb <= 1500, `largest chunk is ${kb.toFixed(0)} KB (${biggest.file}) — investigate what joined it`);
});

test("no animation runtime or dead heavy library is a dependency", () => {
  const pkg = JSON.parse(read("package.json"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const banned of ["lottie-react", "gsap", "lenis"]) {
    assert.equal(banned in deps, false, `${banned} is back in package.json`);
  }
});

test("the document requests only fonts the CSS uses", () => {
  const html = read("index.html");
  const match = /fonts\.googleapis\.com\/css2\?([^"]+)/.exec(html);
  assert.ok(match, "the Google Fonts stylesheet link disappeared");
  const families = [...match[1].matchAll(/family=([^&:]+)/g)].map((m) =>
    decodeURIComponent(m[1].replace(/\+/g, " ")),
  );
  assert.ok(families.length > 0 && families.length <= 4, `too many font families requested: ${families.join(", ")}`);

  const css = read("src/index.css") + read("src/design/atlas-tokens.css");
  for (const family of families) {
    assert.ok(
      css.includes(family.split(" ")[0]),
      `index.html requests "${family}" but no CSS rule references it — dead render-blocking request`,
    );
  }
  for (const unused of ["Newsreader", "Reem Kufi", "Noto Naskh Arabic"]) {
    assert.equal(match[1].includes(unused.replace(/ /g, "+")), false, `unused family "${unused}" is requested again`);
  }
});

test("the lite tier disables backdrop-filter (the dominant weak-device cost)", () => {
  const css = read("src/index.css");
  const liteBlock = css.slice(css.indexOf('html[data-tier="lite"]'));
  assert.ok(liteBlock.length > 0, "no html[data-tier=\"lite\"] block — the lite tier CSS gate was removed");
  assert.ok(
    /backdrop-filter:\s*none\s*!important/.test(liteBlock.slice(0, 2000)),
    "the lite tier no longer removes backdrop-filter; 41 files use a blur class and each one re-filters every frame",
  );
  assert.ok(
    /\.bf-icon-pulse/.test(liteBlock.slice(0, 4000)),
    "decorative infinite animations are no longer disabled on the lite tier",
  );
});
