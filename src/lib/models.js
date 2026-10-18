/**
 * models.js — Unified AI Model Catalog
 * Exclusively powered by DeepSeek-V4.1-Flash-1017 (Multimodal Vision + Text)
 */

export const SOLE_MODEL_ID = "DeepSeek-V4.1-Flash-1017";

export const TIERS = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  SUPREME: "supreme",
};

export const TIER_HIERARCHY = {
  free: 0,
  starter: 1,
  pro: 2,
  supreme: 3,
};

export const TIER_INFO = {
  free: {
    name: "Free",
    nameAr: "المجاني",
    badge: "Free 🟢",
    color: "green",
    maxDailyOps: 2,
    desc: "محرك DeepSeek-V4.1-Flash-1017 الموحد (عمليتين يومياً)",
  },
  starter: {
    name: "Starter",
    nameAr: "البداية",
    badge: "Starter ⚡",
    color: "cyan",
    desc: "محرك DeepSeek-V4.1-Flash-1017 للدراسة اليومية (49 ج)",
  },
  pro: {
    name: "Pro",
    nameAr: "الاحترافية",
    badge: "Pro ⭐",
    color: "purple",
    desc: "محرك DeepSeek-V4.1-Flash-1017 للامتحانات والأوسكي والتلخيص (89 ج)",
  },
  supreme: {
    name: "Supreme",
    nameAr: "قمة Zeta",
    badge: "Supreme 👑",
    color: "amber",
    desc: "سعة قصوى على محرك DeepSeek-V4.1-Flash-1017 الشامل (149 ج)",
  },
};

export const FREE_TIER_LIMITS = {
  operationsPerDay: 2,
  description: "تلخيصين أو كويزين يومياً في الخطة المجانية",
};

export const ALL_CODECRAFT_MODELS = [
  {
    id: SOLE_MODEL_ID,
    name: "DeepSeek-V4.1-Flash-1017 👁️⚡",
    tier: TIERS.FREE,
    provider: "DeepSeek",
    supportsVision: true,
    features: "المحرك الرسمي الموحد للمنصة (Vision + Text) • يقرأ ويحلل الصور وشرائح الأوسكي والملفات والنصوص بدقة وسرعة خارقة",
    recommended: true,
  },
];

export const PROVIDERS = {
  deepseek: {
    name: "DeepSeek-V4.1-Flash-1017",
    color: "cyan",
    icon: "🐋",
    keyUrl: "https://platform.deepseek.com/api_keys",
    freeNote: "المحرك الرسمي الموحد للمنصة — يقرأ ويحلل الصور والأوسكي والامتحانات والنصوص",
    models: ALL_CODECRAFT_MODELS,
  },
};

export const COLOR_CLASSES = {
  amber: {
    border:  "border-amber-400/40",
    glow:    "neon-glow-gold",
    text:    "text-amber-400",
    bg:      "bg-amber-400/10",
    badge:   "bg-amber-400/20 text-amber-300",
  },
  cyan: {
    border:  "border-primary/40",
    glow:    "neon-glow-cyan",
    text:    "text-primary",
    bg:      "bg-primary/10",
    badge:   "bg-primary/20 text-primary",
  },
  purple: {
    border:  "border-accent/40",
    glow:    "neon-glow-purple",
    text:    "text-accent",
    bg:      "bg-accent/10",
    badge:   "bg-accent/20 text-accent",
  },
  green: {
    border:  "border-[hsl(152,100%,50%)]/40",
    glow:    "neon-glow-green",
    text:    "text-[hsl(152,100%,50%)]",
    bg:      "bg-[hsl(152,100%,50%)]/10",
    badge:   "bg-[hsl(152,100%,50%)]/20 text-[hsl(152,100%,50%)]",
  },
};

/** Returns the model's assigned Tier */
export function getModelTier(_modelId) {
  return TIERS.FREE;
}

/** Check whether a given user tier can access this model */
export function canUserAccessModel(_modelId, _userPlanOrTier = "free") {
  return true;
}

/** Returns models available for a specific user tier */
export function getUserAvailableModels(_userPlanOrTier = "free") {
  return ALL_CODECRAFT_MODELS;
}

/** Returns the sole unified model ID */
export function getDefaultModel(_provider = "deepseek", _userPlanOrTier = "free") {
  return SOLE_MODEL_ID;
}

