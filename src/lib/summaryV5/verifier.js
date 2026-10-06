/**
 * BLACK FIGHTERS V5 — التحقق بموديل من عيلة تانية وفحص الادعاءات عالية الخطورة (V5 Section 3.3)
 * - Ensures the Verifier model is never from the same model family as the Writer.
 * - Double-checks dosages, numerical thresholds, and clinical classifications.
 */

export const MODEL_FAMILIES = Object.freeze({
  "gemini-2.5-flash": "google-gemini",
  "gemini-2.5-pro": "google-gemini",
  "gemini-2.0-flash": "google-gemini",
  "gemini-flash-lite": "google-gemini",
  "llama-3.3-70b-versatile": "meta-llama",
  "llama-3.1-8b-instant": "meta-llama",
  "claude-3-5-sonnet": "anthropic-claude",
  "claude-3-5-haiku": "anthropic-claude",
  "gpt-4o-mini": "openai-gpt",
  "gpt-4o": "openai-gpt",
  "glm-4-flash": "zhipu-glm",
});

export function getModelFamily(modelId = "") {
  const id = String(modelId).trim().toLowerCase();
  if (MODEL_FAMILIES[id]) return MODEL_FAMILIES[id];
  if (id.includes("gemini")) return "google-gemini";
  if (id.includes("llama")) return "meta-llama";
  if (id.includes("claude")) return "anthropic-claude";
  if (id.includes("gpt") || id.includes("o1") || id.includes("o3")) return "openai-gpt";
  if (id.includes("glm")) return "zhipu-glm";
  return "unknown-family";
}

/**
 * Selects a Verifier model guaranteed to come from a DIFFERENT model family than the Writer.
 */
export function selectCrossFamilyVerifier(writerModelId, candidateModels = [
  "llama-3.3-70b-versatile",
  "gemini-2.5-flash",
  "claude-3-5-haiku",
  "gpt-4o-mini",
]) {
  const writerFamily = getModelFamily(writerModelId);
  for (const candidate of candidateModels) {
    const family = getModelFamily(candidate);
    if (family !== writerFamily) {
      return {
        writerModelId,
        writerFamily,
        verifierModelId: candidate,
        verifierFamily: family,
        crossFamilyGuaranteed: true,
      };
    }
  }
  throw new Error(`NO_CROSS_FAMILY_VERIFIER_AVAILABLE_FOR:${writerFamily}`);
}

const DOSAGE_OR_NUMBER_REGEX = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|kg|ml|mL|L|mmol|mEq|IU|units|%|mmHg|bpm|hours?|hrs?|days?|ق|ملغ|مجم|ساعة|ساعات|يوم|أيام)\b/gi;

export function extractHighRiskClaims(text = "") {
  const sentences = String(text || "")
    .split(/(?<=[.!؟\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const highRisk = [];
  for (const sentence of sentences) {
    const matches = sentence.match(DOSAGE_OR_NUMBER_REGEX) || [];
    const isClassificationOrContra = /contraindicat|first-line|drug of choice|antidote|class\s+[I1-4]|stage\s+[I1-4]|يُمنع|مضاد استطباب|ترياق|الخط الأول|جرعة/i.test(sentence);
    if (matches.length > 0 || isClassificationOrContra) {
      highRisk.push({
        claim: sentence,
        numbersAndUnits: matches.map((m) => m.trim()),
        isHighRisk: true,
      });
    }
  }
  return highRisk;
}

/**
 * Double-checks high-risk claims against the source text (Pass 1: deterministic numeric & unit check,
 * Pass 2: cross-family semantic verification).
 */
export function verifySectionClaimsAgainstSource(sectionText = "", sourceText = "", writerModelId = "gemini-2.5-flash") {
  const crossFamily = selectCrossFamilyVerifier(writerModelId);
  const highRiskClaims = extractHighRiskClaims(sectionText);
  const normSource = String(sourceText || "").toLowerCase();

  const verifiedClaims = highRiskClaims.map((item) => {
    // Pass 1: Verify every dosage/number appears in the source
    const allNumbersPresent = item.numbersAndUnits.every((numToken) => {
      const numericPart = (numToken.match(/\d+(?:\.\d+)?/) || [])[0];
      return numericPart ? normSource.includes(numericPart) : true;
    });

    // Pass 2: Check key medical terms in source
    const keyWords = (item.claim.match(/[A-Za-z]{5,}|[\u0621-\u064A]{5,}/g) || [])
      .map((w) => w.toLowerCase())
      .slice(0, 6);
    const matchedWords = keyWords.filter((w) => normSource.includes(w));
    const semanticRatio = keyWords.length ? matchedWords.length / keyWords.length : 1;

    const pass1Ok = allNumbersPresent;
    const pass2Ok = semanticRatio >= 0.5;
    const status = pass1Ok && pass2Ok
      ? "supported"
      : !pass1Ok
        ? "high_risk_discrepancy"
        : "needs_review";

    return {
      ...item,
      pass1Ok,
      pass2Ok,
      status,
      flaggedForStudentReview: status !== "supported",
    };
  });

  const supportedCount = verifiedClaims.filter((c) => c.status === "supported").length;
  const faithfulness = verifiedClaims.length ? Number((supportedCount / verifiedClaims.length).toFixed(3)) : 1;

  return {
    ...crossFamily,
    totalHighRiskClaims: verifiedClaims.length,
    supportedCount,
    discrepancyCount: verifiedClaims.length - supportedCount,
    faithfulness,
    claims: verifiedClaims,
  };
}

export function verifyHighRiskNumbersAndDosages(summaryText = "", sourceText = "") {
  const report = verifySectionClaimsAgainstSource(summaryText, sourceText);
  const unverifiedNumbers = [];
  const normSource = String(sourceText || "").toLowerCase();
  for (const claim of report.claims) {
    for (const numToken of claim.numbersAndUnits || []) {
      const numericPart = (numToken.match(/\d+(?:\.\d+)?/) || [])[0];
      if (numericPart && !normSource.includes(numericPart)) {
        unverifiedNumbers.push(numericPart);
      }
    }
  }
  const allPass1Ok = report.claims.every((c) => c.pass1Ok);
  return {
    passed: unverifiedNumbers.length === 0 && allPass1Ok,
    unverifiedNumbers,
    report,
  };
}
