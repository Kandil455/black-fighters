// Renders the summary templates to HTML with a minimal browser shim, so the
// layout contract (sections present, distinct layouts) is checked in CI.
// The bundle is produced by scripts/build-template-test-bundle.mjs.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const bundle = "/tmp/tpl/templates.mjs";
const names = ["FoundationalTemplate", "CramTemplate", "ComparisonTemplate", "QaTemplate", "CompleteGuideTemplate"];

const doc = {
  title: "التمثيل الضوئي",
  overview: [{ type: "paragraph", text: "نظرة عامة على التمثيل الضوئي." }],
  sections: [{ id: "s1", title: "الفصل الأول", blocks: [
    { type: "paragraph", role: "arabic_explanation", text: "التمثيل الضوئي تحويل ضوء الشمس إلى طاقة." },
    { type: "paragraph", role: "english_points", text: "Chlorophyll absorbs red and blue light." },
    { type: "paragraph", role: "definition", text: "Photosynthesis: energy conversion." },
  ]}],
  conclusion: [{ type: "paragraph", text: "الخلاصة." }],
  metadata: { sourceRefs: [1, 2] },
};

let T;
before(async () => {
  if (!existsSync(bundle)) {
    execFileSync(process.execPath, [path.join(root, "scripts/build-template-test-bundle.mjs")], { stdio: "pipe" });
  }
  globalThis.window ||= { self: {}, top: {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {}, location: { href: "http://localhost/" }, innerWidth: 1280, innerHeight: 800 };
  globalThis.window.self ||= globalThis.window;
  globalThis.window.top ||= globalThis.window;
  T = await import(bundle);
});

async function render(name) {
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(React.createElement(T[name], { document: doc }));
}

for (const name of names) {
  test(`${name} renders the title and section`, async () => {
    const html = await render(name);
    assert.ok(html.includes("التمثيل"), "title missing");
    assert.ok(html.includes("الفصل الأول"), "section title missing");
  });
}

test("only the foundational template shows English study points and glossary", async () => {
  const foundational = await render("FoundationalTemplate");
  assert.ok(foundational.includes("Study points"));
  assert.ok(foundational.includes("قاموس المصطلحات"));
  for (const name of names.slice(1)) {
    const html = await render(name);
    assert.ok(!html.includes("Study points"), `${name} should not show study points`);
  }
});

test("templates are visually distinct (not one layout repeated)", async () => {
  const shapes = new Set();
  for (const name of names) {
    const html = await render(name);
    shapes.add(`${(html.match(/<section/g) || []).length}:${(html.match(/<h2/g) || []).length}`);
  }
  assert.ok(shapes.size >= 2, "all templates produce the same structure");
});
