/**
 * summaryEnhance.js — the "make the summary FELT" layer.
 *
 * Everything here is client-side and works on top of the existing smart-card
 * sections (buildSmartSections output). Zero schema changes, zero regeneration
 * of the base summary:
 *
 *  1. `scoreItemYield` / `filterSectionsByDepth` — the 3-level depth toggle
 *     (exam-night / focused explanation / full reference) computed from the
 *     items that already exist in every summary.
 *  2. `enrichSummarySections` — a per-section AI pass that appends High-Yield
 *     blocks (clinical pearls, mnemonics, danger numbers, X-vs-Y compares) to
 *     summaries that were generated before these blocks existed.
 *  3. Blur-mode / hover-glossary regex kits used by FormattedInlineText.
 *  4. `buildCramSheetPlain` — the one-page exam-morning sheet.
 *
 * The AI calls go through @/lib/ai generateText, which transparently proxies
 * through the authenticated server when the browser holds no provider key.
 */

// ─── 1. Yield scoring & depth filtering ──────────────────────────────────────

const RED_FLAG_RE =
  /(first[- ]line|gold(?:en)? standard|contraindicat|life[- ]threatening|immediately|mandatory|earliest|definitive|diagnostic of|pathognomonic|antidote|lethal|toxicity|emergency|أبكر علامة|القاعدة الذهبية|الخط الأول|ممنوع|مضاد استطباب|فوراً|حتمي|قاتل|سمية|طوارئ|تشخيص مؤكد|مميز مرضي|الترياق)/i;

const DOSAGE_RE =
  /(\d+(?:\.\d+)?\s*(?:mg\/kg|mg\/dL|mmHg|mmol\/L|mEq\/L|mcg|mg|g|mL|ml|IU|L|%|bpm|cm|mm|ملجم|جرام|مل|لتر|مم زئبق|%))/i;

const ALWAYS_KEEP_KINDS = new Set([
  "subheading",
  "callout",
  "table",
  "concepts",
  "pearl",
  "mnemonic",
  "danger",
  "compare",
]);

/**
 * 0..100 exam-yield heuristic for one smart-card item. The weights encode the
 * app's "foundational bilingual" pedagogy: structured comparisons and alerts
 * outrank prose, red-flag phrasing and numeric thresholds outrank everything.
 */
export function scoreItemYield(item) {
  if (!item || typeof item !== "object") return 0;
  const text = [
    item.text,
    item.title,
    ...(item.points || []),
    ...(Array.isArray(item.pairs) ? item.pairs.map((p) => (typeof p === "string" ? p : `${p?.en || ""} ${p?.ar || ""}`)) : []),
    ...(item.headers || []),
    ...(item.rows || []).flat(),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);

  let score;
  switch (item.kind) {
    case "callout":
      score = item.tone === "warning" ? 92 : 72;
      break;
    case "table":
      score = 84;
      break;
    case "concepts":
      score = 74;
      break;
    case "pearl":
    case "danger":
      score = 96;
      break;
    case "mnemonic":
    case "compare":
      score = 90;
      break;
    case "figure":
      // Lecture images are visual exam ammunition — survive exam-night depth.
      score = 70;
      break;
    case "list":
      score = item.role === "english_points" ? 72 : 60;
      break;
    case "bilingual_pairs":
      score = 66;
      break;
    case "subheading":
      score = 55;
      break;
    default:
      score = 45;
  }

  if (RED_FLAG_RE.test(text)) score += 18;
  if (DOSAGE_RE.test(text)) score += 12;
  if (item.kind === "card" && item.role === "english") score += 8;
  // Long discursive Arabic explanation cards are the first thing to drop in
  // exam-night mode — understanding aids, not exam ammunition.
  if (item.kind === "card" && text.length > 420 && !DOSAGE_RE.test(text) && !RED_FLAG_RE.test(text)) score -= 18;

  return Math.max(0, Math.min(100, score));
}

export const SUMMARY_DEPTHS = Object.freeze({
  exam: { threshold: 60, labelAr: "ليلة الامتحان ⚡", labelEn: "Exam Night" },
  explain: { threshold: 30, labelAr: "شرح مركّز", labelEn: "Focused Study" },
  full: { threshold: -1, labelAr: "مرجع كامل", labelEn: "Full Reference" },
});

