import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODELS, GEMINI_ROTATION_POOL, ZAI_VISION_MODEL } from "../../src/lib/ai.js";
import { serverAiConfig } from "../../netlify/functions/_shared/server-ai.mjs";

test("DEFAULT_MODELS: gemini defaults to gemini-3.5-flash-lite, zai defaults to glm-4.7-flash", () => {
  assert.equal(DEFAULT_MODELS.gemini, "gemini-3.5-flash-lite");
  assert.equal(DEFAULT_MODELS.zai, "glm-4.7-flash");
  assert.equal(DEFAULT_MODELS.apmix, "claude-sonnet-4-6-free");
  assert.equal(ZAI_VISION_MODEL, "glm-4.6v-flash");
});

test("GEMINI_ROTATION_POOL: begins with gemini-3.5-flash-lite and contains no deprecated 2.5 lite", () => {
  assert.equal(GEMINI_ROTATION_POOL[0], "gemini-3.5-flash-lite");
  assert.ok(!GEMINI_ROTATION_POOL.includes("gemini-2.5-flash-lite"));
});

test("serverAiConfig: returns gemini-3.5-flash-lite for vision and text", () => {
  const visionConf = serverAiConfig(true);
  assert.equal(visionConf.provider, "gemini");
  assert.equal(visionConf.model, "gemini-3.5-flash-lite");

  const textConf = serverAiConfig(false);
  assert.equal(textConf.provider, "gemini");
  assert.equal(textConf.model, "gemini-3.5-flash-lite");
});
