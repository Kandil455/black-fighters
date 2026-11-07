import { test } from "node:test";
import assert from "node:assert/strict";
import { verifySummaryGrounding, stripUnsourcedPages } from "../../src/lib/summaryGroundingVerifier.js";

const source = "التمثيل الضوئي يحول ضوء الشمس إلى طاقة كيميائية في الجلوكوز.";
const summary = "## الفكرة\n- التمثيل الضوئي يحول ضوء الشمس إلى طاقة كيميائية. [صفحة 3]\n- دورة كريبس تنتج 36 جزيء ATP.";

test("fail-safe: returns the original summary when the verifier errors", async () => {
  const badConfig = { provider: "groq", model: "x", apiKey: "" };
  const r = await verifySummaryGrounding({ source, summary, config: badConfig });
  assert.equal(r.ok, false);
  assert.equal(r.summary, summary);
  assert.deepEqual(r.removed, []);
});

test("empty summary is a no-op", async () => {
  const r = await verifySummaryGrounding({ source, summary: "", config: {} });
  assert.equal(r.checked, 0);
  assert.equal(r.summary, "");
});

test("page markers are stripped when the source has none", () => {
  const out = stripUnsourcedPages(source, summary);
  assert.ok(!/صفحة\s*\d/.test(out), "unsourced page marker remained");
});

test("page markers are kept when the source does carry them", () => {
  const paged = "نص [صفحة 3] عن الضوء";
  assert.equal(stripUnsourcedPages(paged, "ملخص [صفحة 3]"), "ملخص [صفحة 3]");
});
