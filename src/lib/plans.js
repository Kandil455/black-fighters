// src/lib/plans.js
// خطط الاشتراك وباقات التوكنات - حسابات Alpha لمنصة Zeta
// تكلفة الـ API الأساسية: 35 دولار سنوياً لكل 100 مليون توكن شهرياً
// هامش ربح أكثر من 50% (3x تسعير)
// معادلة التوكنات: 100 جنيه مصري = 1,000,000 توكن

export const YEARLY_DISCOUNT = 2 / 12; // شهرين مجاناً عند الدفع السنوي

export const TOKEN_RATE = {
  pricePerMillion: 100, // 100 جنيه لكل 1M توكن
  baseCostPer100MPerYearUSD: 35,
  profitMultiplier: 3.0,
};

export const REFERRAL_REWARDS = {
  creditsPerInvite: 10,
  targetInvitesForFreePlan: 40,
  freePlanRewardValueEGP: 100,
  freePlanGrantedKey: "pro",
};

export const PLANS = [
  {
    key: "free",
    name: "Free",
    nameAr: "المجاني",
    monthly: 0,
    credits: 10,
    tokens: 0,
    dailyOperations: 2,
    tier: "free",
    features: [
      "هدية ترحيبية: ١٠ كريدت مجاناً للبدء فوراً",
      "محركات ذكاء اصطناعي سريعة ومجانية ⚡",
      "عمليتين في اليوم (تلخيصين أو كويزين)",
      "نظام إحالات: ١٠ كريدت لكل صديق تدعوه 🎁",
      "ادعُ ٤٠ صديق واحصل على اشتراك ١٠٠ ج مجاناً 👑"
    ],
    featuresEn: [
      "Welcome Gift: 10 Credits Free",
      "Fast & reliable free AI engines ⚡",
      "2 AI operations / day (summaries or quizzes)",
      "Referral: +10 Credits per friend",
      "Invite 40 friends to get 100 EGP Plan Free 👑"
    ],
    popular: false,
  },
  {
    key: "starter",
    name: "Starter",
    nameAr: "البداية الذكية",
    monthly: 49,
    credits: 250,
    tokens: 0,
    tier: "starter",
    features: [
      "الوصول الحصري لبوت التيليجرام (@black_fighters_bot) 🤖",
      "امتحان كويزات النظري (EBE) والعملي (OSPE) بالتيليجرام",
      "٢٥٠ كريدت شهرياً لكافة العمليات ⚡",
      "محركات AI متقدمة لتلخيص المحاضرات والكتب واليوتيوب",
      "معالجة ملفات حتى 80 صفحة",
      "بدون قيود على عدد العمليات اليومية"
    ],
    featuresEn: [
      "Exclusive Telegram Bot Access (@black_fighters_bot) 🤖",
      "Take EBE Theory & OSPE Quizzes inside Telegram",
      "250 credits / month ⚡",
      "Advanced AI engines for lectures, books & YouTube",
      "Files up to 80 pages",
      "No daily rate limits"
    ],
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    nameAr: "الاحترافية المتقدمة",
    monthly: 89,
    credits: 600,
    tokens: 0,
    tier: "pro",
    discountPercent: 15,
    popular: true,
    features: [
      "الوصول الحصري لبوت التيليجرام (@black_fighters_bot) 🤖",
      "امتحان كويزات النظري (EBE) والعملي (OSPE) بالتيليجرام",
      "٦٠٠ كريدت شهرياً ⚡",
      "محركات AI فائقة الذكاء للاختبارات والأسئلة المعقدة ⭐",
      "أعلى سرعة ودقة جراحية في التلخيص والامتحانات",
      "ملفات وسلايدات ومذكرات غير محدودة",
      "تصدير PDF و Word واستخراج الصور التوضيحية"
    ],
    featuresEn: [
      "Exclusive Telegram Bot Access (@black_fighters_bot) 🤖",
      "Take EBE Theory & OSPE Quizzes inside Telegram",
      "600 credits / month ⚡",
      "Ultra-smart AI engines for exams & complex reasoning ⭐",
      "Top speed & surgical exam precision",
      "Unlimited files, slides & quizzes",
      "Full PDF tools & Diagram extractor"
    ],
  },
  {
    key: "supreme",
    name: "Supreme",
    nameAr: "قمة Zeta المطلقة",
    monthly: 149,
    credits: 1500,
    tokens: 0,
    tier: "supreme",
    isElite: true,
    discountPercent: 30,
    features: [
      "الوصول الحصري لبوت التيليجرام (@black_fighters_bot) 🤖",
      "امتحان كويزات النظري (EBE) والعملي (OSPE) بالتيليجرام",
      "١,٥٠٠ كريدت شهرياً ⚡",
      "أقصى قدرة معالجة وسرعة استجابة غير محدودة 👑",
      "دعم معالجة الكتب الضخمة ومقاطع اليوتيوب الطويلة جداً",
      "تحليل معمق للمسائل والامتحانات النهائية الصعبة",
      "أولوية قصوى في سيرفرات التوليد ودعم VIP مباشر"
    ],
    featuresEn: [
      "Exclusive Telegram Bot Access (@black_fighters_bot) 🤖",
      "Take EBE Theory & OSPE Quizzes inside Telegram",
      "1,500 credits / month ⚡",
      "Maximum processing throughput & unlocked generation speed 👑",
      "Support for massive textbooks & long YouTube lectures",
      "Deep exam synthesis & complex problem solving",
      "Top server priority & 24/7 VIP support"
    ],
  },
  {
    key: "emergency_round",
    name: "Emergency Round",
    nameAr: "راوند الطوارئ",
    monthly: 99,
    credits: 100,
    tokens: 0,
    tier: "emergency",
    isEmergency: true,
    features: [
      "🚨 وصول كامل لقسم راوند الطوارئ بالموقع وبوت التيليجرام",
      "📄 ملفات وملازم حصرية تُعرض بصيغة HTML أو PDF تفاعلي",
      "📝 كويزات الطوارئ وبنوك الأسئلة المعدّة حصرياً بواسطة Alpha",
      "🤖 حل كويزات الطوارئ تفاعلياً بداخل بوت التيليجرام (@black_fighters_bot)",
      "⚡ ١٠٠ كريدت شهرياً لكافة أدوات الذكاء الاصطناعي بالمنصة",
      "🔔 إشعارات وتنبيهات فورية عند رفع أي محتوى طوارئ جديد"
    ],
    featuresEn: [
      "🚨 Full exclusive access to Emergency Round hub & Telegram bot",
      "📄 Exclusive study files rendered as responsive HTML or interactive PDF",
      "📝 Alpha's verified Emergency quizzes & exam question banks",
      "🤖 Interactive Telegram bot quiz polls (@black_fighters_bot)",
      "⚡ 100 monthly credits for all platform AI features",
      "🔔 Instant push alerts whenever new emergency material is published"
    ],
    popular: false,
  },
];