/**
 * Returns a NEW sections array with items filtered per depth. Sections that
 * lose every item keep their subheading so the TOC numbers stay meaningful.
 */
export function filterSectionsByDepth(sections, depth = "full") {
  const cfg = SUMMARY_DEPTHS[depth];
  if (!cfg || cfg.threshold < 0) return sections;
  return sections.map((sec) => {
    const kept = (sec.items || []).filter(
      (item) => ALWAYS_KEEP_KINDS.has(item.kind) || scoreItemYield(item) >= cfg.threshold,
    );
    // Never strand a section with zero content under a heading.
    const items =
      kept.length > 0
        ? kept
        : (sec.items || []).filter((item) => item.kind === "subheading");
    return { ...sec, items };
  });
}

// ─── 2. AI enrichment (golden blocks for existing summaries) ─────────────────

const ENRICH_SYSTEM = `أنت أستاذ طب متخصص في تجهيز الطلاب للامتحانات. مهمتك استخراج «الذهب» من نص ملخص منهجي موجود بالفعل — وليس إعادة شرحه.
القواعد الصارمة:
- لا تخترع حقيقة غير موجودة في النص المُعطى. كل لقطة ذهبية يجب أن تُشتق من النص.
- المصطلحات الطبية تبقى بالإنجليزية كما هي، الشرح بالعربية.
- أعد JSON صالح فقط، بلا Markdown وبلا أي نص خارج الـ JSON.`;

const ENRICH_PROMPT = (title, text) => `العنوان: «${title}»
النص:
"""
${text.slice(0, 6500)}
"""

استخرج من النص أعلاه فقط (بحد أقصى 2 لكل نوع — اترك النوع فارغاً [] لو لا يوجد ما يستحق):
1. pearls: نقاط «الإجابة النموذجية» الجاهزة — الجملة التي لو كتبها الطالب في الامتحان يأخذ الدرجة كاملة.
2. mnemonics: تكنيك حفظ ظريف بالمصري لأي قائمة/مصطلحات — ربط قافية أو جملة سخيفة محفوظة. الصيغة: «القائمة ← التكنيك ← لماذا ينفع».
3. dangers: أرقام/جرعات/عتبات من النص وُضعت في صيغة إنذار «لا تنسى أبداً».
4. compares: جدول تمييز واحد بين أقرب مفهومين/مرضين متشابهين في النص (x و y) مع صفوف مقارنة.
5. hook: جملة واحدة — «ليه الجزئية دي بتيجي في الامتحان؟»
6. diagrams: مخطط Mermaid واحد فقط (وليس أكثر) يلخّص مسار/آلية/خوارزمية فعلاً موجودة في النص (مثل mechanism of action أو clinical pathway أو cascade). القواعد: ممنوع منعاً باتاً أي نص عربي داخل المخطط — العقد كلها إنجليزي قصير؛ استخدم flowchart TD أو sequenceDiagram فقط؛ ضع أسماء العقد بين "..." حمايةً من الرموز؛ ممنوع أي قوس داخل التسميات. اترك القائمة فارغة [] لو النص لا يليق بأي مخطط.

JSON فقط بهذا الشكل:
{"pearls":["..."],"mnemonics":["..."],"dangers":["..."],"compares":[{"title":"...","x":"...","y":"...","rows":[{"aspect":"...","xVal":"...","yVal":"..."}]}],"hook":"...","diagrams":[{"title":"...","mermaid":"flowchart TD\n    A[\"...\"] --> B[\"...\"]"}]}`;

