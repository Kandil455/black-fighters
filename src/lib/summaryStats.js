import { base44 } from "@/api/base44Client";

// تحليل أقسام كورس واحد: عدد الجداول والهايلايت والأقسام
function analyzeCourse(course) {
  const chapters = course.chapters || [];
  let tables = 0, highlights = 0, withTable = 0;
  for (const ch of chapters) {
    const content = ch.content || "";
    const hl = (content.match(/==[^=]+==/g) || []).length;
    const hasTable = /^\s*\|.*\|/m.test(content);
    highlights += hl;
    if (hasTable) { tables += 1; withTable += 1; }
  }
  return {
    chapterCount: chapters.length,
    tables,
    highlights,
    withTable,
  };
}

/**
 * يحسب إحصائيات التلخيصات للمستخدم الحالي:
 * - عدد الملفات المعالجة (الكورسات)
 * - إجمالي الأقسام والجداول والهايلايت
 * - نسبة التميز في استخراج الجداول والمعلومات المهمة
 */
export async function computeSummaryStats() {
  const user = await base44.auth.me();
  const courses = await base44.entities.Course.filter({ created_by_id: user.id }, "-created_date", 500);

  let chapterCount = 0, tables = 0, highlights = 0, chaptersWithTable = 0;
  for (const c of courses) {
    const a = analyzeCourse(c);
    chapterCount += a.chapterCount;
    tables += a.tables;
    highlights += a.highlights;
    chaptersWithTable += a.withTable;
  }

  // نسبة التميز: نسبة الأقسام اللي فيها جداول + كثافة الهايلايت
  const tableRate = chapterCount ? Math.round((chaptersWithTable / chapterCount) * 100) : 0;
  const highlightDensity = chapterCount ? Math.round((highlights / chapterCount) * 10) / 10 : 0;
  // درجة جودة مركّبة (0-100): وزن للجداول وللهايلايت
  const qualityScore = Math.min(100, Math.round(tableRate * 0.5 + Math.min(50, highlightDensity * 10)));

  return {
    filesProcessed: courses.length,
    chapterCount,
    tables,
    highlights,
    tableRate,
    highlightDensity,
    qualityScore,
    recent: courses.slice(0, 5).map((c) => ({
      id: c.id,
      title: c.title,
      ...analyzeCourse(c),
    })),
  };
}