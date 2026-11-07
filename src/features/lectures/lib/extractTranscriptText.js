/**
 * extractTranscriptText — THE single reader for a Gemini transcription reply.
 *
 * ⚠️ CRITICAL (verified live against gemini-3.5-transcribe, 30 Oct 2026):
 * the model returns the transcript inside `parts[].audioTranscription.text`,
 * NOT `parts[].text`. Reading `parts[].text` yields HTTP 200 with an empty
 * string — a silent total failure. Every transcription call site MUST read the
 * response through this function.
 *
 * Real observed response:
 *   { candidates: [{ content: { parts: [
 *       { audioTranscription: { text: "المريض عنده ألم في الركبة اليمين." } }
 *   ]}, finishReason: "STOP" }], usageMetadata: { candidatesTokenCount: 13 } }
 *
 * Handles, in order of appearance:
 *   • plain text parts          (future/compat shapes)
 *   • audioTranscription.text   (current gemini-3.5-transcribe shape)
 *   • multiple parts            (concatenated in order)
 *   • missing / null / malformed candidates → ""
 */

/** Where a transcript may legally live inside a part. */
const PART_TEXT_ACCESSORS = [
  (part) => part?.text,
  (part) => part?.audioTranscription?.text,
];

/**
 * @param {unknown} response raw generateContent JSON
 * @returns {string} trimmed transcript ("" when the model produced nothing)
 */
export function extractTranscriptText(response) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  const chunks = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    for (const read of PART_TEXT_ACCESSORS) {
      let value;
      try {
        value = read(part);
      } catch {
        value = undefined;
      }
      if (typeof value === "string" && value.length > 0) {
        chunks.push(value);
        break; // one text source per part — never double-count
      }
    }
  }

  // Join parts with a space so cross-part boundaries never fuse two words.
  return chunks.join(" ").replace(/[ \t]+/g, " ").trim();
}

/**
 * True when the request was accepted (HTTP 200) but no transcript came back.
 * The documented "empty 200" failure mode — callers must retry, not accept.
 */
export function isEmptyTranscript(response) {
  return extractTranscriptText(response).length === 0;
}

/** Language hint from the model's own finishReason, for diagnostics only. */
export function transcriptFinishReason(response) {
  return response?.candidates?.[0]?.finishReason || null;
}

export default extractTranscriptText;