/** Tolerant JSON object extraction from a model reply. */
export function parseEnrichmentJson(raw = "") {
  if (!raw) return null;
  let clean = String(raw).replace(/```(?:json)?/gi, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    const asList = (v) => (Array.isArray(v) ? v.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 3) : []);
    const compares = (Array.isArray(parsed.compares) ? parsed.compares : [])
      .map((c) => {
        const rows = (Array.isArray(c?.rows) ? c.rows : [])
          .map((r) => ({
            aspect: String(r?.aspect || "").trim(),
            xVal: String(r?.xVal ?? r?.x ?? "").trim(),
            yVal: String(r?.yVal ?? r?.y ?? "").trim(),
          }))
          .filter((r) => r.aspect && (r.xVal || r.yVal))
          .slice(0, 6);
        const x = String(c?.x || "").trim();
        const y = String(c?.y || "").trim();
        if ((!x && !y) || rows.length === 0) return null;
        return { title: String(c?.title || `${x} × ${y}`).trim(), x, y, rows };
      })
      .filter(Boolean)
      .slice(0, 1);
    const diagrams = (Array.isArray(parsed.diagrams) ? parsed.diagrams : [])
      .map((d) => sanitizeMermaidDiagram(d))
      .filter(Boolean)
      .slice(0, 1);
    return {
      pearls: asList(parsed.pearls),
      mnemonics: asList(parsed.mnemonics),
      dangers: asList(parsed.dangers),
      compares,
      hook: String(parsed.hook || "").trim(),
      diagrams,
    };
  } catch {
    return null;
  }
}

/** Section items → plain text for the model (& for TTS / cram sheet). */
export function sectionToPlainText(section) {
  const lines = [];
  for (const item of section?.items || []) {
    if (item.kind === "subheading" || item.text) lines.push(item.text || "");
    if (Array.isArray(item.points)) lines.push(...item.points);
    if (Array.isArray(item.pairs)) {
      for (const p of item.pairs) {
        if (typeof p === "string") lines.push(p);
        else lines.push([p?.en, p?.ar].filter(Boolean).join(" — "));
      }
    }
    if (Array.isArray(item.rows)) for (const row of item.rows) lines.push(row.join(" | "));
  }
  return lines.filter(Boolean).join("\n").slice(0, 12000);
}

/** Validate & sanitize a model-emitted mermaid diagram (Arabic-text diagrams
 *  render broken — the prompt forbids them, this is the enforcement layer). */
const MERMAID_TYPES_RE = /^\s*(flowchart|sequenceDiagram|stateDiagram|classDiagram|journey|gantt|erDiagram|mindmap|timeline)/;

export function sanitizeMermaidDiagram(raw) {
  if (!raw) return null;
  let code = String(raw.mermaid || raw.code || "").trim();
  if (!code || code.length > 2500) return null;
  // Strip common model wrappers.
  code = code.replace(/^```(?:mermaid)?/i, "").replace(/```$/, "").trim();
  if (!MERMAID_TYPES_RE.test(code)) return null;
  // No Arabic inside the diagram — RTL text scrambles node rendering.
  if (/[\u0600-\u06FF]/.test(code)) return null;
  const title = String(raw.title || "").trim().slice(0, 120);
  return { title, mermaid: code };
}

/** Convert parsed enrichment JSON into smart-card items appended to a section. */
export function enrichmentToItems(parsed, sectionId) {
  if (!parsed) return [];
  const items = [];
  const push = (kind, text, extra = {}) =>
    items.push({ kind, id: `enr-${sectionId}-${kind}-${items.length}`, text, ...extra });

  parsed.pearls.forEach((t) => push("pearl", t));
  parsed.mnemonics.forEach((t) => push("mnemonic", t));
  parsed.dangers.forEach((t) => push("danger", t));
  parsed.compares.forEach((c) =>
    push("compare", c.title, { headers: ["وجه المقارنة", c.x || "الأول", c.y || "الثاني"], rows: c.rows.map((r) => [r.aspect, r.xVal, r.yVal]) }),
  );
  (parsed.diagrams || []).forEach((d) => push("diagram", d.title || "مخطط توضيحي", { mermaid: d.mermaid }));
  if (parsed.hook) push("exam_hook", parsed.hook);
  return items;
}

const ENRICH_CACHE_PREFIX = "bf_enrich_v1:";
const cacheKey = (courseId, textHash) => `${ENRICH_CACHE_PREFIX}${courseId || "anon"}:${textHash}`;

export function simpleTextHash(text = "") {
  let h = 0;
  const s = String(text).slice(0, 20000);
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function loadEnrichmentCache(courseId, textHash) {
  try {
    const raw = localStorage.getItem(cacheKey(courseId, textHash));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveEnrichmentCache(courseId, textHash, data) {
  try {
    localStorage.setItem(cacheKey(courseId, textHash), JSON.stringify(data));
  } catch {}
}

/**
 * Runs the golden-block pass over every section. Purely additive: returns a
 * map `{ [sectionId]: items[] }` — callers merge them into section.items.
 *
 * @param sections    smart-card sections
 * @param generateText fn(prompt, config?, systemPrompt?) from @/lib/ai
 * @param onProgress  ({done, total, sectionTitle}) => void
 */
export async function enrichSummarySections(sections, generateText, onProgress = () => {}) {
  const out = {};
  const total = sections.length;
  for (let i = 0; i < sections.length; i += 1) {
    const sec = sections[i];
    onProgress({ done: i, total, sectionTitle: sec.title });
    const hasEnrichment = (sec.items || []).some((it) => it.kind === "pearl" || it.kind === "mnemonic" || it.kind === "danger");
    if (hasEnrichment) continue; // skip re-enriching
    const body = sectionToPlainText(sec);
    if (body.trim().length < 120) continue;
    try {
      const reply = await generateText(ENRICH_PROMPT(sec.title || `Unit ${i + 1}`, body), {}, ENRICH_SYSTEM);
      const parsed = parseEnrichmentJson(reply);
      const items = enrichmentToItems(parsed, sec.id);
      if (items.length > 0) out[sec.id] = items;
    } catch (err) {
      // One bad section must not kill the run.
      console.warn("[summaryEnhance] section enrichment failed:", err?.message || err);
    }
    // Gentle pacing so the shared key pool never smokes.
    await new Promise((r) => setTimeout(r, 350));
  }
  onProgress({ done: total, total, sectionTitle: "" });
  return out;
}

/** Merge enrichment item lists into sections (append at the end of each). */
export function mergeEnrichments(sections, enrichments) {
  if (!enrichments || typeof enrichments !== "object") return sections;
  return sections.map((sec) => {
    const extra = enrichments[sec.id];
    if (!extra || extra.length === 0) return sec;
    const existingKinds = new Set((sec.items || []).map((it) => `${it.kind}:${String(it.text || "").slice(0, 40)}`));
    const fresh = extra.filter((it) => !existingKinds.has(`${it.kind}:${String(it.text || "").slice(0, 40)}`));
    return fresh.length ? { ...sec, items: [...(sec.items || []), ...fresh] } : sec;
  });
}

// ─── 3. Blur mode & hover glossary ───────────────────────────────────────────

/** Latin medical/academic term runs (≥4 letters) worth hiding in blur mode. */
export const LATIN_TERM_RE = /\b[A-Za-z](?:[A-Za-z-]{3,30})(?:\s+(?:[A-Z][a-z]{3,20})){0,2}\b/g;

/** Numbers with clinical units plus percentages — classic active-recall targets. */
export const DOSE_NUMBER_RE = /\b\d+(?:\.\d+)?\s*(?:mg\/kg|mg\/dL|mmHg|mmol\/L|mEq\/L|mEq|mcg|mg|g|mL|ml|IU|L|bpm|%|cm|mm|مم زئبق|ملجم|مل|جرام)\b/gi;

// Stop-words that must never become blur/glossary tokens.
const ENGLISH_STOP = new Set(
  ("the,and,for,with,from,that,this,which,are,was,were,has,have,had,not,but,can,could,should,would,may,might,will,shall,into,onto,upon,also,than,then,when,while,where,what,how,why,who,whom,whose,each,every,other,another,some,any,all,more,most,less,least,much,many,few,only,just,even,such,same,very,too,between,because,during,under,over,after,before,about,against,through,across,within,without,among,along,above,below,behind,beyond,around,near,off,out,does,did,done,make,made,get,got,take,took,give,gave,use,used,using,based,called,known,seen,found,type,form,line,cases,cause,causes,leads,results,requires,indicates,must,being,been,is,be,by,at,in,on,to,of,or,as,if,it,its,an,no,do,so,we,they,he,she,she,one,two,three,new,per,via,vs,etc,fig,et,al,ibid,non,pre,post,anti,pro".split(",")),
);

/** Tiny curated Arabic glossary for the most frequent English medical terms. */
export const MEDICAL_GLOSSARY = {
  "myocardial infarction": "احتشاء عضلة القلب — موت جزء من عضلة القلب بسبب انسداد شريان تاجي",
  angina: "ذبحة صدرية — ألم صدري مؤقت بسبب نقص تروية القلب",
  hypertension: "ارتفاع ضغط الدم (≥140/90 mmHg)",
  hypotension: "انخفاض ضغط الدم — قد يسبب دوخة أو إغماء",
  tachycardia: "تسرع القلب — معدل ضربات > 100/دقيقة",
  bradycardia: "بطء القلب — معدل ضربات < 60/دقيقة",
  arrhythmia: "اضطراب نظم القلب",
  "atrial fibrillation": "رجفان أذيني — نظم غير منتظم تمامًا وسريع",
  "heart failure": "فشل القلب — عجز القلب عن ضخ دم كافي للجسم",
  edema: "وذمة — تجمع سوائل في الأنسجة (تورم)",
  cyanosis: "زرقة — اصطباغ أزرق للجلد/الأغشية لنقص الأكسجين",
  dyspnea: "ضيق التنفس",
  apnea: "انقطاع النفس",
  hypoxia: "نقص الأكسجين في الأنسجة",
  ischemia: "نقص التروية الدموية لنسيج ما",
  thrombosis: "تخثر — تكوّن جلطة داخل وعاء دموي",
  embolism: "انصمام — جلطة/جسم يسافر ويسد وعاءً آخر",
  atherosclerosis: "تصلب الشرايين — ترسب لويحات دهنية بجدار الشرايين",
  aneurysm: "أم دم — انتفاخ ضعف في جدار وعاء دموي قد ينفجر",
  shock: "صدمة — فشل الدورة الدموية في إيصال أكسجين كافٍ للأعضاء",
  sepsis: "إنتان — استجابة التهابية جهازية مهددة للحياة بسبب عدوى",
  pneumonia: "التهاب رئوي (رَوَح)",
  tuberculosis: "السل (الدرن)",
  asthma: "الربو — تضيق قصبات انعكاسي متكرر",
  pleurisy: "التهاب الجنبة — ألم صدري مع التنفس",
  diabetes: "السكري — خلل استقلاب الجلوكوز",
  insulin: "الأنسولين — هرمون إنزال سكر الدم من البنكرياس",
  glucose: "الجلوكوز — سكر الدم الرئيسي",
  ketoacidosis: "حماض كيتوني — مضاعفة خطيرة للسكري",
  hypoglycemia: "هبوط سكر الدم — تعرق ورعشة وتشوش",
  hyperglycemia: "ارتفاع سكر الدم",
  anesthesia: "تخدير",
  "general anesthesia": "تخدير عام — فقدان وعي عكسي مُسيطر عليه",
  adrenaline: "أدرينالين (Epinephrine) — هرمون/دواء الطوارئ الأول للأنافيلاكسيا",
  epinephrine: "إبينفرين — نفس الأدرينالين؛ الحقن العضلي الأول في الصدمة التحسسية",
  atropine: "أتروبين — مضاد موسكاريني؛ يرفع معدل القلب",
  dopamine: "دوبامين — ناقل عصبي ودواء رافع للضغط",
  dobutamine: "دوبيوتامين — مقوّم انقباض عضلة القلب",
  morphine: "مورفين — مسكن أفيوني قوي",
  aspirin: "أسبرين — مضاد صفيحات ومضاد التهاب",
  heparin: "هيبارين — مضاد تخثر سريع المفعول",
  warfarin: "وارفارين — مضاد تخثر فموي (يتابع بـ INR)",
  insulinoma: "ورم مفرز للأنسولين من البنكرياس",
  antibiotics: "مضادات حيوية تهاجم البكتيريا لا الفيروسات",
  "broad spectrum": "واسع الطيف — يغطي عائلات بكتيرية كثيرة",
  inflammation: "التهاب — استجابة نسيجية: احمرار/حرارة/تورم/ألم/فقد وظيفة",
  necrosis: "تنخر — موت نسيجي لا مرجعي",
  apoptosis: "موت خلوي مبرمج منظم",
  benign: "حميد — ورم غير سرطاني لا ينتشر",
  malignant: "خبيث — سرطاني قادر على الانتشار",
  metastasis: "نقائل — انتشار الورم لأعضاء بعيدة",
  carcinoma: "سرطانة — ورم خبيث من نسيج طلائي",
  prognosis: "إنذار — تكهن مسار المرض",
  diagnosis: "تشخيص",
  "differential diagnosis": "تشخيص تفريقي — قائمة الاحتمالات المنافسة",
  symptom: "عرَض — ما يشكوه المريض",
  sign: "علامة — ما يقيسه الفاحص",
  syndrome: "متلازمة — مجموعة أعراض وعلامات مترابطة",
  acute: "حاد — سريع البدء قصير المدة",
  chronic: "مزمن — طويل الأمد متطور ببطء",
  remission: "هُدأة — فترة خمول المرض",
  relapse: "انتكاس — عودة المرض بعد تحسن",
  congenital: "خلقي — موجود منذ الولادة",
  hereditary: "وراثي — منقول بالجينات",
  immunity: "مناعة",
  antibody: "جسم مضاد — بروتين Y الشكل يعادل مستضدًا محددًا",
  antigen: "مستضد — جزيء يثير الاستجابة المناعية",
  vaccine: "لقاح — يحفز مناعة واقية دون إحداث المرض",
  allergy: "حساسية — فرط استجابة مناعية لمستضد غير مؤذٍ",
  anaphylaxis: "أنافيلاكسيا — حساسية مفرطة حادة مهددة للحياة",
  "autoimmune disease": "مرض مناعي ذاتي — المناعة تهاجم الجسم نفسه",
  inflammation_of_liver: "", // placeholder never shown
  hepatitis: "التهاب الكبد",
  cirrhosis: "تليف الكبد — ندبات مزمنة تدمر بنية الكبد",
  jaundice: "يرقان — اصفرار الجلد/العين لارتفاع البيليروبين",
  nephron: "نيفرون — وحدة الترشيح الوظيفية بالكلية",
  dialysis: "غسيل كلوي — إزالة الفضلات صناعيًا",
  "renal failure": "فشل كلوي — عجز الكلى عن الترشيح الكافي",
  uremia: "يوريميا — تراكم اليوريا بالدم",
  hematuria: "بيلة دموية — دم في البول",
  proteinuria: "بيلة بروتينية — بروتين زائد في البول",
  neuron: "عصبون — خلية عصبية",
  synapse: "مشبك عصبي — نقطة اتصال العصبونات",
  neurotransmitter: "ناقل عصبي — رسول كيميائي بين الخلايا العصبية",
  stroke: "سكتة دماغية — انقطاع تروية جزء من الدماغ",
  seizure: "نوبة تشنج — تفريغ كهربائي مفاجئ بالدماغ",
  epilepsy: "صرع — استعداد مزمن للنوبات المتكررة",
  meningitis: "التهاب السحايا — عدوى أغشية الدماغ والنخاع",
  coma: "غيبوبة — فقدان وعي عميق لا يستجيب للمثيرات",
  dementia: "خرف — تدهور مزمن للوظائف المعرفية",
  fracture: "كسر عظمي",
  osteoarthritis: "فُصال عظمي — تآكل غضروفي تنكسي",
  osteoporosis: "هشاشة عظام — نقص كثافة العظم",
  anemia: "فقر الدم — نقص هيموغلوبين (<12 جم/دل تقريبًا)",
  leukemia: "ابيضاض الدم — سرطان خلايا الدم",
  hemoglobin: "هيموغلوبين — بروتين نقل الأكسجين بكريات الدم",
  platelets: "صفيحات دموية — مسؤولة عن الإرقاء الأولي",
  coagulation: "تخثر الدم",
  fibrinolysis: "إذابة الجلطة",
  "blood pressure": "ضغط الدم — انقباضي/انبساطي mmHg",
  pulse: "نبض",
  fever: "حمّى — حرارة مركزية ≥38°م",
  hypothermia: "انخفاض حرارة الجسم <35°م",
  dehydration: "جفاف — نقص ماء وأملاح الجسم",
  overdose: "جرعة زائدة/تسمم دوائي",
  antidote: "ترياق — مضاد سمية نوعي",
  toxicity: "سمية — أذية جرعية للدواء",
  "side effect": "أثر جانبي متوقع ضمن مدى الجرعة",
  "adverse effect": "تأثير ضار — يشمل الجانبي والتحسسي والسمي",
  "first pass metabolism": "استقلاب المرور الأول — الكبد يحط المادة قبل الجهازية",
  bioavailability: "توافر حيوي — النسبة الواصلة للدورة الجهازية",
  "half life": "عمر النصف — زمن هبوط تركيز الدواء للنصف",
  receptor: "مستقبل — بروتين يرتبط به الناقل/الدواء ليبدأ الأثر",
  agonist: "ناهض — ينشط المستقبل",
  antagonist: "مضاد — يثبط المستقبل دون تنشيطه",
  "loading dose": "جرعة تحميلية — لبلوغ التركيز العلاجي سريعًا",
  "maintenance dose": "جرعة صيانة — تحافظ على التركيز الثابت",
  contraindication: "مضاد استطباب — حالة يُمنع فيها الدواء/الإجراء",
  indication: "استطباب — سبب استخدام الدواء/الإجراء",
  biopsy: "خزعة — أخذ نسيج للفحص المجهري",
  prognosis_factor: "", // placeholder never shown
  ultrasound: "موجات فوق صوتية — تصوير آمن بلا إشعاع",
  "ct scan": "أشعة مقطعية — مقاطع محورية بالأشعة السينية",
  mri: "رنين مغناطيسي — تصوير أنسجة رخوة بلا إشعاع مؤين",
  "x-ray": "أشعة سينية بسيطة",
  ecg: "تخطيط القلب — يسجل النشاط الكهربائي للقلب",
  eeg: "تخطيط الدماغ الكهربائي",
  "complete blood count": "صورة دم كاملة (CBC)",
  electrolytes: "شوارد الدم — صوديوم/بوتاسيوم/كالسيوم…",
  sodium: "صوديوم (Na⁺) — أهم شاردة خارج الخلية (135–145)",
  potassium: "بوتاسيوم (K⁺) — أهم شاردة داخل الخلية (3.5–5)",
  calcium: "كالسيوم (Ca²⁺) — عظام وانقباض ونقل عصبي",
  acidosis: "حماض — pH الدم < 7.35",
  alkalosis: "قلاء — pH الدم > 7.45",
  "respiratory failure": "فشل تنفسي — عجز التروية أو طرح CO₂",
  intubation: "تنبيب رغامي — تأمين ممر هوائي نهائي",
  ventilation: "تهوية ميكانيكية",
  defibrillation: "صدمة كهربائية لإنهاء الرجفان البطيني",
  cpr: "إنعاش قلبي رئوي — ضغطات صدر + تهوية",
  triage: "فرز طبي — أولوية العلاج حسب الخطورة",
};

/** Longest-first term list so multi-word terms win over their prefixes. */
export const GLOSSARY_TERMS = Object.keys(MEDICAL_GLOSSARY)
  .filter((k) => MEDICAL_GLOSSARY[k])
  .sort((a, b) => b.length - a.length);

export function glossaryRegex() {
  const escaped = GLOSSARY_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

/**
 * Wraps glossary terms inside a PLAIN escaped-text fragment (never inside
 * tags) with a tooltip span. Used by FormattedInlineText as the last pass.
 */
export function wrapGlossaryTerms(htmlFragment) {
  const re = glossaryRegex();
  return htmlFragment.replace(re, (m) => {
    const def = MEDICAL_GLOSSARY[m.toLowerCase()];
    if (!def) return m;
    return `<span class="bf-glossary-term" data-bf-term="${m.toLowerCase().replace(/"/g, "&quot;")}">${m}</span>`;
  });
}

