/**
 * colorTokens.js — the SINGLE colour/role dictionary for every summary surface.
 *
 * Before this module three engines each invented their own emphasis:
 *   • SummaryView.FormattedInlineText (richest — lead terms, (terms), ALL-CAPS)
 *   • summaryStudyGuide.inlineMarkup      (weaker — lost lead terms/units)
 *   • InfographicSummary.cleanText        (none — stripped ** and ==)
 * so one summary looked different in all three tabs. Everything now reads the
 * same tokens from here.
 *
 * Roles are semantic, never raw colours: a caller asks for `danger`, not `red`.
 */

/** Inline emphasis roles → CSS class + Arabic/English label. */
export const ROLES = Object.freeze({
  /** Disease / drug / anatomical term — bold + dotted underline. */
  term: { className: "bf-t-term", labelAr: "مصطلح", labelEn: "Term" },
  /** High-yield fact to memorise — marker highlight. */
  key: { className: "bf-t-key", labelAr: "مهم", labelEn: "Key" },
  /** Number, dose, threshold (5 mg/kg, GCS ≤ 8) — mono pill. */
  value: { className: "bf-t-value", labelAr: "رقم", labelEn: "Value" },
  /** Red flag / contraindication / exam trap. */
  danger: { className: "bf-t-danger", labelAr: "تحذير", labelEn: "Danger" },
  /** Normal finding / correct line / first-line. */
  ok: { className: "bf-t-ok", labelAr: "طبيعي", labelEn: "Normal" },
  /** Mechanism / equation / causal link. */
  mech: { className: "bf-t-mech", labelAr: "آلية", labelEn: "Mechanism" },
  /** Inline code / dose formula. */
  code: { className: "bf-t-code", labelAr: "قانون", labelEn: "Formula" },
});

export const ROLE_NAMES = Object.freeze(Object.keys(ROLES));

/**
 * `==name:text==` aliases → role.
 * `purple` was missing entirely and rendered as literal "purple:" text — it is
 * now supported. `blue` and `cyan` both map to the same blue role.
 */
export const MARK_ALIASES = Object.freeze({
  term: "term",
  key: "key",
  value: "value",
  danger: "danger",
  ok: "ok",
  mech: "mech",
  code: "code",
  // legacy colour names used by older saved summaries
  red: "danger",
  green: "ok",
  yellow: "key",
  cyan: "value",
  blue: "value",
  orange: "danger",
  purple: "mech",
  violet: "mech",
});

/** Palette shared by HTML, PDF and the infographic (light + dark). */
export const PALETTE = Object.freeze({
  light: {
    ink: "#101828",
    muted: "#5b6577",
    line: "#e4e8ef",
    bg: "#ffffff",
    accent: "#0f7b57",
    accentDark: "#0b5c41",
    accentSoft: "#e9f7ef",
    term: "#101828",
    termUnderline: "#94a3b8",
    key: "#fef6d8",
    keyInk: "#6b4e00",
    value: "#eaf2fa",
    valueInk: "#1b5e93",
    danger: "#b42318",
    dangerBg: "#fdedec",
    ok: "#177245",
    okBg: "#e9f7ef",
    mech: "#6d28d9",
    mechBg: "#f4ecf7",
    code: "#1e3a5f",
    codeBg: "#eef2f7",
    exam: "#b45309",
    examBg: "#fef6e7",
  },
  sepia: {
    ink: "#3b2f1e",
    muted: "#7a6749",
    line: "#e6dcc8",
    bg: "#f8f1e3",
    accent: "#8a6a2f",
    accentDark: "#6b5122",
    accentSoft: "#f0e6cf",
    term: "#3b2f1e",
    termUnderline: "#b8a179",
    key: "#fde9a8",
    keyInk: "#5c4400",
    value: "#e8e0cf",
    valueInk: "#4a5a6b",
    danger: "#9b2c20",
    dangerBg: "#f6e0dc",
    ok: "#3f6b3a",
    okBg: "#e6efe0",
    mech: "#5b3f7a",
    mechBg: "#ece4f2",
    code: "#3b2f1e",
    codeBg: "#efe6d4",
    exam: "#8a5a12",
    examBg: "#f7e9cf",
  },
  dark: {
    ink: "#e8edf5",
    muted: "#9aa7b8",
    line: "#2a3441",
    bg: "#0f1620",
    accent: "#34d399",
    accentDark: "#10b981",
    accentSoft: "#12302a",
    term: "#ffffff",
    termUnderline: "#5f7a94",
    key: "#4a3c10",
    keyInk: "#ffe58a",
    value: "#14304a",
    valueInk: "#8dc7f5",
    danger: "#ff8b7e",
    dangerBg: "#3a1c1a",
    ok: "#6ee7b7",
    okBg: "#12302a",
    mech: "#c4a5f5",
    mechBg: "#2a1f3d",
    code: "#cbd5e1",
    codeBg: "#1b2530",
    exam: "#fbbf24",
    examBg: "#3a2c10",
  },
});

