import assert from "node:assert/strict";
import {
  allocateQuizQuestions,
  buildQuizAnalysisSample,
  buildQuizChunks,
  localAnalyzeQuizSource,
  normalizeQuizResult,
  normalizeQuizSourceAnalysis,
  runQuizChunkPool,
} from "../src/lib/quizQuality.js";

const lecture = `
Chapter 1: Cell biology
1. Introduction to the cell
2. Types of cell membranes
3. Transport across membranes
Definition: Diffusion is passive movement down a concentration gradient.
Causes and treatment are discussed later in this lecture.
`;
const lectureAnalysis = localAnalyzeQuizSource(lecture);
assert.equal(lectureAnalysis.source_type, "study_material");
assert.equal(lectureAnalysis.recommendation, "generate");

const questionBank = `
1. Which organelle produces most cellular ATP?
A. Nucleus
B. Mitochondrion
C. Ribosome
D. Lysosome

2. What is the main component of the plasma membrane?
A. Phospholipid bilayer
B. Cellulose
C. DNA
D. Glycogen

Answer key: 1-B, 2-A
`;
const bankAnalysis = localAnalyzeQuizSource(questionBank);
assert.equal(bankAnalysis.source_type, "question_bank");
assert.equal(bankAnalysis.recommendation, "extract");
assert.equal(bankAnalysis.has_answers, true);
assert.equal(bankAnalysis.question_count, 2);

const unansweredBank = questionBank.replace(/Answer key:[\s\S]*/i, "");
assert.equal(localAnalyzeQuizSource(unansweredBank).has_answers, false);

const mixedSource = `${("Lecture chapter definition overview causes treatment. ".repeat(160))}\n${questionBank}`;
const mixedAnalysis = localAnalyzeQuizSource(mixedSource);
assert.equal(mixedAnalysis.source_type, "mixed");
assert.equal(mixedAnalysis.recommendation, "hybrid");

const hugeSource = `HEAD_MARKER ${"x".repeat(499_950)} MID_MARKER ${"y".repeat(499_950)} TAIL_MARKER`;
const analysisSample = buildQuizAnalysisSample(hugeSource);
assert.ok(analysisSample.length <= 50_000);
assert.match(analysisSample, /HEAD_MARKER/);
assert.match(analysisSample, /MID_MARKER/);
assert.match(analysisSample, /TAIL_MARKER/);

const generatedChunks = buildQuizChunks(hugeSource, { mode: "generate", targetQuestions: 10 });
assert.ok(generatedChunks.sampled);
assert.ok(generatedChunks.chunks.length >= 4 && generatedChunks.chunks.length <= 8);
assert.ok(generatedChunks.chunks.every((chunk) => chunk.text.length <= 12_000));
assert.match(generatedChunks.chunks[0].text, /HEAD_MARKER/);
assert.match(generatedChunks.chunks.at(-1).text, /TAIL_MARKER/);
assert.ok(generatedChunks.chunks.at(-1).sourceIndex > generatedChunks.chunks[0].sourceIndex);

const extractChunks = buildQuizChunks(hugeSource, { mode: "extract", targetQuestions: 1000 });
assert.equal(extractChunks.sampled, false);
assert.match(extractChunks.chunks[0].text, /HEAD_MARKER/);
assert.match(extractChunks.chunks.at(-1).text, /TAIL_MARKER/);

const hybridChunks = buildQuizChunks(hugeSource, { mode: "hybrid", targetQuestions: 10 });
assert.ok(hybridChunks.chunks.length > generatedChunks.chunks.length);
assert.ok(hybridChunks.chunks.length <= 24);
assert.match(hybridChunks.chunks[0].text, /HEAD_MARKER/);
assert.match(hybridChunks.chunks.at(-1).text, /TAIL_MARKER/);

const sparsePlan = allocateQuizQuestions(3, 10);
assert.equal(sparsePlan.reduce((sum, value) => sum + value, 0), 3);
assert.deepEqual(sparsePlan.map((value, index) => value ? index : null).filter((value) => value !== null), [0, 5, 9]);

const normalized = normalizeQuizResult({ questions: [
  {
    text: "Which option contains the preserved correct answer?",
    options: [
      { text: "First" },
      { text: "Second" },
      { text: "Third" },
      { text: "Fourth" },
      { text: "Fifth", isCorrect: true },
    ],
    correctOption: 4,
    source_evidence: "Fifth is stated in the source",
  },
  {
    question: "Which option contains the preserved correct answer?",
    options: ["First", "Second", "Third", "Fourth"],
    correct_index: "1",
  },
] }, {
  desiredCount: 5,
  mode: "extract",
  requireExplanation: true,
  sourceText: "The source contains First, Second, Third, Fourth and Fifth.",
});
assert.equal(normalized.questions.length, 1);
assert.equal(normalized.questions[0].options.length, 5);
assert.equal(normalized.questions[0].correct_index, 4);
assert.equal(normalized.questions[0].source_evidence, "");
assert.equal(normalized.stats.duplicates_removed, 1);
assert.equal(normalized.stats.explanations_missing, 1);
assert.equal(normalized.stats.invalid_source_evidence_removed, 1);

const stringResult = normalizeQuizResult(JSON.stringify({ questions: [{
  question: "What is two plus two?",
  options: ["3", "4", "5", "6"],
  correct_index: "1",
  explanation: "Two plus two equals four.",
}] }), { desiredCount: 1 });
assert.equal(stringResult.questions[0].correct_index, 1);

const normalizedRemote = normalizeQuizSourceAnalysis({
  source_type: "question_bank",
  recommendation: "extract",
  has_answers: "false",
  question_count: 2,
  recommended_count: 2,
}, { ...bankAnalysis, question_count: 200, recommended_count: 200, has_answers: true });
assert.equal(normalizedRemote.question_count, 200);
assert.equal(normalizedRemote.has_answers, true);

const sampledContradiction = normalizeQuizSourceAnalysis({
  source_type: "study_material",
  recommendation: "generate",
  question_count: 0,
}, bankAnalysis);
assert.equal(sampledContradiction.source_type, "question_bank");
assert.equal(sampledContradiction.recommendation, "extract");

let attempts = 0;
const pool = await runQuizChunkPool(["a", "b", "c"], async (item) => {
  if (item === "b" && attempts++ === 0) throw new Error("temporary network failure");
  return item.toUpperCase();
}, { concurrency: 2, retries: 1 });
assert.deepEqual(pool.values.sort(), ["A", "B", "C"]);
assert.equal(pool.failures.length, 0);

console.log(JSON.stringify({
  lecture: lectureAnalysis,
  bank: bankAnalysis,
  mixed: { source_type: mixedAnalysis.source_type, recommendation: mixedAnalysis.recommendation },
  million_char_generation: {
    source_chunks: generatedChunks.sourceChunkCount,
    selected_chunks: generatedChunks.chunks.length,
    selected_positions: generatedChunks.chunks.map((chunk) => chunk.sourceIndex + 1),
  },
  million_char_extraction: { chunks: extractChunks.chunks.length, sampled: extractChunks.sampled },
  retry_pool: { completed: pool.completed, failures: pool.failures.length },
}, null, 2));
