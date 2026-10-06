import { calculateYouTubeCost } from '@/lib/economyCatalog';

export const STEP_LABELS_AR = ['جاري سحب الترجمة من يوتيوب... 🔍', 'الذكاء الاصطناعي يحلل الفسيولوجيا والمفاهيم الطبية... 🩺', 'بناء بنك الأسئلة السريرية (MCQs) وجداول المقارنة... 📊', 'تنسيق المذكرة بالاتجاه المزدوج (RTL / LTR)... ⚡'];
export const STEP_LABELS_EN = ['Extracting lecture transcript from YouTube... 🔍', 'AI analyzing clinical physiology & core concepts... 🩺', 'Generating clinical MCQ question bank & comparison tables... 📊', 'Formatting bilingual dual-direction notes (RTL / LTR)... ⚡'];

export function parseYouTubeTime(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parts = String(value).trim().split(':').map(Number);
  if (parts.length > 1 && parts.every(Number.isFinite)) return parts.reduce((seconds, part) => seconds * 60 + part, 0);
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function getEstimatedYouTubeCredits({ startTime, endTime, mode, quizCount }) {
  const startSeconds = parseYouTubeTime(startTime);
  const endSeconds = parseYouTubeTime(endTime);
  const durationSeconds = endSeconds !== null && startSeconds !== null && endSeconds > startSeconds ? endSeconds - startSeconds : 3600;
  return calculateYouTubeCost({ durationSeconds, mode, quizCount: Number(quizCount) || 10 });
}