export const THEMES = Object.freeze(["light", "sepia", "dark"]);

/** Block-level box types → label + icon key + tone role. */
export const BOXES = Object.freeze({
  definition: { labelAr: "تعريف", labelEn: "Definition", icon: "book", tone: "value" },
  mechanism: { labelAr: "آلية", labelEn: "Mechanism", icon: "cog", tone: "mech" },
  high_yield: { labelAr: "لازم تحفظه", labelEn: "High yield", icon: "star", tone: "key" },
  warning: { labelAr: "فخ الامتحان", labelEn: "Exam trap", icon: "alert", tone: "danger" },
  pearl: { labelAr: "نصيحة إكلينيكية", labelEn: "Clinical pearl", icon: "bulb", tone: "ok" },
  mnemonic: { labelAr: "تريكة للحفظ", labelEn: "Mnemonic", icon: "brain", tone: "mech" },
  formula: { labelAr: "قانون أو جرعة", labelEn: "Formula", icon: "sigma", tone: "code" },
  example: { labelAr: "حالة أو مثال", labelEn: "Example", icon: "case", tone: "value" },
});

export const BOX_NAMES = Object.freeze(Object.keys(BOXES));

/** The one-line "في سطر" summary heading. */
export const ONE_LINER = Object.freeze({ ar: "في سطر", en: "In a line" });

/** Words that mark an exam-critical line (Arabic + English). */
// Only words that genuinely flag a DANGER. Emphasis words (أهم، لازم، يجب)
// belong to the `key` role — colouring them red made every paragraph look
// like a warning and destroyed the meaning of the colour.
export const EXAM_WORDS_AR = Object.freeze([
  "ممنوع", "محظور", "تحذير", "خطر", "فخ", "انتبه", "احذر", "مضاد استطباب",
  "أبداً", "لا يجوز", "خطير",
]);
/** Emphasis words → `key` (yellow marker), not danger. These are the phrases a
 *  student must actually retain, so they get the high-yield colour. */
export const KEY_WORDS_AR = Object.freeze([
  "أهم", "لازم", "يجب", "ضروري", "أساسي", "دايماً", "دائماً", "الخط الأول",
]);
export const KEY_WORDS_EN = Object.freeze([
  "important", "essential", "must know", "always", "first line", "key",
]);

export const EXAM_WORDS_EN = Object.freeze([
  "must", "never", "always", "contraindicated", "avoid", "warning",
  "danger", "high yield", "first line", "trap", "red flag", "emergency",
]);

/**
 * Density rules — highlighting everything highlights nothing.
 * A section may not exceed `maxRatio` of its text in `key` role, and a single
 * paragraph may not carry more than `maxPerParagraph` highlights.
 */
export const DENSITY_RULES = Object.freeze({
  maxRatio: 0.12,
  maxPerParagraph: 2,
  maxBoldTermsPerSentence: 3,
  /** Section word counts that select the study-guide layout. */
  compactWords: 600,
  standardWords: 2_500,
  richWords: 8_000,
});

/** Reading measure — 1150px was too wide for comfortable reading. */
export const MEASURE = Object.freeze({
  contentMax: 820,
  contentMin: 760,
  minFontSize: 17,
  maxFontSize: 18,
  lineHeight: 1.85,
  infographicLabelPx: 12,
  infographicBodyPx: 14.5,
  wordsPerMinute: 180,
});

export default ROLES;
