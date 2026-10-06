import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The gamification module imports the base44 client (browser code) — for the
// pure functions, evaluate via source contracts + a tiny local re-implementation
// guard: the pure exports must exist and behave. We import only what's safe.
const gamSrc = readFileSync(new URL("../../src/lib/gamification.js", import.meta.url), "utf8");
const agentSrc = readFileSync(new URL("../../src/lib/summaryAgent.js", import.meta.url), "utf8");

import { TIER_FAMILIES, BADGE_MILESTONE_REWARDS } from "../../src/lib/badgeLadderData.js";

// ── extract + eval the PURE part of gamification.js (no base44 dependency) ──
const pureBlock = gamSrc.slice(
  gamSrc.indexOf("const ROMAN ="),
  gamSrc.indexOf("export async function bumpCounter")
);
// NOTE: concatenated, NOT a template literal — the badge labels contain backticks
const cleaned = pureBlock
  .replace(/export const /g, "const ")
  .replace(/export function /g, "function ")
  .replace(/export\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, "");
const mod = new Function(
  "TIER_FAMILIES",
  "BADGE_MILESTONE_REWARDS",
  "const BADGES = {};\n" +
  cleaned +
  "\nreturn { BADGES, BADGE_COUNT, evaluateBadgeLadder, evaluateBadgeMilestones };"
)(TIER_FAMILIES, BADGE_MILESTONE_REWARDS);
const { BADGES, BADGE_COUNT, evaluateBadgeLadder, evaluateBadgeMilestones } = mod;

test("badge ladder expanded from 16 to 100+ badges", () => {
  // The extracted scope holds only the generated tier badges (100 expected);
  // legacy badges live in the source above and are checked textually.
  assert.ok(
    BADGE_COUNT >= 100,
    `expected 100+ tier badges, got ${BADGE_COUNT}`
  );
  for (const legacy of ["first_course:", "quiz_legend:", "streak_30:", "flashcard_fan:"]) {
    assert.ok(gamSrc.includes(legacy), `legacy badge ${legacy} missing from source`);
  }
});

test("course ladder reaches 500 courses", () => {
  const keys = Object.keys(BADGES).filter((k) => k.startsWith("courses_created_t"));
  const tiers = keys.map((k) => BADGES[k].threshold).sort((a, b) => a - b);
  assert.ok(tiers.includes(500), "no 500-course badge");
  assert.ok(tiers.length >= 15, `course ladder too short: ${tiers.length}`);
});

test("evaluateBadgeLadder unlocks tiers by counter (pure)", () => {
  const earned = evaluateBadgeLadder({ courses_created: 7, quizzes_completed: 0 });
  const keys = earned.filter((k) => k.startsWith("courses_created_t"));
  assert.deepEqual(keys.sort(), ["courses_created_t1", "courses_created_t2", "courses_created_t3", "courses_created_t5"]);
  assert.ok(!earned.some((k) => k.startsWith("quizzes_completed_t")), "must not unlock unmet families");
  assert.deepEqual(evaluateBadgeLadder(null), [], "null user → no badges");
});

test("milestone rewards: 50 badges → 250, claimed never repaid (pure)", () => {
  const fresh = evaluateBadgeMilestones(55, []);
  assert.ok(fresh.some((m) => m.badges === 10) && fresh.some((m) => m.badges === 25) && fresh.some((m) => m.badges === 50));
  assert.equal(fresh.reduce((s, m) => s + m.credits, 0), 400);
  const claimed = evaluateBadgeMilestones(55, [10, 25, 50]);
  assert.deepEqual(claimed, [], "claimed milestones must not repay");
});

// ── summary agent: reply parser ───────────────────────────────────────────────
// Re-implement the protocol markers locally (the module imports creditCosts +
// uses dynamic imports; parser itself is dependency-free, so import via data URL)
const agentModule = await import(
  "data:text/javascript," +
  encodeURIComponent(
    agentSrc
      .replace(/import[\s\S]*?;\n/g, "")
      .replace(/export async function[\s\S]*$/, "")
  )
);

test("parseAgentReply extracts apply_edit + create_quiz and strips blocks", () => {
  const reply = `بص، هعدّل قسم التشريح وأضيف الكيس.
<<<APPLY_SUMMARY_EDIT>>>
{ "instruction": "أضف فقرة عن الدورة الدموية" }
<<<END_APPLY_SUMMARY_EDIT>>>
وكمان عملتلك كويز.
<<<CREATE_SUMMARY_QUIZ>>>
{ "count": 5 }
<<<END_CREATE_SUMMARY_QUIZ>>>`;
  const { actions, visible } = agentModule.parseAgentReply(reply);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].kind, "apply_edit");
  assert.equal(actions[0].instruction, "أضف فقرة عن الدورة الدموية");
  assert.equal(actions[1].kind, "create_quiz");
  assert.equal(actions[1].count, 5);
  assert.equal(visible.includes("APPLY_SUMMARY_EDIT"), false, "machine blocks must not leak into chat");
  assert.ok(visible.includes("هعدّل قسم التشريح"), "visible text keeps the human part");
});

test("parseAgentReply: malformed JSON blocks are ignored safely", () => {
  const { actions, visible } = agentModule.parseAgentReply(
    "hello <<<APPLY_SUMMARY_EDIT>>> not json <<<END_APPLY_SUMMARY_EDIT>>> world"
  );
  assert.deepEqual(actions, []);
  assert.ok(visible.includes("hello") && visible.includes("world"));
});

test("parseAgentReply: quiz count clamped 3..20", () => {
  const { actions } = agentModule.parseAgentReply(
    `<<<CREATE_SUMMARY_QUIZ>>>\n{ "count": 500 }\n<<<END_CREATE_SUMMARY_QUIZ>>>`
  );
  assert.equal(actions[0].count, 20);
});
