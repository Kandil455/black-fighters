/**
 * Telegram quiz scoring contracts.
 *
 * The defect: `run_custom_quiz` wrote `score: questions.length`, `percentage: 100`
 * and awarded `questions.length * 20` XP for every quiz, because the webhook never
 * subscribed to `poll_answer` and so never received a single answer. The platform
 * then displayed those fabricated 100% scores as student telemetry.
 *
 * The scoring module is now the only writer of bot quiz attempts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatQuizResult, QUIZ_XP_PER_CORRECT, QUIZ_SESSION_TTL_MS } from "../../netlify/functions/_shared/telegram-quiz.mjs";

const engine = readFileSync("netlify/functions/_shared/telegram-engine.mjs", "utf8");

test("the engine records real poll answers instead of assuming perfection", () => {
  assert.equal(
    /percentage:\s*100/.test(engine),
    false,
    "a hardcoded 100% score is back — bot quiz results must come from the recorded answers",
  );
  assert.equal(
    /increment\(questions\.length \* 20\)/.test(engine),
    false,
    "XP is awarded per question seen again, not per correct answer",
  );
  assert.ok(engine.includes("recordPollAnswer"), "poll answers are no longer recorded");
  assert.ok(engine.includes("finishQuizSession"), "quiz sessions are no longer graded from stored answers");
});

test("the webhook subscribes to poll_answer everywhere it polls", () => {
  for (const file of ["scripts/telegram-bot-runner.mjs"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(src.includes("poll_answer"), `${file} polls without poll_answer — real answers can never arrive`);
  }
  const setup = readFileSync("scripts/telegram-setup.mjs", "utf8");
  assert.ok(setup.includes("poll_answer"), "the setup script must register poll_answer in allowed_updates");
  assert.ok(setup.includes("setWebhook") && setup.includes("setMyCommands"), "setup must register the webhook and the menu");
});

test("XP is proportional to correct answers only", () => {
  assert.ok(QUIZ_XP_PER_CORRECT > 0, "per-correct XP must be positive");
  const allWrong = formatQuizResult({ correct: 0, total: 10, percentage: 0, earnedXp: 10, quizTitle: "x" });
  assert.ok(/0/.test(allWrong), "a zero score must render as zero");
  assert.equal(
    /100%/.test(allWrong),
    false,
    "a failed attempt rendered as 100%",
  );
  const perfect = formatQuizResult({ correct: 10, total: 10, percentage: 100, earnedXp: 210, quizTitle: "x" });
  assert.ok(/100%/.test(perfect), "a perfect score must render as 100%");
});

test("sessions are bounded so abandoned quizzes do not accumulate", () => {
  assert.ok(QUIZ_SESSION_TTL_MS > 0 && QUIZ_SESSION_TTL_MS <= 24 * 60 * 60 * 1000, "session TTL must be sane");
  const quiz = readFileSync("netlify/functions/_shared/telegram-quiz.mjs", "utf8");
  assert.ok(quiz.includes("expired"), "expired sessions are never closed");
  assert.ok(/answers\.filter/.test(quiz), "changing an answer must replace the previous one, not double-count it");
});

test("quiz attempts use the same shape as the web writer", () => {
  const quiz = readFileSync("netlify/functions/_shared/telegram-quiz.mjs", "utf8");
  for (const field of ["quiz_id", "user_id", "score", "total", "percentage", "created_at", "via"]) {
    assert.ok(quiz.includes(field), `quizAttempts is missing the shared field "${field}"`);
  }
  assert.ok(quiz.includes('via: "telegram"'), "the attempt must record that it came from Telegram");
});
