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

export const SUMMARY_SIZE_TIERS = [
  {
    id: "small",
    templateId: "atlas_cram",
    labelAr: "تلخيص صغير",
    labelEn: "Small Summary",
    coverageRange: "70% – 80%",
    minCoverage: 70,
    maxCoverage: 80,
    targetCoverageScore: 76,
    pageMultiplier: 0.65,
    chunkScale: 1.0,
    badgeAr: "تغطية 70% – 80% ⚡",
    badgeEn: "70% – 80% Coverage ⚡",
    descAr: "يركّز على كل المهم في المحاضرة: يستخرج جميع الفيتشرز، التعريفات، القوانين، الأرقام، والنقاط الامتحانية بنسبة 70% إلى 80% بدون اختصار مخل.",
    descEn: "Extracts all essential features, definitions, formulas, numbers, and high-yield points with 70%–80% lecture coverage.",
  },
  {
    id: "medium",
    templateId: "foundational_bilingual",
    labelAr: "تلخيص متوسط",
    labelEn: "Medium Summary",
    coverageRange: "80% – 95%",
    minCoverage: 80,
    maxCoverage: 95,
    targetCoverageScore: 86,
    pageMultiplier: 0.9,
    chunkScale: 0.8,
    badgeAr: "تغطية 80% – 95% ✨",
    badgeEn: "80% – 95% Coverage ✨",
    descAr: "تغطية متوازنة ومفصلة من 80% إلى 95%: يشرح جميع محاور المحاضرة، الآليات، الخصائص (Features)، الأمثلة، والمقارنات بتنظيم واضح.",
    descEn: "Balanced 80%–95% coverage explaining all concepts, mechanisms, features, examples, and comparisons in depth.",
  },
  {
    id: "large",
    templateId: "complete_study_guide",
    labelAr: "تلخيص كبير",
    labelEn: "Large Summary",
    coverageRange: "95% – 99%",
    minCoverage: 95,
    maxCoverage: 99,
    targetCoverageScore: 95,
    pageMultiplier: 1.25,
    chunkScale: 0.6,
    badgeAr: "تغطية 95% – 99% 👑",
    badgeEn: "95% – 99% Coverage 👑",
    descAr: "يغطي المحاضرة بالكامل تقريباً (95% إلى 99%) بطريقة منظمة ومرتبة في أبواب ونقاط وجداول مقارنة دون ترك أي تفصيلة صغيرة أو كبيرة.",
    descEn: "Covers 95%–99% of the entire lecture in a structured hierarchy of headings, bullet points, and tables without omitting any detail.",
  },
];

export function getSummarySizeTier(value) {
  const key = String(value || "").toLowerCase();
  if (key === "small" || key === "summary_small" || key === "atlas_cram" || key === "exam_revision_sheet") {
    return SUMMARY_SIZE_TIERS[0];
  }
  if (key === "large" || key === "summary_large" || key === "complete_study_guide" || key === "lecture_exact" || key === "complete") {
    return SUMMARY_SIZE_TIERS[2];
  }
  return SUMMARY_SIZE_TIERS[1];
}

