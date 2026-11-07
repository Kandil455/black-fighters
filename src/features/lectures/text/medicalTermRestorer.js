/**
 * src/features/lectures/text/medicalTermRestorer.js
 *
 * Restores Arabic-transliterated medical terms into proper English medical terminology
 * and extracts a rich bilingual medical lexicon (Term -> English + Arabic explanation)
 * so every lecture has a complete medical dictionary and bilingual study notes.
 */

export const MEDICAL_PHONETIC_DICTIONARY = [
  // Cardiology & Hemodynamics
  { arPattern: /ال?برونكودايليتورز?|برونكو\s*دايليتور/gi, en: "Bronchodilator", arDef: "موسّع للشعب الهوائية يعمل على إرخاء العضلات الملساء في القصبات لتسهيل التنفس" },
  { arPattern: /ال?فازودايليتورز?|فازو\s*دايليتور/gi, en: "Vasodilator", arDef: "موسّع للأوعية الدموية يقلل المقاومة الوعائية الطرفية ويخفض ضغط الدم" },
  { arPattern: /ال?فازوكونستركشن|فازو\s*كونستركشن/gi, en: "Vasoconstriction", arDef: "انقباض وتضيق الأوعية الدموية مما يرفع ضغط الدم والمقاومة الطرفية" },
  { arPattern: /ال?تاكيكارديا|تاكي\s*كارديا/gi, en: "Tachycardia", arDef: "تسارع ضربات القلب لأكثر من 100 نبضة في الدقيقة في وقت الراحة" },
  { arPattern: /ال?براديكارديا|برادي\s*كارديا/gi, en: "Bradycardia", arDef: "تباطؤ ضربات القلب لأقل من 60 نبضة في الدقيقة" },
  { arPattern: /ال?أريزميا|ال?اريزميا/gi, en: "Arrhythmia", arDef: "اضطراب في نظم وكهرباء القلب يؤدي لعدم انتظام ضرباته" },
  { arPattern: /ال?هايبوتنشن|هايبو\s*تنشن/gi, en: "Hypotension", arDef: "انخفاض ضغط الدم الشرياني عن المعدل الطبيعي (أقل من 90/60 مم زئبق)" },
  { arPattern: /ال?هايبرتنشن|هايبر\s*تنشن/gi, en: "Hypertension", arDef: "ارتفاع ضغط الدم الشرياني المزمن عن 130/80 مم زئبق" },
  { arPattern: /ال?إقفار|ال?اسكيميا|إسكيميا/gi, en: "Ischemia", arDef: "نقص التروية الدموية والأكسجين الواصل لنسيج أو عضو معين" },
  { arPattern: /ال?إنفاركشن|انفاركشن/gi, en: "Infarction", arDef: "احتشاء وموت النسيج نتيجة انقطاع الإمداد الدموي عنه تماماً" },
  { arPattern: /ال?أنجاينا|انجاينا/gi, en: "Angina Pectoris", arDef: "الذبحة الصدرية الناتجة عن نقص تروية عضلة القلب المؤقت" },
  { arPattern: /ال?كاردياك\s*أوتبوت|كاردياك\s*اوتبوت/gi, en: "Cardiac Output", arDef: "النتاج القلبي: كمية الدم التي يضخها القلب في الدقيقة الواحدة" },
  { arPattern: /ال?ستروك\s*فوليوم/gi, en: "Stroke Volume", arDef: "حجم الضربة: كمية الدم المضخوخة من البطين في الانقباضة الواحدة" },
  { arPattern: /ال?أفترلود|افترلود/gi, en: "Afterload", arDef: "الحمل البعدي: المقاومة التي يواجهها البطين لضخ الدم خارج القلب" },
  { arPattern: /ال?بريللود|بريلولود|بريلود/gi, en: "Preload", arDef: "الحمل القبلي: حجم الدم وضغطه داخل البطين في نهاية الانبساط" },
  { arPattern: /ال?إي\s*سي\s*جي|اي\s*سي\s*جي/gi, en: "ECG", arDef: "تخطيط كهربية القلب لتشخيص اضطرابات النظم والجلطات" },

  // Pharmacology & Autonomic Nervous System
  { arPattern: /ال?بيتا\s*بلوكرز?|بيتا\s*بلوكر/gi, en: "Beta-Blocker", arDef: "حاصرات مستقبلات بيتا الأدرينالية لتقليل معدل ضربات القلب وضغط الدم" },
  { arPattern: /ال?كالسيوم\s*تشانل\s*بلوكرز?/gi, en: "Calcium Channel Blocker", arDef: "حاصرات قنوات الكالسيوم لتوسيع الأوعية الدموية وتقليل انقباض القلب" },
  { arPattern: /ال?إيس\s*إنهيبيتورز?|ايس\s*انهيبيتور/gi, en: "ACE Inhibitor", arDef: "مثبطات الإنزيم المحول للأنجيوتنسين لعلاج الضغط وفشل القلب" },
  { arPattern: /ال?دايورتكس|ال?ديورتكس/gi, en: "Diuretics", arDef: "مدرات البول للتخلص من السوائل والأملاح الزائدة بالجسم" },
  { arPattern: /ال?أنتي\s*بيوتكس?|انتي\s*بيوتك/gi, en: "Antibiotics", arDef: "المضادات الحيوية لعلاج العدوى البكتيرية" },
  { arPattern: /ال?أنتي\s*كواجيولانت|انتي\s*كواجيولانت/gi, en: "Anticoagulant", arDef: "مضادات التجلط (مسيلات الدم) لمنع تكوّن الخثرات الدموية" },
  { arPattern: /ال?أنتي\s*بليتلت|انتي\s*بليتلت/gi, en: "Antiplatelet", arDef: "مضادات تكدس الصفائح الدموية مثل الأسبرين والكلوبيدوجريل" },
  { arPattern: /ال?ثرومبولايتكس?|ثرومبو\s*لايتك/gi, en: "Thrombolytics", arDef: "مذيبات الجلطات الحادة لإعادة فتح الشريان المسدود فوراً" },
  { arPattern: /ال?كورتيكوستيرويدز?|كورتيكو\s*ستيرويد/gi, en: "Corticosteroids", arDef: "الكورتيزون ومشتقاته كمضادات قوية للالتهاب ومثبطات للمناعة" },
  { arPattern: /ال?إن\s*سيدز|ان\s*سيدز/gi, en: "NSAIDs", arDef: "مضادات الالتهاب غير الستيرويدية لتسكين الألم وخفض الحرارة" },
  { arPattern: /ال?باراسيتامول/gi, en: "Paracetamol (Acetaminophen)", arDef: "مسكن للألم وخافض للحرارة آمن على المعدة بجرعة قصوى 4 جم يومياً" },
  { arPattern: /ال?أدرينالين|ادرينالين/gi, en: "Adrenaline (Epinephrine)", arDef: "هرمون ودواء طوارئ للإنعاش القلبي وعلاج الحساسية المفرطة" },
  { arPattern: /ال?نورأدرينالين|نورادرينالين/gi, en: "Noradrenaline (Norepinephrine)", arDef: "قابض وعائي قوي يُستخدم كخط أول في علاج الصدمة الإنتانية" },
  { arPattern: /ال?أتروبين|اتروبين/gi, en: "Atropine", arDef: "مضاد للمسكارين يُستخدم في علاج تباطؤ القلب الشديد والتسمم بالمبيدات" },
  { arPattern: /ال?ديجوكسين/gi, en: "Digoxin", arDef: "مقوٍ لعضلة القلب ومنظم للرجفان الأذيني عبر تثبيط مضخة الصوديوم والبوتاسيوم" },
  { arPattern: /ال?وارفارين/gi, en: "Warfarin", arDef: "مضاد تجلط فموي يعمل عبر تثبيط عوامل التجلط المعتمدة على فيتامين K" },
  { arPattern: /ال?هيبارين/gi, en: "Heparin", arDef: "مضاد تجلط وريدي أو تحت الجلد يعمل عبر تنشيط Antithrombin III" },
  { arPattern: /ال?إنسولين|انسولين/gi, en: "Insulin", arDef: "الهرمون الأساسي الخافض لسكر الدم والمسؤول عن إدخال الجلوكوز للخلايا" },
  { arPattern: /ال?ميتفورمين/gi, en: "Metformin", arDef: "خط العلاج الأول لمرضى السكري من النوع الثاني ويقلل مقاومة الإنسولين" },
  { arPattern: /ال?هاف\s*لايف/gi, en: "Half-Life (t½)", arDef: "فترة عمر النصف للدواء: الوقت اللازم لانخفاض تركيز الدواء في البلازما للنصف" },
  { arPattern: /ال?بايو\s*أفيلابيليتي|بايو\s*افيلابيليتي/gi, en: "Bioavailability", arDef: "التوافر الحيوي: نسبة الدواء التي تصل للدورة الدموية بصورة فعالة" },
  { arPattern: /ال?ميتابوليزم/gi, en: "Metabolism", arDef: "الأيض والتمثيل الغذائي للدواء (غالباً في الكبد عبر إنزيمات CYP450)" },

  // Pathology, Immunology & General Medicine
  { arPattern: /ال?باثوفسيولوجي|باثو\s*فسيولوجي/gi, en: "Pathophysiology", arDef: "الفسيولوجيا المرضية: آلية حدوث المرض وتأثيره الوظيفي على أعضاء الجسم" },
  { arPattern: /ال?إتيولوجي|اتيولوجي/gi, en: "Etiology", arDef: "علم الأسباب: المسبب الرئيسي والأولي للمرض" },
  { arPattern: /ال?بروجنوزيس|بروجنوسيس/gi, en: "Prognosis", arDef: "مآل المرض والتوقع الطبي لمسار الحالة وفرص الشفاء" },
  { arPattern: /ال?ديفرنشيال\s*دايجنوزيس/gi, en: "Differential Diagnosis", arDef: "التشخيص التفريقي: قائمة الأمراض المحتملة التي تتشابه في نفس الأعراض" },
  { arPattern: /ال?كومبليكيشنز?|كومبليكيشن/gi, en: "Complications", arDef: "المضاعفات المرضية الثانوية الناتجة عن المرض أو تأخر علاجه" },
  { arPattern: /ال?كونترا\s*إنديكيشن|كونترا\s*انديكيشن/gi, en: "Contraindication", arDef: "موانع الاستعمال الطبية التي يُحظر فيها إعطاء دواء أو إجراء معين" },
  { arPattern: /ال?سايد\s*إفيكتس?|سايد\s*افيكت/gi, en: "Side Effects", arDef: "الآثار والأعراض الجانبية غير المرغوبة للدواء" },
  { arPattern: /ال?إنفلاميشن|انفلاميشن/gi, en: "Inflammation", arDef: "الالتهاب: استجابة مناعية وعائية وخلوية للأنسجة تجاه الضرر أو العدوى" },
  { arPattern: /ال?إديما|اديما|إيديما/gi, en: "Edema", arDef: "الوذمة والتورم الناتج عن تراكم السوائل في الفراغ بين الخلوي" },
  { arPattern: /ال?نيكروزيس|نيكروسيس/gi, en: "Necrosis", arDef: "النخر الخلوي: موت غير مبرمج للخلايا والأنسجة الحية مصحوباً بالتهاب" },
  { arPattern: /ال?أبوبتوزيس|ابوبتوزيس/gi, en: "Apoptosis", arDef: "الموت الخلوي المبرمج: عملية منظمة للتخلص من الخلايا التالفة دون التهاب" },
  { arPattern: /ال?فيبروزيس|فيبروسيس/gi, en: "Fibrosis", arDef: "التليف: ترسب مفرط للأنسجة الليفية والكولاجين نتيجة التهاب مزمن" },
  { arPattern: /ال?هايبرتروفي|هايبر\s*تروفي/gi, en: "Hypertrophy", arDef: "تضخم العضو أو النسيج نتيجة زيادة حجم الخلايا وليس عددها" },
  { arPattern: /ال?هايبربليزيا|هايبر\s*بليزيا/gi, en: "Hyperplasia", arDef: "فرط التنسج: زيادة حجم النسيج نتيجة زيادة عدد الخلايا وانقسامها" },
  { arPattern: /ال?أتروفي|اتروفي/gi, en: "Atrophy", arDef: "ضمور النسيج أو العضو نتيجة نقص حجم وعدد خلاياه" },
  { arPattern: /ال?ميتابليزيا|ميتا\s*بليزيا/gi, en: "Metaplasia", arDef: "الحؤول: تحول نوع من الخلايا الناضجة إلى نوع آخر أكثر تحملاً للبيئة" },
  { arPattern: /ال?ديسبليزيا|ديس\s*بليزيا/gi, en: "Dysplasia", arDef: "خلل التنسج: نمو غير طبيعي للخلايا في الشكل والحجم والترتيب وقد يسبق السرطان" },
  { arPattern: /ال?ميتاستاسيس|ميتا\s*ستاسيس/gi, en: "Metastasis", arDef: "الانبثاث: انتقال الخلايا السرطانية من الورم الأولي إلى أعضاء بعيدة" },
  { arPattern: /ال?سيبسيس|سبسيس/gi, en: "Sepsis", arDef: "إنتان الدم: استجابة التهابية جهازية خطيرة ومهددة للحياة تجاه عدوى" },
  { arPattern: /ال?أنافيلاكسيس|انافيلاكسيس/gi, en: "Anaphylaxis", arDef: "صدمة الحساسية المفرطة الحادة وتُعالج فوراً بحقن Adrenaline عضلياً" },
  { arPattern: /ال?هايبوكسيا|هايبو\s*كسيا/gi, en: "Hypoxia", arDef: "نقص الأكسجين الواصل لأنسجة وخلايا الجسم" },
  { arPattern: /ال?سيانوزيس|سيانوسيس/gi, en: "Cyanosis", arDef: "الزرقة: تلون الجلد والأغشية المخاطية بالأزرق نتيجة زيادة الهيموجلوبين غير المؤكسج" },
  { arPattern: /ال?ديسنيا|ديزنيا/gi, en: "Dyspnea", arDef: "ضيق وصعوبة التنفس (نهجان)" },
  { arPattern: /ال?أورثوبنيا|اورثوبنيا/gi, en: "Orthopnea", arDef: "ضيق التنفس عند الاستلقاء ويتحسن بالجلوس، وهو علامة مميزة لفشل القلب الأيسر" },
  { arPattern: /ال?ديابيتس|ديابيتيس/gi, en: "Diabetes Mellitus", arDef: "مرض السكري الناتج عن نقص الإنسولين أو مقاومة الأنسجة له" },
  { arPattern: /ال?هايبوجلايسيميا|هايبو\s*جلايسيميا/gi, en: "Hypoglycemia", arDef: "هبوط سكر الدم لأقل من 70 مجم/ديسيلتر وهو طارئ طبي فوري" },
  { arPattern: /ال?هايبرجلايسيميا|هايبر\s*جلايسيميا/gi, en: "Hyperglycemia", arDef: "ارتفاع مستوى الجلوكوز في الدم عن المعدل الطبيعي" },
  { arPattern: /ال?كيتوأسيدوزيس|دي\s*كي\s*إيه/gi, en: "Diabetic Ketoacidosis (DKA)", arDef: "الحماض الكيتوني السكري: مضاعفة حادة خطيرة تشمل ارتفاع السكر والكيتونات وحموضة الدم" },
  { arPattern: /ال?أنيميا|انيميا/gi, en: "Anemia", arDef: "فقر الدم: نقص تركيز الهيموجلوبين أو عدد كرات الدم الحمراء" },
  { arPattern: /ال?ثرومبوسايتوبينيا/gi, en: "Thrombocytopenia", arDef: "نقص عدد الصفائح الدموية عن 150,000 مما يزيد خطر النزيف" },
  { arPattern: /ال?ليكوسايتوزيس/gi, en: "Leukocytosis", arDef: "ارتفاع عدد كرات الدم البيضاء غالباً نتيجة عدوى أو التهاب حاد" },
];

