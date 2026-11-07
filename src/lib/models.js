/**
 * models.js — AI Provider & 31-Model Catalog
 * Engineered by Claude Sonnet 5 for Zeta Platform (Commander Alpha)
 * All 31 models from CodeCraft API organized into 4 Tiers:
 * 1. Free (8 models — lightweight, token-saver)
 * 2. Starter (6 models — fast, smart, 29 EGP)
 * 3. Pro (8 models — high intelligence, includes Claude Sonnet 5, 59 EGP)
 * 4. Supreme (9 models — flagship zenith, includes Claude Opus 5 & Grok 4.6, 99 EGP)
 */

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
    desc: "نماذج خفيفة اقتصادية التوكنات (عمليتين يومياً)",
  },
  starter: {
    name: "Starter",
    nameAr: "البداية",
    badge: "Starter ⚡",
    color: "cyan",
    desc: "نماذج سريعة متقدمة للدراسة اليومية (49 ج)",
  },
  pro: {
    name: "Pro",
    nameAr: "الاحترافية",
    badge: "Pro ⭐",
    color: "purple",
    desc: "ذكاء أكاديمي عالي يشمل Claude Sonnet 5 (89 ج)",
  },
  supreme: {
    name: "Supreme",
    nameAr: "قمة Zeta",
    badge: "Supreme 👑",
    color: "amber",
    desc: "القمة الأكاديمية المطلقة وتشمل Claude Opus 5 و Grok 4.6 (149 ج)",
  },
};

export const FREE_TIER_LIMITS = {
  operationsPerDay: 2,
  description: "تلخيصين أو كويزين يومياً في الخطة المجانية",
};

