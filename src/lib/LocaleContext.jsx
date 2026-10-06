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
    dailyFocusBadge: "مراجعة اليوم السريعة ⚡",
    dailyFocusTitle: "مراجعة سريعة قبل ما تبدأ 🎯",
    dailyFocusDesc: "مجهزين لك كروت مراجعة مستحقة وأسئلة سريعة لتثبيت المعلومة ومواصلة الستريك.",
    startFocusSession: "ابدأ المراجعة (5 دقائق) ⚡",
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
    defaultCourseDesc: "ملخص محاضرة دراسية",

    // Landing Page
    landingHeroBadge: "الجيل الجديد من منصات المذاكرة الذكية",
    landingHeroTitle: "حوّل أي محاضرة أو PDF لكورس تفاعلي بضغطة زر ⚡",
    landingHeroSubtitle: "ارفع مذكرتك — وخلي النظام يحوّلها لملخص، كويز، وبطاقات مراجعة. أنت بس ذاكر، والباقي علينا.",
    startBattleCTA: "ابدأ المذاكرة مجاناً",
    uploadNotesNowCTA: "ارفع مذكرتك دلوقتي",
    registeredFighters: "طالب بيذاكر معانا",
    retentionRate: "نسبة الفهم الفعلي",
    summaryTime: "سرعة التلخيص",
    howItWorksTitle: "إزاي المنصة بتشتغل",
    howItWorksSubtitle: "ثلاث خطوات بسيطة تضمنلك مذاكرة أسرع وفهم أعلى",
    featuresTitle: "كل الأدوات اللي هتحتاجها في مكان واحد",
    featuresSubtitle: "كل اللي يلزمك لمذاكرة ذكية بدون تشتيت أو تعقيد",

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
    dailyFocusBadge: "Quick Daily Review ⚡",
    dailyFocusTitle: "Ready for a quick 5-min review? 🎯",
    dailyFocusDesc: "Due flashcards and practice questions ready to lock in what you studied and keep your streak going.",
    startFocusSession: "Start Quick Review (5 min) ⚡",
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
    defaultCourseDesc: "Interactive Lecture Summary",

    // Landing Page
    landingHeroBadge: "Next-Gen Smart Study Platform",
    landingHeroTitle: "Transform Any Lecture or PDF into an Interactive Course ⚡",
    landingHeroSubtitle: "Upload your notes — and let the system generate summaries, quizzes, and spaced repetition cards. You just study.",
    startBattleCTA: "Start Studying for Free",
    uploadNotesNowCTA: "Upload Your Notes Now",
    registeredFighters: "Active Students",
    retentionRate: "Actual Retention",
    summaryTime: "Summary Speed",
    howItWorksTitle: "How The Platform Works",
    howItWorksSubtitle: "Three simple steps to faster learning and higher retention",
    featuresTitle: "All The Tools You Need in One Place",
    featuresSubtitle: "Everything you need for distraction-free, intelligent studying",

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

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => localStorage.getItem("iiiak_locale") || "ar");
  const [isDual, setIsDual] = useState(() => localStorage.getItem("iiiak_dual_mode") === "true");

  const setLocale = (next) => {
    const valid = next === "en" ? "en" : "ar";
    setLocaleState(valid);
    localStorage.setItem("iiiak_locale", valid);
  };

  const toggleDual = () => {
    setIsDual((prev) => {
      const next = !prev;
      localStorage.setItem("iiiak_dual_mode", String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
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
