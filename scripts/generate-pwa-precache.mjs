import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const DIST = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", DIST), "utf8"));

// Core routes needed to launch and study cached courses. Heavy authoring/export
// libraries remain runtime-only so code splitting still saves data and battery.
const offlineSources = new Set([
  "src/pages/Dashboard.jsx",
  "src/pages/CourseView.jsx",
  "src/pages/Review.jsx",
]);

const files = new Set();
const visited = new Set();

function include(key) {
  if (!key || visited.has(key)) return;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) return;
  if (entry.file) files.add(`/${entry.file}`);
  for (const css of entry.css || []) files.add(`/${css}`);
  for (const asset of entry.assets || []) files.add(`/${asset}`);
  for (const dependency of entry.imports || []) include(dependency);
}

for (const [key, entry] of Object.entries(manifest)) {
  if (entry.isEntry || offlineSources.has(key)) include(key);
}

const swUrl = new URL("sw.js", DIST);
const sw = await readFile(swUrl, "utf8");
const buildVersion = createHash("sha256")
  .update(JSON.stringify([...files].sort()))
  .digest("hex")
  .slice(0, 12);
const generated = sw.replace(
  "const BUILD_ASSETS = [];",
  `const BUILD_ASSETS = ${JSON.stringify([...files].sort())};`
).replace('const SW_VERSION = "__BUILD_VERSION__";', `const SW_VERSION = "${buildVersion}";`);

if (generated === sw || generated.includes("__BUILD_VERSION__")) throw new Error("PWA precache placeholder was not found");
await writeFile(swUrl, generated);
console.log(`PWA precache: ${files.size} build assets`);
