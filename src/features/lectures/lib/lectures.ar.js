/**
 * lectures.ar.js — every user-facing Arabic string in one file (Sections 16 & 17).
 *
 * No jargon in the UI (owner rule): the student reads what happens, not how.
 * Functions are used where a sentence needs a number inside it.
 */
export const LECTURE_STRINGS_AR = {
  nav: "تفريغ المحاضرات",
  navMyLectures: "محاضراتي",
  title: "تفريغ المحاضرات",
  subtitle: "ارفع تسجيل المحاضرة، وإحنا نحوّله نص منظم تقدر تذاكر منه.",

  // Section 17 Error & Notice Strings
  file_unsupported:
    "الصيغة دي مش مدعومة. الصيغ المدعومة: MP3, M4A, WAV, OGG, OPUS, WEBM, MP4, MOV, MKV",
  file_too_large: "حجم الملف أكبر من الحد المسموح (2 جيجا)",
  file_too_long: "مدة التسجيل أطول من الحد المسموح (4 ساعات)",
  file_corrupt: "الملف ده فيه مشكلة ومش قادرين نقراه. جرّب تحوّله لـ MP3 أو M4A",
  quota_credits: "رصيدك الحالي مش كافي لتفريغ المحاضرة دي",
  quota_daily: "وصلت للحد اليومي للتفريغ، تقدر تكمل بكرة",
  quota_storage: "وصلت للحد الأقصى للمحاضرات المحفوظة، امسح محاضرة قديمة عشان تضيف جديدة",
  active_job_exists: "عندك محاضرة بتتفرّغ حاليًا. استنى تخلص أو كمّلها",
  keep_tab_open_warning:
    "التفريغ شغال — سيب الصفحة دي مفتوحة لحد ما نخلّص الرفع. لو قفلتها هترجع تكمل من نفس النقطة",
  offline_paused: "الاتصال اتقطع — هنكمل تلقائي أول ما النت يرجع",
  online_resumed: "الاتصال رجع — بنكمّل التفريغ",
  chunk_retrying: "جاري إعادة المحاولة على مقطع صوتي...",
  chunk_failed_final: (from = "00:00", to = "00:00") =>
    `مقطع غير مفرّغ من ${from} إلى ${to} — تقدر تعيد المحاولة عليه لوحده`,
  all_chunks_failed: "حصلت مشكلة في خدمة التفريغ وماتفرّغتش المحاضرة. رصيدك رجع بالكامل",
  organize_fallback: "تم تفريغ النص بالكامل. التنظيم التلقائي اتعذر، تقدر تعيد المحاولة من فوق",
  service_busy: "الخدمة مشغولة حاليًا، دورك محفوظ وهنكمل خلال ثواني",
  service_degraded: "التفريغ شغال ببطء حاليًا، هنكمل تلقائي",
  cancel_confirm: "متأكد إنك عايز تلغي؟ الأجزاء اللي لسه مابدأتش هيرجع رصيدها",
  delete_confirm: "متأكد إنك عايز تمسح المحاضرة؟ مش هتقدر ترجعها",
  partial_ready: "تم التفريغ مع وجود مقاطع ناقصة — تقدر تعيد المحاولة عليها",
  print_hint_desktop: "في نافذة الطباعة اختر Save as PDF / حفظ بتنسيق PDF",
  print_hint_ios: "اضغط مشاركة ثم طباعة ثم اسحب بإصبعين لحفظ PDF",

  upload: {
    cta: "ارفع محاضرة",
    newLecture: "محاضرة جديدة",
    dropHere: "اسحب الملف هنا أو اضغط للاختيار",
    formats: "صوت أو فيديو — MP3 · M4A · WAV · MP4 · MOV",
    limits: "حد أقصى 4 ساعات · 2 جيجا",
    analyzing: "بنجهّز الملف…",
    planning: "بنحدد أفضل أماكن التقسيم…",
    starting: "بنبدأ الرفع…",
    titlePlaceholder: "اسم المحاضرة (مثال: تشريح الركبة — محاضرة 3)",
    subjectPlaceholder: "المادة (اختياري)",
    lecturerPlaceholder: "اسم الدكتور / المحاضر (اختياري)",
    glossaryPlaceholder: "مصطلحات طبية متوقعة (اختياري — افصل بينها بفاصلة)",
    confirm: "ابدأ التفريغ",
    cancel: "إلغاء",
  },

  plan: {
    heading: "الملف اتقرأ تمامًا",
    duration: (v) => `المدة: ${v}`,
    parts: (n) => `سيتم تقسيم المحاضرة إلى ${n} أجزاء عند وقفات الصوت الطبيعية لضمان عدم ضياع أي كلمة`,
    eta: (v) => `الوقت المتوقع للتفريغ: ${v}`,
    qualityNote: "بنقسّم عند أقرب لحظة سكوت عشان مانقطعش جملة في نصها.",
    cost: (n) => `التكلفة: ${n} كريدت`,
    sizeNote: (v) => `حجم الرفع: حوالي ${v}`,
  },

  progress: {
    heading: "بنجهّز المحاضرة",
    chunk: (done, total) => `خلصنا ${done} من ${total} جزء`,
    remaining: (v) => `فاضل حوالي ${v}`,
    queueNote: "المحرك بيشتغل على محاضرة واحدة في نفس الوقت عشان جودة التفريغ.",
    done: "التفريغ خلص — بننظّم المحتوى…",
    wait: "استنى شوية… بنشتغل على المحاضرة",
    stages: {
      prepare: "تحليل وتجهيز الصوت",
      upload: "تقطيع ورفع المقاطع",
      transcribe: "تفريغ الكلام حرفيًا",
      merge: "دمج المقاطع وتقسيم الجمل",
      organize: "تنظيم العناوين والمصطلحات",
    },
  },

  status: {
    draft: "جاهزة للبدء",
    queued: "في الطابور",
    preparing_audio: "جاري تجهيز الصوت",
    uploading_chunks: "جاري رفع الأجزاء",
    transcribing: "قيد التفريغ",
    merging: "جاري الدمج",
    organizing: "جاري التنظيم",
    ready: "جاهزة",
    partial_ready: "جاهزة جزئيًا",
    failed: "فشلت",
    cancelled: "ملغاة",
  },

  viewer: {
    transcriptTab: "النص الكامل",
    organizedTab: "منظّم",
    studyTab: "مذاكرة",
    summaryTab: "الخلاصة",
    exportTab: "تصدير",
    originalTab: "الأصل",
    sections: "فهرس المحاضرة",
    glossary: "قاموس المصطلحات",
    noise: "كلام جانبي",
    noiseHint: "كلام مش داخل في الدرس — افتحه لو عايز",
    gaps: "فيه جزء مش سمعناه",
    gapHint: "الجزء ده من المحاضرة ماسمعناهوش — جرّب ترفعه تاني.",
    questions: "أسئلة مراجعة",
    showAnswer: "اعرض الإجابة",
    hideAnswer: "اخفي الإجابة",
    noTranscriptYet: "لسه مفيش نص — المحاضرة بتتفّرغ.",
    sentences: (n) => `${n} جملة`,
    words: (n) => `${n} كلمة`,
    quickReview: "مراجعة سريعة",
    generateStudyNotes: "توليد شرح مبسّط",
    fromLecturer: "من كلام الدكتور",
    addedClarification: "توضيح إضافي",
  },

  actions: {
    pdf: "تحميل PDF",
    html: "تحميل HTML",
    restyle: "تحسين الشكل للمذاكرة",
    summary: "استخراج الخلاصة",
    quiz: "اختبر نفسك في المحاضرة",
    flashcards: "بطاقات مراجعة",
    retry: "إعادة المحاولة",
    delete: "حذف المحاضرة",
    restyleHint: "بنرتّب النص لشكل أسهل للمذاكرة",
    summaryHint: "بنطلع خلاصة من كلام المحاضرة بس",
    requiresCredits: (n) => `هتكلفك ${n} كريدت`,
    working: "بيشتغل…",
  },

  empty: {
    title: "لسه مفيش محاضرات",
    body: "ارفع أول محاضرة وهتطلع منها نص منظم تقدر تذاكر منه وتصدّره PDF أو HTML.",
  },

  errors: {
    AUDIO_TOO_LONG: "مدة التسجيل أطول من الحد المسموح (4 ساعات)",
    AUDIO_TOO_LARGE: "حجم الملف أكبر من الحد المسموح (2 جيجا)",
    UNSUPPORTED_FILE:
      "الصيغة دي مش مدعومة. الصيغ المدعومة: MP3, M4A, WAV, OGG, OPUS, WEBM, MP4, MOV, MKV",
    DECODE_FAILED: "الملف ده فيه مشكلة ومش قادرين نقراه. جرّب تحوّله لـ MP3 أو M4A",
    EMPTY_TRANSCRIPT: "الموديل مرجّعش نص — جرّب تاني.",
    RATE_LIMITED: "الخدمة مشغولة حاليًا، دورك محفوظ وهنكمل خلال ثواني",
    NETWORK: "الاتصال اتقطع — هنكمل تلقائي أول ما النت يرجع",
    UNAUTHORIZED: "لازم تسجل دخول الأول.",
    INSUFFICIENT_CREDITS: "رصيدك الحالي مش كافي لتفريغ المحاضرة دي",
    DEEPSEEK_KEY_MISSING: "خدمة تحسين الشكل مش متاحة دلوقتي.",
    NOT_FOUND: "المحاضرة مش موجودة.",
    GENERIC: "حصلت مشكلة — جرّب تاني.",
  },

  export: {
    printHint: "في نافذة الطباعة اختر Save as PDF / حفظ بتنسيق PDF",
    printHintIos: "اضغط مشاركة ثم طباعة ثم اسحب بإصبعين لحفظ PDF",
    htmlReady: "الملف جاهز — اتفتح في تبويب جديد.",
    generatedBanner: "الجزء ده متولّد بالـ AI من كلام المحاضرة",
    sourceNote: "المصدر: محاضرة مرفوعة في Black Fighters",
    footerNote: "اتعمل بمنصة Black Fighters",
  },
};

export default LECTURE_STRINGS_AR;
