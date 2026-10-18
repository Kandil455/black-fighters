import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LocaleContext = createContext(null);

const MESSAGES = {
  ar: {
    // Navigation & Layout
    learn: "المذاكرة والتلخيص",
    community: "المجتمع والتحدي",
    account: "حسابي",
    tools: "أدوات",
    courses: "مذكراتي ومحاضراتي",
    myCourses: "مقرراتي ومحاضراتي",
    loadingCourses: "جاري تحميل مقرراتك ومحاضراتك...",
    noMatchingCourses: "لا توجد مقررات مطابقة للبحث",
    noMatchingDesc: "جرّب البحث بكلمة أخرى أو إعادة ضبط الفلاتر لعرض جميع المحاضرات.",
    resetFilters: "إعادة ضبط الفلاتر",
    create: "تلخيص محاضرة جديدة",
    quizzes: "الكويزات والتقييم",
    review: "استوديو المراجعة",
    friends: "الأصدقاء والمجموعات",
    groups: "جروبات المذاكرة",
    challenge: "حلبة المتصدرين",
    stats: "إحصائيات الإنجاز",
    profile: "الملف الشخصي",
    subscriptions: "الاشتراكات",
    pdf: "استوديو PDF",
    settings: "الإعدادات",
    admin: "لوحة الأدمن",
    search: "ابحث في المحاضرات والملخصات...",
    summarize: "تلخيص الملف",
    quickQuiz: "كويز سريع",
    textQuiz: "كويز نصي (البارسر الخارق)",
    imageExtractor: "مستخرج الصور والكويز",
    quizBank: "بنك الكويزات",
    logout: "تسجيل الخروج",
    studentDefault: "طالب متميز",
    proBadge: "برو",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الليلي",

    // Dashboard Hero & Metrics
    welcomeHero: "أهلاً بك،",
    dashSubtitle: "ارفع أي مذكرة أو سلايدز — ولخّص واختبر نفسك في ثواني بدون تشتيت.",
    newSummaryBtn: "تلخيص جديد",
    imageQuizBtn: "كويز الصور والرسومات",
    lecturesCount: "المحاضرات والمذكرات",
    lessonsCount: "الفصول والأسئلة",
    xpPoints: "نقاط الخبرة",
    streakDays: "أيام الاستمرار",
    creditsLabel: "كريدت",
    myLecturesTitle: "مذكراتك ومحاضراتك",
    myLecturesSub: "كل ملف مرفوع بيتحول لملخص منظم، كويز تفاعلي، وبطاقات مراجعة سريعة.",
    searchLecturesPlaceholder: "ابحث في مذكراتك ومحاضراتك...",
    filterAll: "الكل",
    sortNewest: "الأحدث",
    sortTopRated: "الأعلى تقييماً",
    noCoursesYet: "لسه مفيش ملفات مرفوعة",
    noCoursesDesc: "ارفع أول محاضرة أو مذكرة، وهنعملك منها ملخص وكويز وبطاقات مراجعة في ثواني.",
    uploadFirstLecture: "ارفع أول ملف دلوقتي",

    // Smart Daily Plan
    dailyFocusBadge: "مراجعة اليوم السريعة",
    dailyFocusTitle: "مراجعة سريعة قبل ما تبدأ",
    dailyFocusDesc: "مجهزين لك كروت مراجعة مستحقة وأسئلة سريعة لتثبيت المعلومة ومواصلة الستريك.",
    startFocusSession: "ابدأ المراجعة (5 دقائق)",
    closeSession: "إغلاق الجلسة",

    // Course Card
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: "يوم",
    chapter: "فصل",
    chapters: "فصول",
    quizBadge: "كويز",
    summaryBadge: "ملخص",
    flashcardsBadge: "بطاقات",
    defaultCourseDesc: "ملخص محاضرة دراسية منظم مع أسئلة ومراجعة ذكية",

    // Landing Page
    landingHeroBadge: "الجيل الجديد من منصات المذاكرة الذكية",
    landingHeroTitle: "حوّل أي محاضرة أو PDF لمذكرة ذكية وكويز تفاعلي في ثوانٍ",
    landingHeroSubtitle: "ارفع محاضرتك — وسيقوم النظام بتحويلها إلى بطاقات مفاهيم منظمة، جداول مقارنات، تنبيهات امتحانات، وكويزات تدريبية.",
    startBattleCTA: "ابدأ المذاكرة مجاناً",
    uploadNotesNowCTA: "ارفع مذكرتك الآن",
    registeredFighters: "طالب يذاكر معنا",
    retentionRate: "نسبة استبقاء المعلومة",
    summaryTime: "سرعة التلخيص",
    howItWorksTitle: "كيف تعمل المنصة",
    howItWorksSubtitle: "ثلاث خطوات مدروسة تضمن لك مذاكرة أسرع واستيعاباً أعمق",
    featuresTitle: "كل أدوات المذاكرة الذكية في مكان واحد",
    featuresSubtitle: "بيئة مذاكرة متكاملة مصممة للتركيز العالي بدون تشتيت بصري",

    // Save & Actions
    save: "حفظ",
    saving: "جاري الحفظ...",
    saved: "تم الحفظ",
    saveChanges: "حفظ التعديلات",
    discard: "تجاهل",
    cancel: "إلغاء",
    confirm: "تأكيد",
    delete: "حذف",
    edit: "تعديل",
    preview: "معاينة",
    revisions: "النسخ",
    publishQuiz: "اعتماد ونشر الكويز ✓",
    saveToDrive: "حفظ على Google Drive",
    exportPdf: "تصدير PDF",
  },
  en: {
    // Navigation & Layout
    learn: "Study & Summaries",
    community: "Arena & Community",
    account: "Account",
    tools: "Tools",
    courses: "My Lectures & Notes",
    myCourses: "My Courses & Lectures",
    loadingCourses: "Loading your courses and lectures...",
    noMatchingCourses: "No matching courses found",
    noMatchingDesc: "Try searching with a different keyword or reset the filters to view all lectures.",
    resetFilters: "Reset Filters",
    create: "Summarize Lecture",
    quizzes: "Smart Quizzes",
    review: "Smart Review Studio",
    friends: "Friends & Groups",
    groups: "Study Groups",
    challenge: "Leaderboard Arena",
    stats: "Study Analytics",
    profile: "Profile & Identity",
    subscriptions: "VIP Membership",
    pdf: "PDF Studio",
    settings: "Settings",
    admin: "Admin Console",
    search: "Search lectures and summaries...",
    summarize: "Summarize File",
    quickQuiz: "Quick Quiz",
    textQuiz: "Text Quiz (Universal Parser)",
    imageExtractor: "Image & Quiz Extractor",
    quizBank: "Quiz Bank",
    logout: "Log Out",
    studentDefault: "Elite Student",
    proBadge: "PRO",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",

    // Dashboard Hero & Metrics
    welcomeHero: "Welcome back,",
    dashSubtitle: "Drop your notes or lecture slides — get summaries, smart quizzes, and flashcards in seconds.",
    newSummaryBtn: "New Summary",
    imageQuizBtn: "Image Quiz Extractor",
    lecturesCount: "Lectures & Notes",
    lessonsCount: "Topics & Quizzes",
    xpPoints: "Total XP",
    streakDays: "Study Streak",
    creditsLabel: "Credits",
    myLecturesTitle: "My Study Materials",
    myLecturesSub: "Every upload is turned into a clean summary, interactive quiz, and revision cards.",
    searchLecturesPlaceholder: "Search your notes and lectures...",
    filterAll: "All",
    sortNewest: "Newest",
    sortTopRated: "Top Rated",
    noCoursesYet: "No study materials yet",
    noCoursesDesc: "Upload your first lecture or notes — get an interactive summary, quiz, and flashcards in seconds.",
    uploadFirstLecture: "Upload first file now",

    // Smart Daily Plan
    dailyFocusBadge: "Quick Daily Review",
    dailyFocusTitle: "Ready for a quick 5-min review?",
    dailyFocusDesc: "Due flashcards and practice questions ready to lock in what you studied and keep your streak going.",
    startFocusSession: "Start Quick Review (5 min)",
    closeSession: "Close Session",

    // Course Card
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: "days ago",
    chapter: "chapter",
    chapters: "chapters",
    quizBadge: "Quiz",
    summaryBadge: "Summary",
    flashcardsBadge: "Cards",
    defaultCourseDesc: "Structured lecture summary with smart quizzes and flashcards",

    // Landing Page
    landingHeroBadge: "Next-Gen Smart Study Platform",
    landingHeroTitle: "Transform Any Lecture or PDF into Smart Notes & Quizzes in Seconds",
    landingHeroSubtitle: "Upload your lecture — and let the platform build structured concept cards, comparison tables, exam trap alerts, and practice quizzes.",
    startBattleCTA: "Start Studying for Free",
    uploadNotesNowCTA: "Upload Your Notes Now",
    registeredFighters: "Active Students",
    retentionRate: "Retention Rate",
    summaryTime: "Summary Speed",
    howItWorksTitle: "How The Platform Works",
    howItWorksSubtitle: "Three streamlined steps for faster learning and higher retention",
    featuresTitle: "All Smart Study Tools in One Workspace",
    featuresSubtitle: "A distraction-free academic workspace built for deep focus",

    // Save & Actions
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    saveChanges: "Save Changes",
    discard: "Discard",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    preview: "Preview",
    revisions: "Revisions",
    publishQuiz: "Approve & Publish Quiz ✓",
    saveToDrive: "Save to Google Drive",
    exportPdf: "Export PDF",
  },
};

