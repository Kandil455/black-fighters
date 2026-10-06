// مصدر مركزي واحد لكل تكاليف العمليات بالكريدت في التطبيق.
// أي تعديل في الأسعار يتم من هنا فقط.

export const CREDIT_COSTS = {
  summary: 2,             // تلخيص ملف أو نص
  quiz_base: 1,           // أساس توليد الكويز (لكل 5 أسئلة)
  quiz_extract: 2,        // استخراج أسئلة جاهزة من ملف
  image_extract: 0,       // استخراج الصور وفلترتها محلياً (مجاني 100%)
  practical_quiz_step: 1, // 1 كريدت لكل 5 أسئلة في الكويز العملي (منصف ومنطقي)
  ai_summary_edit: 3,     // تعديل حقيقي على ملف التلخيص بواسطة الـ AI (شات مجاني)
  ai_quiz_from_summary: 1, // إنشاء كويز حقيقي من الملخص (1 كريدت لكل 5 أسئلة)
};

// تكلفة تعديل الـ AI على ملف التلخيص — ثابتة ومعلنة للمستخدم قبل التنفيذ
export const AI_SUMMARY_EDIT_COST = CREDIT_COSTS.ai_summary_edit;
// تكلفة إنشاء كويز حقيقي من الملخص (5 أسئلة)
export const AI_QUIZ_FROM_SUMMARY_COST = CREDIT_COSTS.ai_quiz_from_summary;

// تكلفة كويز الوكيل على السيرفر لكل كتلة 5 أسئلة — نفس قيمة العميل لضمان تطابق العرض والخصم
export const AI_QUIZ_PER_5_QUESTIONS_COST = CREDIT_COSTS.ai_quiz_from_summary;

// تكلفة التلخيص
export const SUMMARY_CREDIT_COST = CREDIT_COSTS.summary;

// تكلفة الكويز النظري حسب عدد الأسئلة أو وضع الاستخراج
export function getQuizCost(count, extractMode) {
  if (extractMode) return CREDIT_COSTS.quiz_extract;
  return Math.max(1, Math.ceil((Number(count) || 10) / 5));
}

/**
 * حساب تكلفة كويز الصور العملي (OSCE / OSPE) بدقة وفق تسعيرة ألفا:
 * كل 5 أسئلة بـ 2.5 كريدت (أي كل سؤالين بـ 1 كريدت، أو 0.5 كريدت لكل سؤال).
 */
export function getPracticalQuizCost(totalQuestions) {
  const count = Math.max(1, Number(totalQuestions) || 10);
  const cost = count * 0.5;
  return Math.round(cost * 10) / 10;
}

/**
 * حساب تكلفة استخراج وتوليد كويزات الصور بشكل تناسبي عادل:
 * الاستخراج والفلترة الهيوريستيك مجانية 100%.
 * تكلفة الكويز تعتمد على عدد الأسئلة المطلوبة (1 كريدت لكل 5 أسئلة).
 */
export function getImageExtractCost({ imageCount = 0, questionCount = 0, withQuiz = false }) {
  if (!withQuiz) return 0;
  const count = questionCount > 0 ? questionCount : (imageCount > 0 ? imageCount : 10);
  return getPracticalQuizCost(count);
}

/**
 * حساب تكلفة قراءة الصور واستخراج النصوص بالذكاء الاصطناعي (AI Vision OCR):
 * نسبة وتناسب عادلة جداً حتى لا تكون مكلفة على طالب الأوسكي:
 * 1 كريدت لكل 5 صور (أي 0.2 كريدت للصورة الواحدة، بحد أدنى 1 كريدت للعملية).
 * مجانية 100% لأصحاب باقة برو والآدمن.
 */
export function getImageOcrCost(imageCount = 1) {
  const count = Math.max(1, Number(imageCount) || 1);
  return Math.max(1, Math.ceil(count / 5));
}