// باقات شحن الكريدت المباشرة (Credit Refill Packs)
export const CREDIT_REFILL_PACKS = [
  {
    key: "credits_50",
    name: "شحن 50 كريدت",
    credits: 50,
    price: 15,
    discount: 0,
    popular: false,
  },
  {
    key: "credits_150",
    name: "شحن 150 كريدت",
    credits: 150,
    price: 39,
    discount: 10,
    popular: false,
  },
  {
    key: "credits_400",
    name: "شحن 400 كريدت ⭐ (باقة الـ 100 ج)",
    credits: 400,
    price: 89,
    discount: 20,
    popular: true,
  },
  {
    key: "credits_1000",
    name: "شحن 1,000 كريدت 👑",
    credits: 1000,
    price: 199,
    discount: 30,
    popular: false,
  },
  {
    key: "credits_2500",
    name: "شحن 2,500 كريدت 🔥",
    credits: 2500,
    price: 420,
    discount: 40,
    popular: false,
  },
];

export const TOKEN_REFILL_PACKS = CREDIT_REFILL_PACKS;

export function yearlyPrice(monthly) {
  if (monthly === 0) return 0;
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));
}

export function yearlyMonthlyEquivalent(monthly) {
  if (monthly === 0) return 0;
  return Math.round((monthly * 12 * (1 - YEARLY_DISCOUNT)) / 12);
}

export function planPrice(plan, billing = "monthly") {
  return billing === "yearly" ? yearlyPrice(plan.monthly) : plan.monthly;
}

export function planDurationDays(billing = "monthly") {
  return billing === "yearly" ? 365 : 30;
}

export function planCredits(plan, billingOrDays = "monthly") {
  const months = typeof billingOrDays === "number"
    ? Math.max(1, Math.round(billingOrDays / 30))
    : billingOrDays === "yearly" ? 12 : 1;
  return (plan.credits || 0) * months;
}

export function formatTokens(tokens) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return `${tokens}`;
}
