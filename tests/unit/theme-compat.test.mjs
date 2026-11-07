import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/styles/theme-compat.css", import.meta.url),
  "utf8",
);

test("compat layer defines variables for BOTH themes", () => {
  assert.match(css, /:root\[data-theme="light"\]\s*\{/);
  assert.match(css, /:root\[data-theme="dark"\]\s*\{/);
});

test("every compat override is scoped to one theme", () => {
  // A rule that applies in both themes would change the dark UI, which must
  // stay pixel-identical. Every selector with [class*=] needs a theme prefix.
  const selectors = css
    .split("\n")
    .filter((line) => line.includes("[class*=") && line.includes("{"))
    .map((line) => line.trim());
  for (const selector of selectors) {
    assert.match(
      selector,
      /^:root\[data-theme="(light|dark)"\]/,
      `unscoped selector would leak across themes: ${selector}`,
    );
  }
});

test("white text is remapped on the light theme (the owner's bug)", () => {
  assert.match(css, /data-theme="light"[^\n]*text-\[#f5f7fa\]/);
  assert.match(css, /data-theme="light"[^\n]*text-\[#9aa4b2\]/);
});

test("near-black panels become white cards on the light theme", () => {
  for (const hex of ["#05070a", "#090c11", "#0a0b12"]) {
    assert.ok(
      css.includes(`bg-[${hex}]`),
      `light theme does not remap bg-[${hex}]`,
    );
  }
});

test("overrides use !important so they beat Tailwind utilities", () => {
  const lightRules = css.match(/:root\[data-theme="light"\][^}]*\}/g) || [];
  assert.ok(lightRules.length > 0);
  const withImportant = lightRules.filter((rule) => rule.includes("!important"));
  assert.ok(
    withImportant.length >= lightRules.length - 1,
    "most light-theme overrides must be !important",
  );
});

test("dark theme keeps historical dark values", () => {
  // text-strong on dark must stay near-white, surfaces near-black.
  assert.match(css, /--bf-compat-text-strong:\s*210 20% 97%/);
  assert.match(css, /--bf-compat-surface-solid:\s*210 29% 5%/);
});

test("alpha-white overlays are tinted on light (were invisible)", () => {
  assert.match(css, /data-theme="light"[^\n]*bg-white\/\[/);
});

test("borders that vanish on light are re-tinted", () => {
  assert.match(css, /data-theme="light"[^\n]*border-white/);
});

// ─── contrast regressions measured on the real page ────────────────────────
// These ratios were computed from the rendered app at /login, not guessed.
function luminance(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test("brand emerald is unreadable on white — that is why light remaps it", () => {
  assert.ok(contrast("#19f08c", "#ffffff") < 2, "premise changed; revisit the fix");
});

test("the light-theme emerald replacement passes WCAG AA on white", () => {
  assert.ok(
    contrast("#047857", "#ffffff") >= 4.5,
    `#047857 only reaches ${contrast("#047857", "#ffffff").toFixed(2)}:1`,
  );
});

test("emerald text is only remapped on the LIGHT theme", () => {
  // On dark, #19f08c scores 12.95:1 — touching it would be a regression.
  // A dark rule may MENTION emerald inside :not(...) (exempting emerald buttons
  // from the dark-text override); what must not exist is a dark rule that SETS
  // a colour on an emerald text class.
  const darkRules = css.split("\n").filter((line) =>
    /^:root\[data-theme="dark"\]/.test(line.trim()) && /text-\[#19f08c\]/i.test(line),
  );
  for (const rule of darkRules) {
    assert.match(
      rule,
      /:not\(/,
      `dark theme remaps emerald text, which would break the dark UI: ${rule.trim()}`,
    );
  }
  assert.ok(contrast("#19f08c", "#090c11") > 7, "bright emerald on dark should be excellent");
});

test("amber and red legacy text are darkened for the light theme", () => {
  assert.match(css, /data-theme="light"[^\n]*text-\[#f59e0b\]/);
  assert.match(css, /data-theme="light"[^\n]*text-\[#ef4444\]/);
  assert.ok(contrast("#b45309", "#ffffff") >= 4.5);
  assert.ok(contrast("#b91c1c", "#ffffff") >= 4.5);
});

test("white labels on coloured buttons stay white (not flipped to dark)", () => {
  // Regression (2 Nov 2026): a broad `[class*="text-white"]` rule turned every
  // white label dark — including buttons on emerald/primary fills, which then
  // rendered dark-on-dark and looked broken in BOTH themes.
  for (const bg of ["bg-emerald-600", "bg-primary", "bg-red-600", "bg-blue-600"]) {
    assert.ok(
      css.includes(`[class*="${bg}"][class*="text-white"]`),
      `${bg} + text-white must be re-asserted white`,
    );
  }
});

test("the pale brand emerald keeps an ink-dark label", () => {
  // #19f08c is so light that white text scores 1.51:1 — its label must be ink.
  // The exception block comes AFTER the generic white rule and must override it.
  const ink = css.lastIndexOf("color: #03150c !important");
  const whiteFill = css.indexOf("color: #ffffff !important");
  assert.ok(ink > whiteFill, "the ink override must come after the white rule");
  const beforeInk = css.slice(Math.max(0, ink - 400), ink);
  assert.ok(
    beforeInk.includes("bg-[#19f08c]"),
    "the ink override is not scoped to the pale emerald fill",
  );
});
test("primary/CTA buttons are opaque so the label never disappears", () => {
  const index = readFileSync(new URL("../../src/index.css", import.meta.url), "utf8");
  const rule = index.slice(
    index.indexOf(".apple-glass-primary,"),
    index.indexOf(".apple-glass-primary:hover,"),
  );
  // A translucent emerald composites over white to a pale green where white
  // text scores ~2.2:1. The fill must be opaque.
  assert.doesNotMatch(
    rule,
    /rgba\(16, 185, 129, 0\.8/,
    "primary button fill is translucent again — white label will vanish on white",
  );
  assert.match(rule, /#059669|#047857|#065f46/, "primary fill should be an opaque emerald");
});
