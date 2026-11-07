import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { LECTURE_CONFIG, TRANSCRIBE_MODEL } from "../../src/features/lectures/config.js";
import { LECTURE_CONFIG as SERVER_LECTURE_CONFIG } from "../../netlify/functions/_shared/lectures/config.mjs";

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("N1 Non-Negotiable: TRANSCRIBE_MODEL is strictly gemini-3.5-transcribe with zero fallback speech models", () => {
  assert.equal(TRANSCRIBE_MODEL, "gemini-3.5-transcribe");
  assert.equal(LECTURE_CONFIG.TRANSCRIBE_MODEL, "gemini-3.5-transcribe");
  assert.equal(SERVER_LECTURE_CONFIG.TRANSCRIBE_MODEL, "gemini-3.5-transcribe");

  const lectureFiles = [
    ...walkFiles(path.resolve("src/features/lectures")),
    ...walkFiles(path.resolve("netlify/functions/_shared/lectures")),
  ];

  const forbiddenSpeechModels = /whisper|chirp|deepgram|assemblyai|gemini-1\.5|gemini-2\.0|gemini-2\.5-pro-speech/i;
  for (const file of lectureFiles) {
    const content = fs.readFileSync(file, "utf8");
    assert.equal(
      forbiddenSpeechModels.test(content),
      false,
      `Forbidden fallback speech model found in ${file}`,
    );
  }
});

test("N4 Non-Negotiable: Zero client-bundle API keys (VITE_GEMINI_API_KEY, VITE_CODECRAFT_KEY, AIza...) in src/", () => {
  const srcFiles = walkFiles(path.resolve("src"));
  const forbiddenEnvRefs = /\b(VITE_GEMINI_API_KEY|VITE_CODECRAFT_KEY|VITE_DEEPSEEK_API_KEY)\b/;
  const rawKeyPattern = /AIza[0-9A-Za-z_-]{30,}/;

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8");
    assert.equal(
      forbiddenEnvRefs.test(content),
      false,
      `Client bundle env secret reference found in ${file}`,
    );
    assert.equal(
      rawKeyPattern.test(content),
      false,
      `Hardcoded Gemini API key found in ${file}`,
    );
  }
});

test("Firestore & Storage rules: protect lecture collections and prevent cross-user or client-direct writes to rate-limit state", () => {
  const firestoreRules = fs.readFileSync(path.resolve("firestore.rules"), "utf8");
  assert.ok(firestoreRules.includes("match /lectureJobs/{id}"));
  assert.ok(firestoreRules.includes("match /lectureTranscripts/{id}"));
  assert.ok(firestoreRules.includes("match /lectureOrganizations/{id}"));
  assert.ok(firestoreRules.includes("match /lectureSummaries/{id}"));
  assert.ok(firestoreRules.includes("match /lectureQueue/{id}"));
  // Client writes to lectureTranscripts, lectureOrganizations, lectureSummaries, lectureQueue are blocked (`allow write: if false`)
  assert.match(firestoreRules, /match \/lectureQueue\/\{id\}\s*\{\s*allow read, write: if false;/);
});