// All 31 CodeCraft models with tier classification
export const ALL_CODECRAFT_MODELS = [
  // ─── 1. Free Tier (8 models — Token Savers) ──────────────────────────────
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tier: TIERS.FREE,
    provider: "Google",
    features: "سريع وخفيف واقتصادي جداً في استهلاك التوكنات",
    recommended: true,
  },
  {
    id: "deepseek-v4-flash-0731",
    name: "DeepSeek V4 Flash",
    tier: TIERS.FREE,
    provider: "DeepSeek",
    features: "استجابة فورية وتلخيص سريع للمقاطع القصيرة",
  },
  {
    id: "gemma-2-2b",
    name: "Gemma 2 2B",
    tier: TIERS.FREE,
    provider: "Google",
    features: "نموذج خفيف ومباشر للأسئلة المباشرة",
  },
  {
    id: "seed-2.1-turbo",
    name: "Seed 2.1 Turbo",
    tier: TIERS.FREE,
    provider: "ByteDance",
    features: "سرعة توربو ممتازة للمهام الروتينية الخفيفة",
  },
  {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    tier: TIERS.FREE,
    provider: "Moonshot",
    features: "استخراج سريع للنصوص وسياق جيد بدون استهلاك عالي",
  },
  {
    id: "muse-spark-1.1",
    name: "Muse Spark 1.1",
    tier: TIERS.FREE,
    provider: "Meta",
    features: "ردود رشيقة وموجزة للشات السريع",
  },
  {
    id: "qwen3.8-27b",
    name: "Qwen 3.8 27B",
    tier: TIERS.FREE,
    provider: "Alibaba",
    features: "توازن ممتاز بين الجودة واستهلاك التوكنات",
  },
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    tier: TIERS.FREE,
    provider: "Zhipu AI",
    features: "معالجة لغوية خفيفة وسريعة للمذكرات البسيطة",
  },

  // ─── 2. Starter Tier (6 models — 29 EGP) ──────────────────────────────────
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash ⭐",
    tier: TIERS.STARTER,
    provider: "Google",
    features: "فائق التوازن والسرعة للمحاضرات الجامعية والكويزات",
    recommended: true,
  },
  {
    id: "deepseek-v4-pro-0813",
    name: "DeepSeek V4 Pro 0813",
    tier: TIERS.STARTER,
    provider: "DeepSeek",
    features: "دقة استدلال قوية في الأسئلة العلمية والاختيارات",
  },
  {
    id: "gpt-5.5",
    name: "GPT 5.5",
    tier: TIERS.STARTER,
    provider: "OpenAI",
    features: "توليد كويزات متناسقة وتغطية ممتازة للمصطلحات",
  },
  {
    id: "qwen3.7-max",
    name: "Qwen 3.7 Max",
    tier: TIERS.STARTER,
    provider: "Alibaba",
    features: "استخراج دقيق للمعلومات من الجداول والفقرات",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    tier: TIERS.STARTER,
    provider: "Moonshot",
    features: "تحليل مذكرات وسلايدات ذات سياق واسع",
  },
  {
    id: "seed-2.1-pro",
    name: "Seed 2.1 Pro",
    tier: TIERS.STARTER,
    provider: "ByteDance",
    features: "أداء احترافي سريع لتلخيص الفصول الأكاديمية",
  },

  // ─── 3. Pro Tier (8 models — 59 EGP) ──────────────────────────────────────
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5 ⭐",
    tier: TIERS.PRO,
    provider: "Anthropic",
    features: "المحرك الأكاديمي الرائد • سرعة خارقة ودقة جراحية في التلخيص والامتحانات",
    recommended: true,
  },
  {
    id: "deepseek-v4-pro-max",
    name: "DeepSeek V4 Pro Max ⚡",
    tier: TIERS.PRO,
    provider: "DeepSeek",
    features: "أقوى نموذج منطقي للمسائل المعقدة وبنوك الأسئلة المتقدمة",
  },
  {
    id: "gpt-5.5-pro",
    name: "GPT 5.5 Pro",
    tier: TIERS.PRO,
    provider: "OpenAI",
    features: "استنتاج احترافي وتحليل عميق للمناهج الجامعية",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    tier: TIERS.PRO,
    provider: "OpenAI",
    features: "توليد شروحات إبداعية وحالات تطبيقية واقعية",
  },
  {
    id: "grok-4.5",
    name: "Grok 4.5",
    tier: TIERS.PRO,
    provider: "xAI",
    features: "معالجة تفاعلية رشيقة وأسلوب تعليمي مباشر",
  },
  {
    id: "glm-5.3",
    name: "GLM 5.3",
    tier: TIERS.PRO,
    provider: "Zhipu AI",
    features: "قوة تحليلية للبحوث والأوراق العلمية المعقدة",
  },
  {
    id: "qwen3.8-max",
    name: "Qwen 3.8 Max",
    tier: TIERS.PRO,
    provider: "Alibaba",
    features: "دقة استثنائية في اللغات والترجمة الأكاديمية",
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    tier: TIERS.PRO,
    provider: "Google",
    features: "سياق موسع وتحليل دقيق للكتب والمراجع الكبيرة",
  },

  // ─── 4. Supreme / Elite Tier (9 models — 99 EGP - قمة Zeta) ──────────────
  {
    id: "claude-opus-5",
    name: "Claude Opus 5 👑",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "القمة الأكاديمية المطلقة في تاريخ الذكاء الاصطناعي • فهم عبقري وتحليل حالات سريرية وهندسية لا يخطئ",
    recommended: true,
  },
  {
    id: "claude-opus-4.8",
    name: "Claude Opus 4.8",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "ذكاء استنتاجي فائق للمواد بالغة الصعوبة والتفاصيل الدقيقة",
  },
  {
    id: "claude-opus-4.7",
    name: "Claude Opus 4.7",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "توليد أسئلة امتحانات نهائية تقيس الفهم المعمق والتفكير النقدي",
  },
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "أعلى توازن بين الفلسفة العلمية والتحليل الأكاديمي الصارم",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT 5.6 Sol ☀️",
    tier: TIERS.SUPREME,
    provider: "OpenAI",
    features: "وحش OpenAI الأحدث • توليد معرفي متكامل وحل امتحانات شاملة",
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT 5.6 Terra",
    tier: TIERS.SUPREME,
    provider: "OpenAI",
    features: "قوة تحليلية للبيانات والأرقام والحالات المعقدة",
  },
  {
    id: "grok-4.6",
    name: "Grok 4.6 🚀",
    tier: TIERS.SUPREME,
    provider: "xAI",
    features: "سرعة خارقة مع أعلى دقة استدلال متطورة",
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "صياغة علمية أدبية رفيعة تشرح المفاهيم المجردة كقصص تعليمية",
  },
  {
    id: "claude-mythos-preview",
    name: "Claude Mythos Preview",
    tier: TIERS.SUPREME,
    provider: "Anthropic",
    features: "معاينة تجريبية لنواة الجيل القادم من نماذج التفكير الفائق",
  },
];