/**
 * Wraps blur targets inside a PLAIN escaped-text fragment. Blur targets are
 * deliberately narrow so prose stays readable: dose numbers, curated glossary
 * terms, multi-word Latin term phrases, and Capitalized med names. Stop-words
 * and single lowercase prepositions never blur. The container delegates
 * clicks to reveal one token.
 */
export function wrapBlurTargets(htmlFragment) {
  const tok = (m) => `<span class="bf-blur-token" tabindex="0">${m}</span>`;
  let out = htmlFragment;
  // applyOutsideTags skips already-wrapped tokens, so successive passes never
  // nest blur spans inside each other.
  out = applyOutsideTags(out, (t) => t.replace(DOSE_NUMBER_RE, tok));
  out = applyOutsideTags(out, (t) => t.replace(glossaryRegex(), tok));
  out = applyOutsideTags(out, (t) =>
    t.replace(/\b[A-Z][a-z]{3,20}(?:\s+[a-z]{3,20}){1,2}\b/g, (m) =>
      ENGLISH_STOP.has(m.split(/\s+/)[0].toLowerCase()) ? m : tok(m),
    ),
  );
  out = applyOutsideTags(out, (t) =>
    t.replace(/\b[A-Z][a-z-]{3,20}\b/g, (m) => (ENGLISH_STOP.has(m.toLowerCase()) ? m : tok(m))),
  );
  return out;
}