export const ENGLISH_TERM_DEFINITIONS = {
  "bronchodilator": "موسّع للشعب الهوائية يعمل على إرخاء العضلات الملساء في القصبات لتسهيل التنفس",
  "vasodilator": "موسّع للأوعية الدموية يقلل المقاومة الوعائية الطرفية ويخفض ضغط الدم",
  "vasoconstriction": "انقباض وتضيق الأوعية الدموية مما يرفع ضغط الدم والمقاومة الطرفية",
  "tachycardia": "تسارع ضربات القلب لأكثر من 100 نبضة في الدقيقة في وقت الراحة",
  "bradycardia": "تباطؤ ضربات القلب لأقل من 60 نبضة في الدقيقة",
  "arrhythmia": "اضطراب في نظم وكهرباء القلب يؤدي لعدم انتظام ضرباته",
  "hypotension": "انخفاض ضغط الدم الشرياني عن المعدل الطبيعي (أقل من 90/60 مم زئبق)",
  "hypertension": "ارتفاع ضغط الدم الشرياني المزمن عن 130/80 مم زئبق",
  "ischemia": "نقص التروية الدموية والأكسجين الواصل لنسيج أو عضو معين",
  "infarction": "احتشاء وموت النسيج نتيجة انقطاع الإمداد الدموي عنه تماماً",
  "myocardial infarction": "جلطة واحتشاء عضلة القلب نتيجة انسداد حاد في أحد الشرايين التاجية",
  "heart failure": "فشل القلب في ضخ الدم بكمية كافية لتلبية احتياجات الجسم الأيضية",
  "stroke volume": "حجم الضربة: كمية الدم المضخوخة من البطين في الانقباضة الواحدة",
  "cardiac output": "النتاج القلبي: كمية الدم التي يضخها القلب في الدقيقة الواحدة (CO = HR × SV)",
  "preload": "الحمل القبلي: حجم الدم وضغطه داخل البطين في نهاية الانبساط",
  "afterload": "الحمل البعدي: المقاومة التي يواجهها البطين لضخ الدم خارج القلب",
  "beta-blocker": "حاصرات مستقبلات بيتا الأدرينالية لتقليل معدل ضربات القلب وضغط الدم",
  "ace inhibitor": "مثبطات الإنزيم المحول للأنجيوتنسين لعلاج الضغط وفشل القلب",
  "diuretics": "مدرات البول للتخلص من السوائل والأملاح الزائدة بالجسم",
  "anticoagulant": "مضادات التجلط (مسيلات الدم) لمنع تكوّن الخثرات الدموية",
  "antiplatelet": "مضادات تكدس الصفائح الدموية مثل الأسبرين والكلوبيدوجريل",
  "corticosteroids": "الكورتيزون ومشتقاته كمضادات قوية للالتهاب ومثبطات للمناعة",
  "nsaids": "مضادات الالتهاب غير الستيرويدية لتسكين الألم وخفض الحرارة",
  "digoxin": "مقوٍ لعضلة القلب ومنظم للرجفان الأذيني عبر تثبيط مضخة Na+/K+ ATPase",
  "warfarin": "مضاد تجلط فموي يعمل عبر تثبيط عوامل التجلط المعتمدة على فيتامين K",
  "heparin": "مضاد تجلط وريدي أو تحت الجلد يعمل عبر تنشيط Antithrombin III",
  "insulin": "الهرمون الأساسي الخافض لسكر الدم والمسؤول عن إدخال الجلوكوز للخلايا",
  "metformin": "خط العلاج الأول لمرضى السكري من النوع الثاني ويقلل مقاومة الإنسولين",
  "bioavailability": "التوافر الحيوي: نسبة الدواء التي تصل للدورة الدموية بصورة فعالة",
  "pathophysiology": "الفسيولوجيا المرضية: آلية حدوث المرض وتأثيره الوظيفي على أعضاء الجسم",
  "etiology": "علم الأسباب: المسبب الرئيسي والأولي للمرض",
  "prognosis": "مآل المرض والتوقع الطبي لمسار الحالة وفرص الشفاء",
  "differential diagnosis": "التشخيص التفريقي: قائمة الأمراض المحتملة التي تتشابه في نفس الأعراض",
  "contraindication": "موانع الاستعمال الطبية التي يُحظر فيها إعطاء دواء أو إجراء معين",
  "inflammation": "الالتهاب: استجابة مناعية وعائية وخلوية للأنسجة تجاه الضرر أو العدوى",
  "edema": "الوذمة والتورم الناتج عن تراكم السوائل في الفراغ بين الخلوي",
  "necrosis": "النخر الخلوي: موت غير مبرمج للخلايا والأنسجة الحية مصحوباً بالتهاب",
  "apoptosis": "الموت الخلوي المبرمج: عملية منظمة للتخلص من الخلايا التالفة دون التهاب",
  "fibrosis": "التليف: ترسب مفرط للأنسجة الليفية والكولاجين نتيجة التهاب مزمن",
  "hypertrophy": "تضخم العضو أو النسيج نتيجة زيادة حجم الخلايا وليس عددها",
  "hyperplasia": "فرط التنسج: زيادة حجم النسيج نتيجة زيادة عدد الخلايا وانقسامها",
  "atrophy": "ضمور النسيج أو العضو نتيجة نقص حجم وعدد خلاياه",
  "metaplasia": "الحؤول: تحول نوع من الخلايا الناضجة إلى نوع آخر أكثر تحملاً للبيئة",
  "dysplasia": "خلل التنسج: نمو غير طبيعي للخلايا في الشكل والحجم والترتيب وقد يسبق السرطان",
  "metastasis": "الانبثاث: انتقال الخلايا السرطانية من الورم الأولي إلى أعضاء بعيدة",
  "sepsis": "إنتان الدم: استجابة التهابية جهازية خطيرة ومهددة للحياة تجاه عدوى",
  "anaphylaxis": "صدمة الحساسية المفرطة الحادة وتُعالج فوراً بحقن Adrenaline عضلياً",
  "hypoxia": "نقص الأكسجين الواصل لأنسجة وخلايا الجسم",
  "cyanosis": "الزرقة: تلون الجلد والأغشية المخاطية بالأزرق نتيجة زيادة الهيموجلوبين غير المؤكسج",
  "dyspnea": "ضيق وصعوبة التنفس (نهجان)",
  "orthopnea": "ضيق التنفس عند الاستلقاء ويتحسن بالجلوس، وهو علامة مميزة لفشل القلب الأيسر",
  "diabetes mellitus": "مرض السكري الناتج عن نقص الإنسولين أو مقاومة الأنسجة له",
  "hypoglycemia": "هبوط سكر الدم لأقل من 70 مجم/ديسيلتر وهو طارئ طبي فوري",
  "hyperglycemia": "ارتفاع مستوى الجلوكوز في الدم عن المعدل الطبيعي",
  "anemia": "فقر الدم: نقص تركيز الهيموجلوبين أو عدد كرات الدم الحمراء",
  "ecg": "تخطيط كهربية القلب لتشخيص اضطرابات النظم والجلطات",
  "acl": "الرباط الصليبي الأمامي (Anterior Cruciate Ligament) المسؤول عن ثبات مفصل الركبة",
};

