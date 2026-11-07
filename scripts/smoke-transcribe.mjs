#!/usr/bin/env node
/**
 * scripts/smoke-transcribe.mjs — Phase 0.3 Smoke Test for gemini-3.5-transcribe
 *
 * Node 18+ script with zero external dependencies.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/smoke-transcribe.mjs <audio-file-path> [glossary-file-path]
 *
 * Tests 4 variants:
 *   (A) languageCodes: []
 *   (B) languageCodes: ['ar-EG', 'en-US']
 *   (C) A + customVocabulary
 *   (D) B + customVocabulary
 *
 * Writes SMOKE_RESULT.json and exits non-zero if all variants return empty text.
 */
import fs from "node:fs";
import path from "node:path";
import { extractTranscriptText, transcriptFinishReason } from "../src/features/lectures/lib/extractTranscriptText.js";
import { LECTURE_CONFIG } from "../src/features/lectures/lib/config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function detectMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".m4a": "audio/m4a",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
  };
  return map[ext] || "audio/mp3";
}

function analyzeText(text, durationMinutes = 2.5, glossary = []) {
  const clean = String(text || "").trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const letters = (clean.match(/[\p{L}]/gu) || []).length;
  const latinLetters = (clean.match(/[A-Za-z]/g) || []).length;
  const distinctLatinWords = Array.from(
    new Set(
      (clean.match(/\b[A-Za-z][A-Za-z0-9/-]*\b/g) || []).map((w) => w.trim()),
    ),
  );
  const lowerSet = new Set(distinctLatinWords.map((w) => w.toLowerCase()));
  const glossaryHits = glossary.filter((term) =>
    String(term)
      .toLowerCase()
      .split(/\s+/)
      .every((part) => lowerSet.has(part)),
  );

  return {
    textLength: clean.length,
    wordCount: words.length,
    wordsPerMinute: Math.round((words.length / Math.max(0.25, durationMinutes)) * 10) / 10,
    latinShare: letters > 0 ? Math.round((latinLetters / letters) * 1000) / 1000 : 0,
    distinctLatinWords,
    glossaryHits: glossaryHits.length,
  };
}

async function uploadToFilesApi(apiKey, bytes, mimeType, displayName) {
  const res = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "raw",
      "Content-Type": mimeType,
    },
    body: bytes,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Files API upload failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const fileUri = data?.file?.uri;
  const fileName = data?.file?.name;
  if (!fileUri) throw new Error("Files API returned no file.uri");

  // Poll until ACTIVE (up to 20s, every 500ms)
  for (let i = 0; i < 40; i += 1) {
    const check = await fetch(`${LECTURE_CONFIG.GEMINI_API_BASE}/${fileName}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (check.ok) {
      const meta = await check.json().catch(() => ({}));
      if (!meta.state || meta.state === "ACTIVE") break;
      if (meta.state === "FAILED") throw new Error("Remote file state is FAILED");
    }
    await sleep(500);
  }
  return { fileUri, fileName };
}

async function deleteRemoteFile(apiKey, fileName) {
  if (!fileName) return;
  await fetch(`${LECTURE_CONFIG.GEMINI_API_BASE}/${fileName}`, {
    method: "DELETE",
    headers: { "x-goog-api-key": apiKey },
  }).catch(() => {});
}

async function runVariant(apiKey, { id, fileUri, mimeType, languageCodes, customVocabulary, glossary }) {
  const started = Date.now();
  const audioTranscriptionConfig = {
    mode: "VERBATIM",
  };
  if (Array.isArray(languageCodes) && languageCodes.length > 0) {
    audioTranscriptionConfig.languageCodes = languageCodes;
  } else {
    audioTranscriptionConfig.languageCodes = [];
  }
  if (Array.isArray(customVocabulary) && customVocabulary.length > 0) {
    audioTranscriptionConfig.customVocabulary = customVocabulary.slice(0, 100);
  }

  const url = `${LECTURE_CONFIG.GEMINI_API_BASE}/models/${LECTURE_CONFIG.TRANSCRIBE_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ fileData: { fileUri, mimeType } }] }],
      generationConfig: { audioTranscriptionConfig },
    }),
  });

  const latencyMs = Date.now() - started;
  const status = res.status;
  const payload = await res.json().catch(() => ({}));
  const text = extractTranscriptText(payload);
  const finishReason = transcriptFinishReason(payload);
  const usage = {
    promptTokens: payload?.usageMetadata?.promptTokenCount || 0,
    outputTokens: payload?.usageMetadata?.candidatesTokenCount || 0,
  };
  const stats = analyzeText(text, 2.5, glossary);

  console.log(
    `[Variant ${id}] HTTP=${status} finish=${finishReason} latency=${latencyMs}ms len=${stats.textLength} wpm=${stats.wordsPerMinute} latinShare=${stats.latinShare} latinWords=[${stats.distinctLatinWords.join(", ")}]`,
  );

  return {
    variant: id,
    languageCodes,
    customVocabularyUsed: Boolean(customVocabulary?.length),
    httpStatus: status,
    finishReason,
    usage,
    latencyMs,
    ...stats,
    empty: stats.textLength === 0,
  };
}

