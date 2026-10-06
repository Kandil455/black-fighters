export const SUBJECT_TYPES = [
  { value: "auto", label: "اختيار ذكي تلقائي", desc: "Black Fighters يحدد نوع المادة من المحتوى", prompt: "حدد نوع المادة تلقائياً واضبط المصطلحات والتنظيم بما يناسبها." },
  { value: "medical", label: "طب وعلوم صحية", desc: "تعريفات، أعراض، تشخيص وعلاج", prompt: "المادة طبية: افصل التعريفات والآليات والأعراض والتشخيص والعلاج والتحذيرات السريرية." },
  { value: "engineering", label: "هندسة وعلوم", desc: "قوانين، وحدات، اشتقاقات وأمثلة", prompt: "المادة علمية أو هندسية: حافظ على القوانين والوحدات والاشتقاقات والأمثلة المحلولة." },
  { value: "law", label: "قانون وتشريعات", desc: "مواد، شروط، استثناءات وأحكام", prompt: "المادة قانونية: رتب المواد والشروط والأركان والاستثناءات والآثار والأمثلة القضائية." },
  { value: "humanities", label: "تاريخ وأدب", desc: "تسلسل زمني، شخصيات وأفكار", prompt: "المادة إنسانية: أبرز التسلسل الزمني والشخصيات والأسباب والنتائج والأفكار والمدارس." },
  { value: "business", label: "إدارة وأعمال", desc: "نماذج، قرارات ومؤشرات", prompt: "المادة إدارية: استخرج النماذج والخطوات والمؤشرات والمقارنات والأمثلة التطبيقية." },
  { value: "languages", label: "لغات", desc: "قواعد، مفردات وأمثلة", prompt: "المادة لغوية: افصل القاعدة والمفردات والاستثناءات والأمثلة والترجمة عند الحاجة." },
];

export const COLOR_LEVELS = [
  { value: "none", label: "بدون تلوين", desc: "عناوين وBold فقط" },
  { value: "medium", label: "تلوين متوسط", desc: "1-4 Highlights قصيرة حسب طول القسم" },
  { value: "rich", label: "تلوين مكثف", desc: "ألوان أكثر للتعريفات والأمثلة والتحذيرات" },
];

