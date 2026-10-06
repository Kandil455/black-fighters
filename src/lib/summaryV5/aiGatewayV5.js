/**
 * BLACK FIGHTERS V5 «الأطلس» — Unified AI Gateway V5
 * Implements V4 Section 9 + V5 Section 2.6:
 * - Task -> Model routing matrix (Ingest OCR, Foundational Writer, Cross-Family Verifier, Quiz Generator, Cheat Sheet Reducer)
 * - Mandatory Cross-Family Verifier enforcement (Writer != Verifier provider family)
 * - PII Scrubber (strips phone numbers, emails, national IDs, student tokens before LLM calls)
 */

import {
  getModelFamily,
  selectCrossFamilyVerifier,
  verifySectionClaimsAgainstSource,
} from './verifier.js';

export const AI_GATEWAY_ROUTING_MATRIX = Object.freeze({
  ocr_vision_ingest: {
    task: 'ocr_vision_ingest',
    primaryModel: 'gemini-2.5-flash',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.1,
  },
  foundational_chapter_writer: {
    task: 'foundational_chapter_writer',
    primaryModel: 'gemini-2.5-pro',
    fallbackModel: 'claude-3-5-sonnet',
    maxTokens: 8192,
    temperature: 0.2,
  },
  cross_family_verifier: {
    task: 'cross_family_verifier',
    primaryModel: 'gpt-4o-mini',
    fallbackModel: 'claude-3-5-haiku',
    maxTokens: 4096,
    temperature: 0.0,
  },
  global_cheatsheet_reducer: {
    task: 'global_cheatsheet_reducer',
    primaryModel: 'gemini-2.5-flash',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 6144,
    temperature: 0.15,
  },
  declassify_quiz_generator: {
    task: 'declassify_quiz_generator',
    primaryModel: 'gemini-2.5-flash',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.25,
  },
});

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{7,11}/g;
const NATIONAL_ID_RE = /\b[23]\d{13}\b/g;

/**
 * Scrub PII before sending text to external LLM providers
 */
export function scrubPiiBeforeAiCall(rawText = '') {
  return String(rawText ?? '')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(NATIONAL_ID_RE, '[REDACTED_NATIONAL_ID]')
    .replace(PHONE_RE, (match) => {
      if (match.replace(/\D/g, '').length >= 10) {
        return '[REDACTED_PHONE]';
      }
      return match;
    });
}

/**
 * Assert whether two models belong to different model families
 */
export function assertCrossFamilyVerifier(writerModelId, verifierModelId) {
  const writerFamily = getModelFamily(writerModelId);
  const verifierFamily = getModelFamily(verifierModelId);
  return {
    valid: writerFamily !== verifierFamily,
    writerFamily,
    verifierFamily,
  };
}

/**
 * Select a Verifier model guaranteed to be from a different model family than the Writer model
 */
export function selectCrossFamilyVerifierModel(writerModel = 'gemini-2.5-pro') {
  return selectCrossFamilyVerifier(writerModel);
}

/**
 * Execute a verified chapter generation pipeline step (Writer + Cross-Family Verifier)
 */
export async function runVerifiedChapterGeneration({
  part,
  writerModel = AI_GATEWAY_ROUTING_MATRIX.foundational_chapter_writer.primaryModel,
  writerFn,
} = {}) {
  const familyPair = selectCrossFamilyVerifier(writerModel);
  const scrubbedSourceText = scrubPiiBeforeAiCall(part?.sourceText || '');

  const generatedChapter = writerFn
    ? await writerFn({ ...part, sourceText: scrubbedSourceText, model: writerModel })
    : part?.draftChapter || {};

  const verificationReport = verifySectionClaimsAgainstSource(
    generatedChapter?.text || JSON.stringify(generatedChapter),
    scrubbedSourceText,
    writerModel
  );

  return {
    chapter: generatedChapter,
    verification: verificationReport,
    modelsUsed: familyPair,
  };
}
