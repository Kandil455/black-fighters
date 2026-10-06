/**
 * gemini.js — backward-compat re-export
 * All real logic is in ai.js (multi-provider router)
 */
export {
  generateContent,
  chatContent,
  generateText,
  chatText,
  callAI,
  runGenerateStudyContent,
  runAiChat,
  PROMPTS,
  DEFAULT_MODELS,
} from "./ai.js";
