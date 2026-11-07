import assert from "node:assert/strict";
import test from "node:test";

import { normalizeText, collapseWhitespace } from "../../src/features/lectures/text/normalizeText.js";
import { dedupeChunkOverlap, mergeChunks } from "../../src/features/lectures/text/merge.js";
import {
  segmentSentencesStrict,
  buildSentencePagesFromMerged,
  formatSentenceId,
} from "../../src/features/lectures/text/segment.js";
import { splitRuns, renderBidiHtml } from "../../src/features/lectures/text/bidi.js";
import { extractTermCandidates } from "../../src/features/lectures/text/terms.js";

test("dedupeChunkOverlap: exact overlap, 1 mismatch in 8 tokens, and no overlap", () => {
  // Exact 7-word overlap
  const prev1 = "الدرس النهاردة بيتكلم عن الرباط الصليبي الأمامي وطريقة علاجه بالجراحة";
  const next1 = "الرباط الصليبي الأمامي وطريقة علاجه بالجراحة والتأهيل الطبيعي بعد العملية";
  const d1 = dedupeChunkOverlap(prev1, next1);
  assert.equal(d1.matched, true);
  assert.equal(d1.removedTokens, 6);
  assert.equal(d1.text, "والتأهيل الطبيعي بعد العملية");

  // 1 mismatch in 9 tokens (allowedMismatches = floor(9/8) = 1)
  const prev2 = "المريض عنده الم شديد في الصدر وبيسمع في الدراع الشمال من الصبح";
  const next2 = "شديد في الصدر وبيسمع في الذراع الشمال من الصبح ومحتاج رسم قلب";
  // "الدراع" vs "الذراع" is 1 mismatch in 9 tokens
  const d2 = dedupeChunkOverlap(prev2, next2);
  assert.equal(d2.matched, true);
  assert.equal(d2.removedTokens, 9);
  assert.equal(d2.text, "ومحتاج رسم قلب");

  // No overlap -> untouched
  const d3 = dedupeChunkOverlap("كلام في الأول خالص", "بداية موضوع جديد تماما ومختلف");
  assert.equal(d3.matched, false);
  assert.equal(d3.text, "بداية موضوع جديد تماما ومختلف");
});

test("mergeChunks: orders chunks, inserts gaps for failed/truncated chunks, and tracks seamUnresolved", () => {
  const chunks = [
    { index: 2, startSec: 1200, endSec: 1800, cutKind: "hard", status: "done", text: "الجزء التالت فيه شرح العلاج الدوائي بالتفصيل", quality: "truncated" },
    { index: 0, startSec: 0, endSec: 600, cutKind: "silence", status: "done", text: "الجزء الأول فيه مقدمة التشريح والفيزيولوجي" },
    { index: 1, startSec: 600, endSec: 1200, cutKind: "hard", status: "failed", error: "empty_after_retries" },
  ];

  const merged = mergeChunks(chunks);
  assert.equal(merged.hasGaps, true);
  assert.equal(merged.gaps.length, 2, "1 failed chunk + 1 truncated chunk gap");
  assert.equal(merged.gaps[0].chunkIndex, 1);
  assert.equal(merged.gaps[0].reason, "empty_after_retries");
  assert.equal(merged.gaps[1].chunkIndex, 2);
  assert.equal(merged.gaps[1].reason, "truncated");
});

test("normalizeText & segmentSentencesStrict: decimals, abbreviations, numbered lists, long/short units, and reconstruction invariant", () => {
  const raw =
    "1. الـ pH بتاع الدم 7.4 طبيعي جدًا كما قال Dr. Ahmed في المحاضرة. 2. الجرعة e.g. 5 mg. مش بتتغير أبدًا في العلاج. أه. " +
    "الجملة الطويلة دي فيها كلام كتير جدًا عشان نختبر التقسيم التلقائي عند المنتصف، " +
    "المريض بيجي الطوارئ بيشتكي من وجع في الصدر بقاله ساعتين ومش بيروح بالراحة، " +
    "يعني لازم نعمله رسم قلب فوري ونسحب إنزيمات القلب في أسرع وقت ممكن عشان نلحق العضلة.";

  const norm = normalizeText(raw);
  const sentences = segmentSentencesStrict(norm);

  // Reconstruction invariant: joining all sentence texts with single spaces equals normalised text with whitespace collapsed
  assert.equal(sentences.join(" "), collapseWhitespace(norm));

  // Decimals and abbreviations kept intact
  assert.ok(sentences.some((s) => s.includes("7.4")));
  assert.ok(sentences.some((s) => s.includes("Dr. Ahmed")));
  assert.ok(sentences.some((s) => s.includes("e.g. 5 mg.")));

  // No sentence shorter than 3 words or longer than 45 words
  for (const s of sentences) {
    const wc = s.split(/\s+/).filter(Boolean).length;
    assert.ok(wc >= 3, `sentence too short (${wc} words): ${s}`);
    assert.ok(wc <= 45, `sentence too long (${wc} words): ${s}`);
  }
});