const LOCALE_STORAGE_KEY = "bf_locale_v2";

function syncHtmlLocale(lang) {
  if (typeof document === "undefined") return;
  const valid = lang === "ar" ? "ar" : "en";
  document.documentElement.lang = valid;
  document.documentElement.dir = valid === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.locale = valid;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "ar" || saved === "en") {
        syncHtmlLocale(saved);
        return saved;
      }
      localStorage.setItem(LOCALE_STORAGE_KEY, "en");
      localStorage.setItem("bf_locale", "en");
      localStorage.setItem("iiiak_locale", "en");
    } catch {}
    syncHtmlLocale("en");
    return "en";
  });
  const [isDual, setIsDual] = useState(() => localStorage.getItem("iiiak_dual_mode") === "true");

  const setLocale = (next) => {
    const valid = next === "ar" ? "ar" : "en";
    setLocaleState(valid);
    syncHtmlLocale(valid);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, valid);
      localStorage.setItem("bf_locale", valid);
      localStorage.setItem("iiiak_locale", valid);
    } catch {}
  };

  const toggleDual = () => {
    setIsDual((prev) => {
      const next = !prev;
      localStorage.setItem("iiiak_dual_mode", String(next));
      return next;
    });
  };

  useEffect(() => {
    syncHtmlLocale(locale);
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    isDual,
    dir: locale === "ar" ? "rtl" : "ltr",
    setLocale,
    toggleDual,
    t: (key, fallback) => {
      if (isDual) {
        const arText = MESSAGES.ar[key] || fallback || key;
        const enText = MESSAGES.en[key] || fallback || key;
        return arText === enText ? arText : `${arText} • ${enText}`;
      }
      return MESSAGES[locale]?.[key] || fallback || key;
    },
  }), [locale, isDual]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
