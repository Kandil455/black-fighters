import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

test("Lecture transcription Gemini key pool includes LECTURE_GEMINI_API_KEY, GEMINI_API_KEY, GEMINI_BACKUP_KEYS, and dynamic override keys", async () => {
  const src = fs.readFileSync(
    path.join(ROOT, "netlify/functions/_shared/lectures/gemini-transcribe.mjs"),
    "utf8",
  );
  assert.match(src, /LECTURE_GEMINI_API_KEY/, "must read LECTURE_GEMINI_API_KEY");
  assert.match(src, /GEMINI_BACKUP_KEYS/, "must read GEMINI_BACKUP_KEYS");
  assert.match(src, /overrideKeys/, "must accept dynamic override keys from admin config");

  const mod = await import("../../netlify/functions/_shared/lectures/gemini-transcribe.mjs");
  const prevMain = process.env.GEMINI_API_KEY;
  const prevLecture = process.env.LECTURE_GEMINI_API_KEY;
  const prevKeys = process.env.GEMINI_API_KEYS;
  const prevBackup = process.env.GEMINI_BACKUP_KEYS;
  try {
    delete process.env.GEMINI_API_KEYS;
    process.env.LECTURE_GEMINI_API_KEY = "test-lecture-key-1234567890";
    process.env.GEMINI_API_KEY = "test-main-key-1234567890";
    process.env.GEMINI_BACKUP_KEYS = "test-backup-key-1,test-backup-key-2";
    assert.deepEqual(mod.geminiKeysPool(["test-override-key-1"]), [
      "test-override-key-1",
      "test-lecture-key-1234567890",
      "test-main-key-1234567890",
      "test-backup-key-1",
      "test-backup-key-2",
    ]);

    delete process.env.LECTURE_GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_BACKUP_KEYS;
    assert.deepEqual(mod.geminiKeysPool(), []);
    assert.deepEqual(mod.geminiKeysPool(["dynamic-admin-key-12345"]), ["dynamic-admin-key-12345"]);
  } finally {
    if (prevMain !== undefined) process.env.GEMINI_API_KEY = prevMain;
    else delete process.env.GEMINI_API_KEY;
    if (prevLecture !== undefined) process.env.LECTURE_GEMINI_API_KEY = prevLecture;
    else delete process.env.LECTURE_GEMINI_API_KEY;
    if (prevKeys !== undefined) process.env.GEMINI_API_KEYS = prevKeys;
    else delete process.env.GEMINI_API_KEYS;
    if (prevBackup !== undefined) process.env.GEMINI_BACKUP_KEYS = prevBackup;
    else delete process.env.GEMINI_BACKUP_KEYS;
  }
});

test("Custom Model API & Multi-Provider Manager supports Third-party + Custom API modes, Fetch Models auto-save, and Rotation Pool", () => {
  const managerSrc = fs.readFileSync(
    path.join(ROOT, "src/components/settings/AiModelsAndProvidersManager.jsx"),
    "utf8",
  );
  assert.match(managerSrc, /Third-party model provider/, "must include Third-party model provider mode");
  assert.match(managerSrc, /Custom model API/, "must include Custom model API mode");
  assert.match(managerSrc, /fetchProviderModels/, "must call fetchProviderModels to discover models");
  assert.match(managerSrc, /saveConfigRecord/, "must auto-save fetched models immediately upon fetch");
  assert.match(managerSrc, /customModelInput/, "must allow adding any unlisted model ID directly");
  assert.match(managerSrc, /extraKeysList/, "must support backup keys for key rotation");

  const aiSrc = fs.readFileSync(path.join(ROOT, "src/lib/ai.js"), "utf8");
  assert.match(aiSrc, /export async function fetchProviderModels/, "ai.js must export fetchProviderModels");
  assert.match(aiSrc, /customProviderGenerate/, "ai.js must support customProviderGenerate for custom base URLs");
  assert.match(aiSrc, /rotation_pool/, "callAI must failover across rotation_pool");
});

test("Audio Lecture Transcriber is enabled behind FEATURE_LECTURES", () => {
  const configSrc = fs.readFileSync(
    path.join(ROOT, "src/features/lectures/lib/config.js"),
    "utf8",
  );
  assert.match(
    configSrc,
    /FEATURE_LECTURES:\s*true/,
    "the feature flag should be enabled",
  );

  const layoutSrc = fs.readFileSync(path.join(ROOT, "src/components/Layout.jsx"), "utf8");
  const navBlock = layoutSrc.slice(layoutSrc.indexOf("PRIMARY_HUBS"));
  assert.match(
    navBlock,
    /FEATURE_LECTURES[\s\S]{0,200}?to:\s*"\/lectures"/,
    "the /lectures nav link must be inside the FEATURE_LECTURES guard",
  );
});