export const SUMMARY_TEMPLATES = [
  {
    value: "foundational_bilingual",
    sizeTier: "medium",
    coverageRange: "80% – 95%",
    label: "✨ تلخيص متوسط (تغطية 80% – 95%)",
    desc: "يغطي من 80% إلى 95% من المحاضرة: يشرح جميع المحاور، الآليات، الخصائص (Features)، والتعريفات بتسلسل منظم وواضح",
    descEn: "Medium Summary (80%–95% Coverage): Explains all lecture concepts, mechanisms, features, and definitions in a structured flow",
    preview: "lecture",
    prompt: "تلخيص متوسط شامل ومنظم (نسبة تغطية إلزامية 80% إلى 95% من محتوى المحاضرة): اشرح جميع المحاور والأفكار الرئيسية والفرعية بتسلسل واضح. استخرج كافة الخصائص (Features/Characteristics)، الآليات الفسيولوجية أو العلمية خطوة بخطوة، التعريفات، الأرقام، والأمثلة. ممنوع تماماً اختزال الفقرات الغنية بالتفاصيل في جملة عابرة.",
  },
  {
    value: "atlas_cram",
    sizeTier: "small",
    coverageRange: "70% – 80%",
    label: "⚡ تلخيص صغير مركّز (تغطية 70% – 80%)",
    desc: "يستخرج كل المهم في المحاضرة بنسبة 70% إلى 80%: جميع الفيتشرز، التعريفات، القوانين، الأرقام، وجداول الفروقات بدون حشو",
    descEn: "Small High-Yield Summary (70%–80% Coverage): Captures every important feature, definition, formula, number, and comparison",
    preview: "revision",
    prompt: "تلخيص صغير مركّز وعالي الكثافة (نسبة تغطية إلزامية 70% إلى 80% من محتوى المحاضرة): اجمع كل ما هو مهم في المحاضرة بالكامل. حتى لو كانت المحاضرة قصيرة ومليئة بالخصائص (Features) أو النقاط، يجب ذكر جميع الخصائص والتعريفات الحاسمة والأرقام والقوانين والاستثناءات ومواضع الامتحانات في نقاط منظمة ومركزة دون إسقاط أي خاصية أو محور.",
  },
  {
    value: "ultra_multi_agent",
    sizeTier: "large",
    coverageRange: "95% – 99%",
    label: "👑 مِسطرة المذكرات (Ultra 5-Agent)",
    desc: "مذكرة جامعية شاملة بنقاط إنجليزية وشرح عربي تفصيلي بنقاط منظمة وجداول مقارنة",
    descEn: "Ultra 5-Agent Academic Study Notes with clinical boxes, golden rules, pearls, and cheat sheet",
    preview: "lecture",
    prompt: "نظام مِسطرة المذكرات الفائق (Ultra 5-Agent): اعرض النقاط العلمية الإنجليزية الدقيقة متبوعة بشرح عربي تفصيلي عميق بنقاط منظمة، مع صناديق القواعد الذهبية، تنبيهات فخاخ الامتحان، وجداول المقارنة وشيت مراجعة ختامي يغطي 95%–99% من المصدر.",
  },
  {
    value: "bilingual_lecture",
    sizeTier: "medium",
    coverageRange: "80% – 95%",
    label: "Bilingual Lecture",
    desc: "English study points followed by detailed Arabic explanation",
    descEn: "English study points followed by structured bilingual explanations",
    preview: "lecture",
    prompt: "اعرض نقاط المذاكرة الأساسية بالإنجليزية الأكاديمية الدقيقة، ثم اشرح تحت كل نقطة المعنى والآلية وجميع الخصائص (Features) والأهمية بالعربية الفصحى المبسطة بنسبة تغطية 85%–95%.",
  },
  {
    value: "complete_study_guide",
    sizeTier: "large",
    coverageRange: "95% – 99%",
    label: "👑 تلخيص كبير شامل (تغطية 95% – 99%)",
    desc: "يجيب المحاضرة بنسبة 95% إلى 99% بطريقة منظمة في أبواب ونقاط وجداول مقارنة بدون ترك أي تفصيلة صغيرة أو كبيرة",
    descEn: "Large Comprehensive Summary (95%–99% Coverage): Captures virtually the entire lecture in organized chapters, bullet lists, and tables",
    preview: "guide",
    prompt: "تلخيص كبير شامل ومفصل لأقصى درجة (نسبة تغطية إلزامية 95% إلى 99% من محتوى المحاضرة): أعد تقديم المحاضرة بالكامل تقريباً بطريقة منظمة ومرتبة أكاديمياً. ممنوع حذف أو تجاهل أي فقرة، خاصية (Feature)، تفصيلة فرعية، تعريف، آلية، قانون، رقم، استثناء، أو مثال وارد في النص الأصلي. قسّم المحتوى إلى أبواب وعناوين واضحة، نقاط تفصيلية كاملة، وجداول مقارنة لكل التصنيفات والفروقات بحيث يغني هذا الملخص عن المصدر بنسبة 99%.",
  },
  {
    value: "exam_revision_sheet",
    sizeTier: "small",
    coverageRange: "70% – 80%",
    label: "Exam Revision Sheet",
    desc: "مراجعة مركزة للامتحان والأخطاء الشائعة",
    descEn: "High-yield exam review, common traps, and key formulas",
    preview: "revision",
    prompt: "رتب جميع النقاط الامتحانية، الخصائص (Features)، التعريفات الحرجة، القوانين، الأرقام القياسية، والاستثناءات الشائعة في ورقة مراجعة مركزة تغطي 70%–80% من المحاضرة.",
  },
  {
    value: "comparison_classification",
    sizeTier: "medium",
    coverageRange: "80% – 95%",
    label: "Comparison & Classification",
    desc: "جداول مقارنة وتصنيفات واضحة",
    descEn: "Structured comparison tables, taxonomies, and clear differentials",
    preview: "table",
    prompt: "حوّل جميع المقارنات والتصنيفات والأنواع والخصائص (Features) والفروقات التشخيصية أو العلمية إلى جداول مقارنة منظمة وموثقة بالكامل من المصدر.",
  },
  {
    value: "qa_tutor",
    sizeTier: "medium",
    coverageRange: "80% – 95%",
    label: "Q&A Tutor",
    desc: "سؤال وجواب للمراجعة والفهم",
    descEn: "Question-and-answer pairs for active recall and self-testing",
    preview: "qa",
    prompt: "حوّل جميع المفاهيم والخصائص والحقائق العلمية في المصدر إلى سلسلة أسئلة وأجوبة نموذجية (Active Recall Q&A) تغطي الفهم العميق والتفاصيل الدقيقة بدون إضافة معلومات خارج المصدر.",
  },
  {
    value: "visual_concepts_formulas",
    sizeTier: "medium",
    coverageRange: "80% – 95%",
    label: "Visual Concepts & Formulas",
    desc: "معادلات وعلاقات وخرائط مفاهيم",
    descEn: "Mathematical formulas, concept maps, and visual diagrams",
    preview: "map",
    prompt: "اعرض القوانين والمعادلات والمسارات والآليات المتسلسلة ككتل بصرية منظمة وخرائط مفاهيم مترابطة توضح المدخلات والخطوات والنتائج.",
  },
];

export function getSummaryTemplate(value) {
  const aliases = {
    small: "atlas_cram",
    summary_small: "atlas_cram",
    medium: "foundational_bilingual",
    summary_medium: "foundational_bilingual",
    large: "complete_study_guide",
    summary_large: "complete_study_guide",
    atlas_foundational: "foundational_bilingual",
    foundational: "foundational_bilingual",
    standard: "foundational_bilingual",
    detailed: "complete_study_guide",
    condensed: "atlas_cram",
    exam_capsules: "atlas_cram",
    cram_sheet: "atlas_cram",
    comparisons: "comparison_classification",
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
