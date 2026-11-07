import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRich,
  autoEmphasis,
  enforceDensity,
  toHtml,
  richToHtml,
  tokensToPlain,
  detectRichLang,
  escapeHtml,
} from "../../src/lib/summary/richText.js";
import {
  ROLES,
  MARK_ALIASES,
  PALETTE,
  BOXES,
  DENSITY_RULES,
  MEASURE,
} from "../../src/lib/summary/colorTokens.js";

// ─── parsing ────────────────────────────────────────────────────────────────
test("parses bold, highlight and colour markers", () => {
  const tokens = parseRich("عادي **بولد** و==key:مهم== و`code`");
  assert.deepEqual(
    tokens.filter((t) => t.role).map((t) => [t.text, t.role]),
    [["بولد", "term"], ["مهم", "key"], ["code", "code"]],
  );
});

test("plain ==text== becomes a key highlight", () => {
  const tokens = parseRich("خد بالك ==ده مهم==");
  assert.equal(tokens.find((t) => t.role === "key")?.text, "ده مهم");
});

test("purple is now supported (was rendered as literal text)", () => {
  assert.equal(MARK_ALIASES.purple, "mech");
  const tokens = parseRich("==purple:الآلية==");
  assert.equal(tokens[0].role, "mech");
  assert.equal(tokens[0].text, "الآلية");
});

test("every legacy colour alias maps to a real role", () => {
  for (const [name, role] of Object.entries(MARK_ALIASES)) {
    assert.ok(ROLES[role], `alias ${name} → unknown role ${role}`);
  }
});

test("structured input with annotations is accepted", () => {
  const tokens = parseRich([{ text: "ACL", annotations: [{ role: "term" }] }, " عادي"]);
  assert.equal(tokens[0].role, "term");
  assert.equal(tokens[1].text, " عادي");
});

test("empty and null inputs are safe", () => {
  for (const value of ["", null, undefined, []]) {
    assert.deepEqual(parseRich(value), []);
  }
});

// ─── auto emphasis ──────────────────────────────────────────────────────────
test("lead term before a colon is emphasised", () => {
  const html = richToHtml("الرباط الصليبي الأمامي: أهم رباط في الركبة.");
  assert.match(html, /<span class="bf-t-term">الرباط الصليبي الأمامي<\/span>/);
});

test("English lead term is emphasised too", () => {
  const html = richToHtml("The knee joint: a synovial hinge joint.", { lang: "en" });
  assert.match(html, /<span class="bf-t-term">The knee joint<\/span>/);
});

test("doses keep their unit AND ratio together", () => {
  const html = richToHtml("الجرعة 5 mg/kg كل 12 hours.");
  assert.match(html, /<span class="bf-t-value">5 mg\/kg<\/span>/);
  assert.match(html, /<span class="bf-t-value">12 hours<\/span>/);
});

test("vital-sign ratios are not split", () => {
  const html = richToHtml("BP < 90/60 is shock.");
  assert.match(html, /<span class="bf-t-value">BP &lt; 90\/60<\/span>/);
});

