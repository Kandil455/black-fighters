/**
 * src/features/lectures/config.js — Single source of truth for LECTURE_CONFIG.
 * Re-exports from `./lib/config.js` so both `src/features/lectures/config.js`
 * and `src/features/lectures/lib/config.js` resolve identically.
 */
import { LECTURE_CONFIG } from "./lib/config.js";

export * from "./lib/config.js";
export const TRANSCRIBE_MODEL = LECTURE_CONFIG.TRANSCRIBE_MODEL;
export default LECTURE_CONFIG;
