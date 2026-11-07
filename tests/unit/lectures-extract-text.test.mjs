import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTranscriptText,
  isEmptyTranscript,
  transcriptFinishReason,
} from "../../src/features/lectures/lib/extractTranscriptText.js";

/**
 * ⚠️ REGRESSION GUARD — the single most important test in this feature.
 * gemini-3.5-transcribe returns text in parts[].audioTranscription.text.
 * Reading parts[].text returns "" with HTTP 200 and silently kills the feature.
 */

const REAL_SHAPE = {
  candidates: [
    {
      content: {
        parts: [{ audioTranscription: { text: "المريض عنده ألم في الركبة اليمين." } }],
        role: "model",
      },
      finishReason: "STOP",
    },
  ],
  usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 13 },
  modelVersion: "gemini-3.5-transcribe",
};

test("reads the real gemini-3.5-transcribe shape (audioTranscription.text)", () => {
  assert.equal(extractTranscriptText(REAL_SHAPE), "المريض عنده ألم في الركبة اليمين.");
});

test("a naive parts[].text read returns empty — documents WHY this module exists", () => {
  const naive = REAL_SHAPE.candidates[0].content.parts.map((p) => p.text ?? "").join("");
  assert.equal(naive, "", "naive accessor must be empty; the fix lives in extractTranscriptText");
});

test("still supports plain text parts (forward compatibility)", () => {
  const res = { candidates: [{ content: { parts: [{ text: "ACL tear confirmed." }] } }] };
  assert.equal(extractTranscriptText(res), "ACL tear confirmed.");
});

test("concatenates multiple parts in order", () => {
  const res = {
    candidates: [
      {
        content: {
          parts: [
            { audioTranscription: { text: "الأول." } },
            { text: " Second." },
          ],
        },
      },
    ],
  };
  assert.equal(extractTranscriptText(res), "الأول. Second.");
});

test("does not double count when a part has both fields", () => {
  const res = {
    candidates: [{ content: { parts: [{ text: "A", audioTranscription: { text: "A" } }] } }],
  };
  assert.equal(extractTranscriptText(res), "A");
});

test("returns empty string for empty/absent/malformed payloads", () => {
  for (const bad of [
    null,
    undefined,
    {},
    { candidates: [] },
    { candidates: [{}] },
    { candidates: [{ content: {} }] },
    { candidates: [{ content: { parts: [] } }] },
    { candidates: [{ content: { parts: [null, 5, "x"] } }] },
    { candidates: [{ content: { parts: [{ audioTranscription: { text: "" } }] } }] },
  ]) {
    assert.equal(extractTranscriptText(bad), "", `should be empty for ${JSON.stringify(bad)}`);
  }
});

test("isEmptyTranscript flags the documented empty-200 failure mode", () => {
  assert.equal(isEmptyTranscript({ candidates: [{ content: { parts: [{ text: "" }] } }] }), true);
  assert.equal(isEmptyTranscript(REAL_SHAPE), false);
});

test("transcriptFinishReason is exposed for diagnostics", () => {
  assert.equal(transcriptFinishReason(REAL_SHAPE), "STOP");
  assert.equal(transcriptFinishReason({}), null);
});
