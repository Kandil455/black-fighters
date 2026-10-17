export const SUBJECT_TYPES = [
  { value: "auto", label: "اختيار ذكي تلقائي", desc: "Black Fighters يحدد نوع المادة من المحتوى", prompt: "حلل طبيعة المادة الأكاديمية تلقائياً (طبية، هندسية، قانونية، علمية، أو إنسانية) واضبط المصطلحات والمنهجية وهيكل الشرح بما يناسب المعايير الجامعية للمادة." },
  { value: "medical", label: "طب وعلوم صحية", desc: "تعريفات، أعراض، تشخيص وعلاج", prompt: "المادة طبية وسريرية: افصل بدقة بين التعريف، الفسيولوجيا المرضية (Pathophysiology/Mechanism)، الأعراض والعلامات السريرية، الفحوصات والتشخيص التفريقي (Differential Diagnosis)، خطوط العلاج والجرعات المدققة، والتحذيرات السريرية (Red Flags & Contraindications)." },
  { value: "engineering", label: "هندسة وعلوم", desc: "قوانين، وحدات، اشتقاقات وأمثلة", prompt: "المادة علمية أو هندسية: حافظ بدقة صارمة على الصيغ الرياضية والقوانين، مدلول كل متغير ووحدة قياسه (SI Units)، شروط تطبيق القانون، خطوات الاشتقاق أو العمل، والأمثلة التطبيقية المحلولة." },
  { value: "law", label: "قانون وتشريعات", desc: "مواد، شروط، استثناءات وأحكام", prompt: "المادة قانونية وتشريعية: رتب القواعد القانونية، أركانها، شروط الانعقاد أو الصحة، الاستثناءات الواردة عليها، الآثار القانونية المترتبة، وأحكام النقض أو الأمثلة القضائية." },
  { value: "humanities", label: "تاريخ وأدب", desc: "تسلسل زمني، شخصيات وأفكار", prompt: "المادة إنسانية أو تاريخية: أبرز التسلسل الزمني للأحداث، التواريخ المحورية، الشخصيات والمدارس الفكرية، عوامل قيام الأحداث (الأسباب المباشرة وغير المباشرة)، والنتائج والآثار." },
  { value: "business", label: "إدارة وأعمال", desc: "نماذج، قرارات ومؤشرات", prompt: "المادة إدارية أو مالية: استخرج الأطر والنماذج الإدارية، خطوات اتخاذ القرار، مؤشرات الأداء الرئيسية (KPIs)، المعادلات المالية، والمقارنات والحالات العملية." },
  { value: "languages", label: "لغات", desc: "قواعد، مفردات وأمثلة", prompt: "المادة لغوية: افصل القاعدة النحوية أو الصرفية، صيغ الاستخدام، المفردات المتقدمة، الشواذ والاستثناءات الامتحانية، والأمثلة المترجمة." },
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
    prompt: "اشرح من الأساس بمنهجية الأطلس V5: ابدأ كل قسم بتمهيد تأسيسي («قبل ما تقرا») يشرح الفكرة المسبقة من الصفر بلغة سلسة، ثم اعرض اللوحة العلمية بالعربية مع تثبيت المصطلحات الإنجليزية وفق القاموس الموحد، مع إبراز الآليات الفسيولوجية/العلمية وتحديد المصطلحات الحرجة لفك التعتيم (Declassify).",
  },
  {
    value: "atlas_cram",
    label: "⚡ برشامة ليلة الامتحان (الأطلس Cram)",
    desc: "أعلى النقاط الامتحانية كثافة، جداول مقارنة، وتحذيرات الجرعات والأرقام المدققة",
    descEn: "High-density exam night cram sheet with cross-family verified numbers, dosages, and comparisons",
    preview: "revision",
    prompt: "برشامة ليلة الامتحان فائقة الكثافة (High-Yield Cram): استخرج كافة التعريفات الحاسمة، الجرعات والأرقام والقيم المرجعية المدققة حرفياً، جداول الفروقات السريعة، والاستثناءات ومواضع خدع الامتحانات (Exam Traps) بأعلى تركيز ممكن.",
  },
  {
    value: "ultra_multi_agent",
    label: "👑 مِسطرة المذكرات (Ultra 5-Agent)",
    desc: "أقوى مذكرة جامعية بنظام 5 وكلاء ذكاء اصطناعي: نقاط إنجليزية، شرح عربي بنقاط، صناديق ذهبية وشيت غش",
    descEn: "Ultra 5-Agent Academic Study Notes with clinical boxes, golden rules, pearls, and cheat sheet",
    preview: "lecture",
    prompt: "نظام مِسطرة المذكرات الفائق (Ultra 5-Agent): اعرض النقاط العلمية الإنجليزية الدقيقة متبوعة بشرح عربي تفصيلي عميق بنقاط منظمة، مع صناديق القواعد الذهبية، تنبيهات فخاخ الامتحان، وجداول المقارنة وشيت مراجعة ختامي.",
  },
  {
    value: "bilingual_lecture",
    label: "Bilingual Lecture",
    desc: "English study points followed by detailed Arabic explanation",
    descEn: "English study points followed by structured bilingual explanations",
    preview: "lecture",
    prompt: "اعرض نقاط المذاكرة الأساسية بالإنجليزية الأكاديمية الدقيقة، ثم اشرح تحت كل نقطة المعنى والآلية والأهمية بالعربية الفصحى المبسطة مع ربط المصطلحات ببعضها.",
  },
  {
    value: "complete_study_guide",
    label: "Complete Study Guide",
    desc: "شرح شامل وتعريفات وأمثلة مرتبة",
    descEn: "Comprehensive study notes, definitions, and categorized examples",
    preview: "guide",
    prompt: "أنشئ دليلاً دراسياً شاملاً ومتكاملاً يغطي كل الحقائق العلمية والتعريفات والآليات والأمثلة والقوانين والاستثناءات الواردة في المصدر بتسلسل منطقي محكم.",
  },
  {
    value: "exam_revision_sheet",
    label: "Exam Revision Sheet",
    desc: "مراجعة مركزة للامتحان والأخطاء الشائعة",
    descEn: "High-yield exam review, common traps, and key formulas",
    preview: "revision",
    prompt: "رتب أهم النقاط الامتحانية، التعريفات الحرجة، القوانين، الأرقام القياسية، والاستثناءات الشائعة في ورقة مراجعة مركزة سريعة الاسترجاع.",
  },
  {
    value: "comparison_classification",
    label: "Comparison & Classification",
    desc: "جداول مقارنة وتصنيفات واضحة",
    descEn: "Structured comparison tables, taxonomies, and clear differentials",
    preview: "table",
    prompt: "حوّل جميع المقارنات والتصنيفات والأنواع والفروقات التشخيصية أو العلمية إلى جداول مقارنة منظمة وموثقة بالكامل من المصدر.",
  },
  {
    value: "qa_tutor",
    label: "Q&A Tutor",
    desc: "سؤال وجواب للمراجعة والفهم",
    descEn: "Question-and-answer pairs for active recall and self-testing",
    preview: "qa",
    prompt: "حوّل جميع المفاهيم والحقائق العلمية في المصدر إلى سلسلة أسئلة وأجوبة نموذجية (Active Recall Q&A) تغطي الفهم العميق والتفاصيل الدقيقة بدون إضافة معلومات خارج المصدر.",
  },
  {
    value: "visual_concepts_formulas",
    label: "Visual Concepts & Formulas",
    desc: "معادلات وعلاقات وخرائط مفاهيم",
    descEn: "Mathematical formulas, concept maps, and visual diagrams",
    preview: "map",
    prompt: "اعرض القوانين والمعادلات والمسارات والآليات المتسلسلة ككتل بصرية منظمة وخرائط مفاهيم مترابطة توضح المدخلات والخطوات والنتائج.",
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
