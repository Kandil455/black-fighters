// Bundles the summary templates for Node-side rendering tests.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");

function resolveAlias(rel) {
  const base = path.join(src, rel);
  for (const ext of ["", ".js", ".jsx", "/index.js", "/index.jsx"]) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return base;
}

fs.mkdirSync("/tmp/tpl", { recursive: true });
await build({
  entryPoints: [path.join(src, "components/course/summaryTemplates/index.jsx")],
  bundle: true, platform: "node", format: "esm", jsx: "automatic",
  outfile: "/tmp/tpl/templates.mjs", logLevel: "warning",
  absWorkingDir: root,
  plugins: [{ name: "at-alias", setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveAlias(a.path.slice(2)) }));
  }}],
});
console.log("template bundle built");