export const PROVIDERS = {
  codecraft: {
    name: "CodeCraft (31 Models)",
    color: "amber",
    icon: "👑",
    keyUrl: "https://codecraftapi.com",
    freeNote: "31 نموذج جبار — Claude Opus 5 & Sonnet 5 & GPT-5.6 & DeepSeek V4",
    models: ALL_CODECRAFT_MODELS,
  },

  gemini: {
    name: "Google Gemini",
    color: "cyan",
    icon: "✦",
    keyUrl: "https://aistudio.google.com/apikey",
    freeNote: "مجاني من Google — مفتاح API شخصي مع تدوير 7 موديلات فلاش",
    models: [
      {
        id: "gemini-3.8-flash",
        name: "Gemini 3.8 Flash ⚡",
        features: "الجيل الأحدث • استنتاج فائق Extended Thinking وسرعة خرافية",
        recommended: true,
      },
      {
        id: "gemini-3.7-flash",
        name: "Gemini 3.7 Flash",
        features: "تفكير سريري عميق • ممتاز للتحليلات الطبية والـ MCQs",
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash ⭐",
        features: "ثابت ومجاني • ممتاز للتلخيص الطويل والعربية • سياق كبير",
      },
      {
        id: "gemini-3.5-flash-lite",
        name: "Gemini 3.5 Flash Lite 🚀",
        features: "الأسرع والأوفر إطلاقاً • قراءة بصرية خارقة للصور وملفات الـ OCR في ثانية واحدة",
        isOcrDefault: true,
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        features: "أعلى جودة للمواد المعقدة • أبطأ وقد يكون مدفوعاً",
      },
    ],
  },

  apmix: {
    name: "APMIX.AI",
    color: "green",
    icon: "💎",
    keyUrl: "https://apmix.ai/dashboard/keys",
    freeNote: "مجاني 10M توكنز — DeepSeek V4 Flash و Space Bunny",
    models: [
      {
        id: "deepseek-v4-flash-free",
        name: "DeepSeek V4 Flash Free ⭐",
        features: "سياق مليون توكن مجاناً • استجابة فائقة وتحليل ممتاز",
        recommended: true,
      },
      {
        id: "space-bunny-free",
        name: "Space Bunny Free",
        features: "نموذج مجاني خفيف وسريع للمهام المباشرة",
      },
    ],
  },

  groq: {
    name: "Groq",
    color: "purple",
    icon: "⚡",
    keyUrl: "https://console.groq.com/keys",
    freeNote: "مجاني — أسرع AI في العالم (Groq LPU)",
    models: [
      {
        id: "openai/gpt-oss-120b",
        name: "GPT-OSS 120B ⭐",
        features: "أقوى نموذج مجاني عالي الاستدلال • سرعة Groq الخارقة",
        recommended: true,
      },
      {
        id: "qwen/qwen3.8-27b",
        name: "Qwen 3.8 27B",
        features: "توازن ذكي وتحليل دقيق للمصطلحات والأسئلة",
      },
      {
        id: "allam-2-7b",
        name: "Allam 2 7B Arabic 🇸🇦",
        features: "نموذج عربي متخصص في المحتوى اللغوي والأكاديمي",
      },
      {
        id: "openai/gpt-oss-20b",
        name: "GPT-OSS 20B Instant",
        features: "فوري وخفيف جداً للشات والردود السريعة",
      },
    ],
  },

  openrouter: {
    name: "OpenRouter",
    color: "green",
    icon: "🔀",
    keyUrl: "https://openrouter.ai/keys",
    freeNote: "Router تلقائي مجاني أو Auto مدفوع",
    models: [
      { id: "openrouter/free", name: "OpenRouter Free Router ⭐", features: "يختار موديل مجاني متاح تلقائياً", recommended: true },
      { id: "qwen/qwen3.8-27b:free", name: "Qwen 3.8 27B Free", features: "نموذج مجاني متاح بدون رصيد" },
      { id: "inclusionai/ling-3.0-flash-sante:free", name: "Ling 3.0 Flash Medical 🩺", features: "مخصص للعلوم الطبية والصحية مجاناً" },
      { id: "openrouter/auto", name: "OpenRouter Auto", features: "أفضل اختيار تلقائي حسب المهمة" },
    ],
  },

  pollinations: {
    name: "Pollinations.ai",
    color: "cyan",
    icon: "🌸",
    keyUrl: "https://pollinations.ai",
    freeNote: "مجاني 100% غير محدود بدون مفتاح API وبدون تسجيل نهائياً",
    models: [
      { id: "openai", name: "GPT-4o-mini (Pollinations) ⭐", features: "مجاني تماماً بدون مفتاح • سرعة وجودة ممتازة", recommended: true },
      { id: "mistral", name: "Mistral Small (Pollinations)", features: "معالجة لغوية سريعة ومجانية بدون حدود" },
      { id: "llama", name: "Llama 3.3 (Pollinations)", features: "نموذج ميتا المفتوح مجاناً بالكامل" },
    ],
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
export function getModelTier(modelId) {
  const m = ALL_CODECRAFT_MODELS.find(item => item.id === modelId);
  return m ? m.tier : TIERS.FREE;
}

/** Check whether a given user tier can access this model */
export function canUserAccessModel(modelId, userPlanOrTier = "free") {
  // Normalize plan names
  const normalized = (userPlanOrTier || "free").toLowerCase();
  const tierKey = normalized === "admin" || normalized === "max" || normalized === "supreme"
    ? "supreme"
    : normalized === "pro" || normalized === "plus"
    ? "pro"
    : normalized === "starter"
    ? "starter"
    : "free";

  const userLevel = TIER_HIERARCHY[tierKey] ?? 0;
  const modelTier = getModelTier(modelId);
  const requiredLevel = TIER_HIERARCHY[modelTier] ?? 0;

  return userLevel >= requiredLevel;
}

/** Returns models available for a specific user tier */
export function getUserAvailableModels(userPlanOrTier = "free") {
  return ALL_CODECRAFT_MODELS.filter(m => canUserAccessModel(m.id, userPlanOrTier));
}

/** Returns the recommended (default) model ID for a given provider and tier */
export function getDefaultModel(provider = "codecraft", userPlanOrTier = "free") {
  const p = PROVIDERS[provider];
  if (!p) return "gemini-3.6-flash";

  if (provider === "codecraft") {
    const available = getUserAvailableModels(userPlanOrTier);
    // Find the highest recommended model the user has access to
    const rec = available.slice().reverse().find(m => m.recommended);
    return rec?.id || available[0]?.id || "gemini-3.6-flash";
  }

  return p.models.find(m => m.recommended)?.id || p.models[0]?.id || "";
}