async function main() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const audioPath = process.argv[2];
  const glossaryPath = process.argv[3];

  if (!apiKey || !audioPath || !fs.existsSync(audioPath)) {
    console.error("Usage: GEMINI_API_KEY=... node scripts/smoke-transcribe.mjs <audio-file> [glossary-file]");
    process.exit(2);
  }

  const defaultGlossary = ["Myocardial infarction", "ECG", "ACL", "MRI", "Aspirin"];
  const glossary =
    glossaryPath && fs.existsSync(glossaryPath)
      ? fs
          .readFileSync(glossaryPath, "utf8")
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 100)
      : defaultGlossary;

  const bytes = fs.readFileSync(audioPath);
  const mimeType = detectMime(audioPath);
  const { fileUri, fileName } = await uploadToFilesApi(apiKey, bytes, mimeType, path.basename(audioPath));

  const variants = [
    { id: "A", languageCodes: [], customVocabulary: null },
    { id: "B", languageCodes: ["ar-EG", "en-US"], customVocabulary: null },
    { id: "C", languageCodes: [], customVocabulary: glossary },
    { id: "D", languageCodes: ["ar-EG", "en-US"], customVocabulary: glossary },
  ];

  const results = [];
  try {
    for (let i = 0; i < variants.length; i += 1) {
      if (i > 0) await sleep(LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS);
      const r = await runVariant(apiKey, { ...variants[i], fileUri, mimeType, glossary });
      results.push(r);
    }
  } finally {
    await deleteRemoteFile(apiKey, fileName);
  }

  const nonEmpty = results.filter((r) => !r.empty && r.httpStatus === 200);
  nonEmpty.sort(
    (a, b) =>
      b.glossaryHits - a.glossaryHits ||
      b.distinctLatinWords.length - a.distinctLatinWords.length ||
      (a.languageCodes.length === 0 ? -1 : 1),
  );
  const winner = nonEmpty[0] || null;

  const output = {
    testedAt: new Date().toISOString(),
    model: LECTURE_CONFIG.TRANSCRIBE_MODEL,
    accessor: "candidates[0].content.parts[].audioTranscription.text",
    variants: results,
    recommendedVariant: winner?.variant || null,
    recommendedLanguageCodes: winner?.languageCodes ?? ["ar-EG", "en-US"],
    customVocabHelpful: winner ? winner.customVocabularyUsed : true,
  };

  fs.writeFileSync("SMOKE_RESULT.json", JSON.stringify(output, null, 2), "utf8");
  if (!winner) {
    console.error("All variants returned empty text!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[smoke-transcribe] fatal:", err.message);
  process.exit(1);
});