/** Escaped HTML → walk text outside tags applying a wrapper to text parts. */
export function applyOutsideTags(escapedHtml, fn) {
  const parts = String(escapedHtml).split(/(<[^>]+>)/g);
  const stack = [];
  return parts
    .map((part) => {
      if (part.startsWith("<")) {
        const opensProtected =
          /^<(mark|strong|code)\b/.test(part) ||
          /^<span[^>]*class="[^"]*bf-(?:blur-token|glossary-term)/.test(part);
        const closesProtected = /^<\/(mark|strong|code|span)\s*>/.test(part);
        if (opensProtected) stack.push(true);
        else if (closesProtected && stack.length > 0) stack.pop();
        return part;
      }
      return stack.length > 0 ? part : fn(part);
    })
    .join("");
}

export function lookupGlossaryDefinition(term) {
  return MEDICAL_GLOSSARY[String(term || "").toLowerCase()] || "";
}

// ─── 4. Explain-simpler & cram sheet prompts ─────────────────────────────────

export const EXPLAIN_SYSTEM = `أنت أستاذ طب مصري عبقري بتشرح لطالب تعبان قبل الامتحان.
اشرح بالعامية المصرية البسيطة مع الحفاظ على كل المصطلحات الإنجليزية كما هي.
ابدأ بالفكرة في سطر واحد، ثم قياس من الحياة اليومية، ثم لماذا هذا مهم في الامتحان.`;