/**
 * Restores Arabic-transliterated medical terms in raw transcript text into
 * clean English medical terms so doctors' mixed Arabic/English speech is preserved accurately.
 */
export function restoreEnglishMedicalTerms(text = "") {
  let out = String(text || "");
  if (!out) return out;
  for (const entry of MEDICAL_PHONETIC_DICTIONARY) {
    out = out.replace(entry.arPattern, entry.en);
  }
  return out;
}

/**
 * Extracts all medical/scientific terms from a list of sentences and pairs each
 * with a clear Arabic medical definition & context from the lecture.
 */
export function extractMedicalLexiconFromSentences(sentences = [], existingTerms = []) {
  const seen = new Map();

  for (const t of Array.isArray(existingTerms) ? existingTerms : []) {
    const en = String(t?.en || t?.term || "").trim();
    if (!en) continue;
    const key = en.toLowerCase();
    const dictDef = ENGLISH_TERM_DEFINITIONS[key];
    seen.set(key, {
      en,
      ar_hint: t.ar_hint || t.ar || dictDef || "مصطلح طبي وعلمي محوري ورد في شرح المحاضرة",
      first_id: t.first_id || "s000001",
    });
  }

  for (const s of Array.isArray(sentences) ? sentences : []) {
    const text = String(s?.text || "");
    if (!text) continue;
    const sid = s?.id || "s000001";

    for (const entry of MEDICAL_PHONETIC_DICTIONARY) {
      if (
        entry.arPattern.test(text) ||
        text.toLowerCase().includes(entry.en.toLowerCase())
      ) {
        const key = entry.en.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, {
            en: entry.en,
            ar_hint: entry.arDef,
            first_id: sid,
          });
        }
      }
      entry.arPattern.lastIndex = 0;
    }

    const matches = text.match(/\b[A-Za-z][A-Za-z0-9/-]{2,28}(?:\s+[A-Za-z][A-Za-z0-9/-]{2,28}){0,2}\b/g) || [];
    for (const rawMatch of matches) {
      const clean = rawMatch.trim();
      const key = clean.toLowerCase();
      if (
        clean.length < 3 ||
        /^(the|and|for|with|from|this|that|into|over|under|between|after|before|about|mg|ml|kg|mmhg|hr|min|sec)$/i.test(clean)
      ) {
        continue;
      }
      if (!seen.has(key)) {
        const dictDef = ENGLISH_TERM_DEFINITIONS[key];
        const contextAr = text
          .replace(/[A-Za-z0-9.,:;()[\]/+-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        seen.set(key, {
          en: clean,
          ar_hint:
            dictDef ||
            (contextAr.length >= 12
              ? `في سياق المحاضرة: ${contextAr.slice(0, 140)}`
              : "مصطلح طبي أساسي ورد في المحاضرة ويُحفظ بالإنجليزية للامتحان"),
          first_id: sid,
        });
      }
    }
  }

  return Array.from(seen.values()).slice(0, 45);
}

export default {
  restoreEnglishMedicalTerms,
  extractMedicalLexiconFromSentences,
  MEDICAL_PHONETIC_DICTIONARY,
  ENGLISH_TERM_DEFINITIONS,
};