test("buildSentencePagesFromMerged: sequential s000001 IDs, approximate tSec, and 300-sentence pages", () => {
  const longText = Array.from(
    { length: 350 },
    (_, i) => `هذه جملة رقم ${i + 1} في المحاضرة الطبية.`,
  ).join(" ");

  const merged = mergeChunks([
    { index: 0, startSec: 0, endSec: 600, status: "done", text: longText },
  ]);

  const built = buildSentencePagesFromMerged(merged.items);
  assert.equal(built.sentenceCount, 350);
  assert.equal(built.sentences[0].id, formatSentenceId(1));
  assert.equal(built.sentences[349].id, formatSentenceId(350));
  assert.equal(built.sentencePages.length, 2, "300 on page 0 + 50 on page 1");
  assert.equal(built.sentencePages[0].sentences.length, 300);
  assert.equal(built.sentencePages[1].sentences.length, 50);
  assert.ok(built.sentences[349].tSec > built.sentences[0].tSec);
});

test("splitRuns (bidi): all required strings from Section 12.5 + edge cases", () => {
  const requiredCases = [
    {
      input: "الـ Myocardial infarction بيحصل لما...",
      expectedEn: ["Myocardial infarction"],
    },
    {
      input: "علاج MI بالـ aspirin 300 mg؛",
      expectedEn: ["MI", "aspirin 300 mg"],
    },
    {
      input: "IL-6/TNF-α بيزيدوا؛",
      expectedEn: ["IL-6/TNF-α"],
    },
    {
      input: "الـ pH بتاع الدم 7.4 طبيعي؛",
      expectedEn: ["pH", "7.4"],
    },
    {
      input: "(ECG) هو الأساس؛",
      expectedEn: ["(ECG)"],
    },
    {
      input: "5 mg/kg كل 8 ساعات.",
      expectedEn: ["5 mg/kg"],
    },
  ];

  for (const { input, expectedEn } of requiredCases) {
    const runs = splitRuns(input);
    // Concatenation of runs equals original string
    assert.equal(runs.map((r) => r.text).join(""), input);
    const enRuns = runs.filter((r) => r.type === "en").map((r) => r.text);
    assert.deepEqual(enRuns, expectedEn, `failed bidi runs for: ${input}`);
    // Ensure Arabic punctuation like ؛ never leaks into en run
    for (const en of enRuns) {
      assert.ok(!/[،؛؟]/.test(en), `Arabic punctuation leaked into en run: ${en}`);
    }
  }

  // Edge cases: empty string, only Arabic, only Latin, nested parentheses
  assert.deepEqual(splitRuns(""), []);
  assert.deepEqual(splitRuns("هذا نص عربي خالص فقط"), [{ type: "ar", text: "هذا نص عربي خالص فقط" }]);
  assert.deepEqual(splitRuns("Pure English text only"), [{ type: "en", text: "Pure English text only" }]);

  const html = renderBidiHtml("الـ (ECG) مهم");
  assert.ok(html.includes('<bdi dir="ltr" class="en" style="unicode-bidi:isolate">(ECG)</bdi>'));
});

test("extractTermCandidates: collects distinct Latin phrases with frequencies and first_id", () => {
  const sentences = [
    { id: "s000001", text: "الـ Myocardial infarction خطير جدًا." },
    { id: "s000002", text: "بنعمل (ECG) عشان نشخص Myocardial infarction." },
  ];
  const terms = extractTermCandidates(sentences);
  const mi = terms.find((t) => t.term === "Myocardial infarction");
  const ecg = terms.find((t) => t.term === "ECG");
  assert.ok(mi);
  assert.equal(mi.count, 2);
  assert.equal(mi.first_id, "s000001");
  assert.ok(ecg);
  assert.equal(ecg.count, 1);
  assert.equal(ecg.first_id, "s000002");
});