export function buildExplainPrompt(snippet, contextTitle = "") {
  return `السياق: جزئية «${contextTitle}» من ملخص مذاكرة.
النص المحدد:
"""
${snippet.slice(0, 2200)}
"""
اشرحه بأبسط صورة ممكنة (٤-٦ سطور) ثم أضف: «مثال سريري سريع» في سطرين.`;
}

/** Builds the one-page cram sheet plain text from (depth-filtered) sections. */
export function buildCramSheetPlain(sections, courseTitle = "") {
  const lines = [`⭐ ورقة ليلة الامتحان — ${courseTitle}`, ""];
  for (const sec of sections || []) {
    lines.push(`■ ${sec.title}`);
    for (const item of sec.items || []) {
      if (item.kind === "danger" || item.kind === "pearl") lines.push(`  • ${item.text}`);
      else if (item.kind === "mnemonic") lines.push(`  🧠 ${item.text}`);
      else if (item.kind === "callout") lines.push(`  ⚠ ${item.text}`);
      else if (item.kind === "list") (item.points || []).slice(0, 5).forEach((p) => lines.push(`  - ${p}`));
      else if (item.kind === "card" && DOSAGE_RE.test(item.text || "")) lines.push(`  • ${item.text}`);
    }
    lines.push("");
  }
  return lines.join("\n").slice(0, 30000);
}