export const SUMMARY_TEMPLATES = [
  {
    value: "foundational_bilingual",
    label: "🧭 شرح من الأساس (الأطلس V5)",
    desc: "يبدأ كل قسم بصندوق «قبل ما تقرا» التأسيسي مع قاموس مصطلحات موحد وأشرطة فك التعتيم (Declassify)",
    descEn: "Foundational Bilingual Atlas Plates starting each section with a prerequisite bridge, unified glossary, and Declassify recall bars",
    preview: "lecture",
    prompt: "اشرح من الأساس: ابدأ كل قسم بصندوق «قبل ما تقرا» يمهد للمفهوم من الصفر، ثم اعرض اللوحة العلمية بالعربية مع تثبيت المصطلحات الإنجليزية وفق القاموس الموحد وتحديد المصطلحات الحرجة لفك التعتيم.",
  },
  {
    value: "atlas_cram",
    label: "⚡ برشامة ليلة الامتحان (الأطلس Cram)",
    desc: "أعلى النقاط الامتحانية كثافة، جداول مقارنة، وتحذيرات الجرعات والأرقام المدققة",
    descEn: "High-density exam night cram sheet with cross-family verified numbers, dosages, and comparisons",
    preview: "revision",
    prompt: "برشامة ليلة الامتحان: استخرج فقط التعريفات الحاسمة، الجرعات والأرقام المدققة، الفروقات الجدولية، ومواضع الأسئلة المتكررة بكثافة قصوى.",
  },
  {
    value: "ultra_multi_agent",
    label: "👑 مِسطرة المذكرات (Ultra 5-Agent)",
    desc: "أقوى مذكرة جامعية بنظام 5 وكلاء ذكاء اصطناعي: نقاط إنجليزية، شرح عربي بنقاط، صناديق ذهبية وشيت غش",
    descEn: "Ultra 5-Agent Academic Study Notes with clinical boxes, golden rules, pearls, and cheat sheet",
    preview: "lecture",
    prompt: "نظام مِسطرة المذكرات الفائق: نقاط إنجليزية يساراً، شرح عربي تفصيلي بنقاط منظمة، صناديق تحذير وقواعد وشيت غش ختامي.",
  },
  {
    value: "bilingual_lecture",
    label: "Bilingual Lecture",
    desc: "English study points followed by detailed Arabic explanation",
    descEn: "English study points followed by structured bilingual explanations",
    preview: "lecture",
    prompt: "استخرج نقاط المذاكرة بالإنجليزية ثم اشرح كل قسم مباشرة بالعربية الفصحى المبسطة.",
  },
  {
    value: "complete_study_guide",
    label: "Complete Study Guide",
    desc: "شرح شامل وتعريفات وأمثلة مرتبة",
    descEn: "Comprehensive study notes, definitions, and categorized examples",
    preview: "guide",
    prompt: "أنشئ دليلاً شاملاً يغطي الحقائق والتعريفات والأمثلة والقوانين بترتيب منطقي.",
  },
  {
    value: "exam_revision_sheet",
    label: "Exam Revision Sheet",
    desc: "مراجعة مركزة للامتحان والأخطاء الشائعة",
    descEn: "High-yield exam review, common traps, and key formulas",
    preview: "revision",
    prompt: "رتب أهم النقاط والقوانين والاستثناءات في ورقة مراجعة قصيرة قابلة للحفظ.",
  },
  {
    value: "comparison_classification",
    label: "Comparison & Classification",
    desc: "جداول مقارنة وتصنيفات واضحة",
    descEn: "Structured comparison tables, taxonomies, and clear differentials",
    preview: "table",
    prompt: "حوّل المقارنات والأنواع والاختلافات إلى جداول موثقة من المصدر.",
  },
  {
    value: "qa_tutor",
    label: "Q&A Tutor",
    desc: "سؤال وجواب للمراجعة والفهم",
    descEn: "Question-and-answer pairs for active recall and self-testing",
    preview: "qa",
    prompt: "حوّل الحقائق إلى أزواج سؤال وجواب بدون إضافة معلومة خارج المصدر.",
  },
  {
    value: "visual_concepts_formulas",
    label: "Visual Concepts & Formulas",
    desc: "معادلات وعلاقات وخرائط مفاهيم",
    descEn: "Mathematical formulas, concept maps, and visual diagrams",
    preview: "map",
    prompt: "اعرض القوانين والمعادلات والعلاقات ككتل بصرية وخرائط مفاهيم منظمة.",
  },
];

export function getSummaryTemplate(value) {
  const aliases = {
    atlas_foundational: "foundational_bilingual",
    foundational: "foundational_bilingual",
    cram_sheet: "atlas_cram",
    lecture_exact: "complete_study_guide", complete: "complete_study_guide", organized_original: "complete_study_guide", format_only: "complete_study_guide", simple_overview: "complete_study_guide",
    revision_sheet: "exam_revision_sheet", key_points: "exam_revision_sheet", compact: "exam_revision_sheet",
    comparison_tables: "comparison_classification", qa_notes: "qa_tutor",
    equations_only: "visual_concepts_formulas", concept_map: "visual_concepts_formulas", timeline: "visual_concepts_formulas",
    bilingual_blocks: "bilingual_lecture",
  };
  const canonical = aliases[value] || value;
  const template = SUMMARY_TEMPLATES.find((item) => item.value === canonical);
  if (!template) throw new Error(`UNKNOWN_SUMMARY_TEMPLATE:${String(value || "")}`);
  return template;
}

export function getSubjectType(value) {
  return SUBJECT_TYPES.find((item) => item.value === value) || SUBJECT_TYPES[0];
}