test("ALL-CAPS acronyms are emphasised as terms", () => {
  const html = richToHtml("We use the ACL and MRI.");
  assert.match(html, /bf-t-term">ACL</);
  assert.match(html, /bf-t-term">MRI</);
});

test("Arabic exam words get the danger role", () => {
  const html = richToHtml("ممنوع إعطاء الأسبرين للأطفال.");
  assert.match(html, /bf-t-danger">ممنوع</);
});

test("auto emphasis can be disabled", () => {
  const html = richToHtml("Term: value 5 mg", { auto: false });
  assert.ok(!html.includes("bf-t-term"));
  assert.ok(!html.includes("bf-t-value"));
});

// ─── bidi ───────────────────────────────────────────────────────────────────
test("mixed Arabic/English runs are bidi-isolated", () => {
  const html = richToHtml("نص عربي", { auto: false });
  assert.ok(!html.includes("<bdi"), "pure Arabic needs no isolation");
  const mixed = toHtml([{ text: "الرباط ACL", role: null }]);
  assert.match(mixed, /<bdi dir="auto">الرباط ACL<\/bdi>/);
});

// ─── escaping ───────────────────────────────────────────────────────────────
test("HTML in transcript/AI text is escaped", () => {
  const html = richToHtml('<script>alert("x")</script>', { auto: false });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("escapeHtml covers the five dangerous characters", () => {
  assert.equal(escapeHtml(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
});

// ─── density ────────────────────────────────────────────────────────────────
test("density caps LONG highlights so the page is not all yellow", () => {
  // Long highlighted clauses covering most of the text must be trimmed.
  const body = "جملة مظللة طويلة جدا فيها تفاصيل كتير أوي عن الموضوع ده كله ";
  const tokens = Array.from({ length: 5 }, () => ({ text: body, role: "key", auto: true }));
  const pruned = enforceDensity(tokens);
  const kept = pruned.filter((t) => t.role === "key").length;
  assert.ok(kept < 5, `all long highlights survived (${kept})`);
  assert.ok(kept >= 1, "at least one highlight must survive or the page reads flat");
});

test("short emphasis words are NOT treated as density problems", () => {
  // "أهم" / "لازم" are one-word highlights; they must never be pruned.
  const tokens = [
    { text: "أهم ", role: "key", auto: true },
    { text: "رباط ", role: null },
    { text: "لازم ", role: "key", auto: true },
    { text: "بعد كده نراجع.", role: null },
  ];
  const pruned = enforceDensity(tokens);
  assert.equal(pruned.filter((t) => t.role === "key").length, 2);
});

test("explicit author highlights survive density pruning", () => {
  // 5 long automatic highlights + 1 explicit one written by the student.
  const body = "جملة مظللة طويلة جدا فيها تفاصيل كتير أوي عن الموضوع ده كله ";
  const tokens = [
    { text: body, role: "key", explicit: true },
    ...Array.from({ length: 5 }, () => ({ text: body, role: "key", auto: true })),
  ];
  const pruned = enforceDensity(tokens);
  const kept = pruned.filter((t) => t.role === "key");
  assert.ok(kept.length < 6, "some long highlights must be pruned");
  assert.ok(
    kept.some((t) => t.explicit === true),
    "the author's own highlight must never be dropped",
  );
});

test("a paragraph under the density budget is left untouched", () => {
  const tokens = [
    { text: "مهم ", role: "key", explicit: true },
    { text: "نص ".repeat(40), role: null },
  ];
  const pruned = enforceDensity(tokens);
  assert.equal(pruned.filter((t) => t.role === "key").length, 1);
});

test("density rules are declared in the shared dictionary", () => {
  assert.ok(DENSITY_RULES.maxRatio > 0 && DENSITY_RULES.maxRatio <= 0.2);
  assert.equal(DENSITY_RULES.maxPerParagraph, 2);
});

// ─── plain text ─────────────────────────────────────────────────────────────
test("tokensToPlain keeps the reading text unchanged", () => {
  const raw = "الرباط الصليبي: 5 mg/kg ممنوع في الحمل";
  assert.equal(tokensToPlain(parseRich(raw)), raw);
});

test("language detection picks the dominant script", () => {
  assert.equal(detectRichLang("نص عربي طويل"), "ar");
  assert.equal(detectRichLang("A long English sentence"), "en");
});

// ─── shared dictionary ──────────────────────────────────────────────────────
test("palette defines every theme used by the UI", () => {
  for (const theme of ["light", "sepia", "dark"]) {
    assert.ok(PALETTE[theme], `missing ${theme}`);
    for (const key of ["ink", "bg", "accent", "key", "danger", "ok", "mech", "value"]) {
      assert.match(PALETTE[theme][key], /^#[0-9a-f]{6}$/i, `${theme}.${key} is not a hex colour`);
    }
  }
});

test("all nine study boxes exist with labels and tones", () => {
  const expected = [
    "definition", "mechanism", "high_yield", "warning", "pearl",
    "mnemonic", "formula", "example",
  ];
  for (const key of expected) {
    assert.ok(BOXES[key], `missing box ${key}`);
    assert.ok(BOXES[key].labelAr && BOXES[key].labelEn);
    assert.ok(BOXES[key].tone);
  }
});

test("reading measure is comfortable, not 1150px", () => {
  assert.ok(MEASURE.contentMax >= 760 && MEASURE.contentMax <= 900);
  assert.ok(MEASURE.minFontSize >= 16);
});

// ─── regressions found by rendering a REAL guide and reading the output ─────
test("an exam word inside a longer word is not highlighted", () => {
  // "الفخذ" (thigh) contains "فخ" (trap) — colouring it red looked broken.
  const html = richToHtml("تقوية العضلة الرباعية في الفخذ. لازم المريض يوصل لمدى حركة كامل.");
  assert.ok(!html.includes("bf-t-danger"), `false positive: ${html}`);
});

test("a standalone exam word IS still highlighted", () => {
  const html = richToHtml("ممنوع الرجوع للرياضة قبل 9 months");
  assert.match(html, /bf-t-danger">ممنوع</);
});

test("a long heading before a colon is not bolded as a lead term", () => {
  const html = richToHtml("الجرعة في حالات الأطفال: 5 mg/kg");
  assert.ok(!html.includes('bf-t-term">الجرعة في حالات الأطفال'), "heading bolded as a term");
  assert.match(html, /bf-t-value">5 mg\/kg</);
});

test("a real 1-3 word lead term is still bolded", () => {
  for (const line of ["الرباط الصليبي الأمامي: أهم رباط", "العلاج التحفظي: تركز على"]) {
    assert.match(richToHtml(line), /bf-t-term"/, `lead term lost: ${line}`);
  }
});
