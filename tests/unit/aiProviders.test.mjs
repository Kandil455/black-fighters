import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODELS, GEMINI_ROTATION_POOL, ZAI_VISION_MODEL } from "../../src/lib/ai.js";
import { SOLE_MODEL_ID, ALL_CODECRAFT_MODELS, getDefaultModel } from "../../src/lib/models.js";
import { serverAiConfig } from "../../netlify/functions/_shared/server-ai.mjs";

test("SOLE_MODEL_ID and model catalog exclusively expose DeepSeek-V4.1-Flash-1017", () => {
  assert.equal(SOLE_MODEL_ID, "DeepSeek-V4.1-Flash-1017");
  assert.equal(ALL_CODECRAFT_MODELS.length, 1);
  assert.equal(ALL_CODECRAFT_MODELS[0].id, "DeepSeek-V4.1-Flash-1017");
  assert.equal(ALL_CODECRAFT_MODELS[0].supportsVision, true);
  assert.equal(getDefaultModel("deepseek"), "DeepSeek-V4.1-Flash-1017");
  assert.equal(DEFAULT_MODELS.deepseek, "DeepSeek-V4.1-Flash-1017");
  assert.equal(DEFAULT_MODELS.codecraft, "DeepSeek-V4.1-Flash-1017");
  assert.equal(DEFAULT_MODELS.apmix, "DeepSeek-V4.1-Flash-1017");
});

test("GEMINI_ROTATION_POOL: begins with gemini-3.5-flash-lite and contains no deprecated 2.5 lite", () => {
  assert.equal(GEMINI_ROTATION_POOL[0], "gemini-3.5-flash-lite");
  assert.ok(!GEMINI_ROTATION_POOL.includes("gemini-2.5-flash-lite"));
  assert.equal(ZAI_VISION_MODEL, "glm-4.6v-flash");
});

test("serverAiConfig: returns DeepSeek-V4.1-Flash-1017 for both vision and text", () => {
  const visionConf = serverAiConfig(true);
  assert.equal(visionConf.provider, "deepseek");
  assert.equal(visionConf.model, "DeepSeek-V4.1-Flash-1017");

  const textConf = serverAiConfig(false);
  assert.equal(textConf.provider, "deepseek");
  assert.equal(textConf.model, "DeepSeek-V4.1-Flash-1017");
});

