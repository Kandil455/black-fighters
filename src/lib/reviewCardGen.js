import { base44 } from "@/api/base44Client";

// تنظيف نص الماركداون/الهايلايت من الرموز عشان البطاقة تبقى نظيفة
function clean(text = "") {
  return String(text)
    .replace(/==(?:green|yellow|cyan|orange|red):([^=]+)==/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[#>*`_|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// استخرج أهم النقاط من محتوى القسم لتكوين وجه/ظهر البطاقة
function extractKeyPoints(content = "") {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const points = [];
  for (const line of lines) {
    // النقاط (bullets) أو الجمل اللي فيها تعريف
    if (/^[-*•]/.test(line) || /[:：]/.test(line)) {
      const c = clean(line);
      if (c.length >= 15 && c.length <= 220) points.push(c);
    }
  }
  return points;
}

/**
 * يحوّل أقسام التلخيص لبطاقات مراجعة (سؤال/جواب) ويحفظها.
 * كل قسم → بطاقة: الوجه = عنوان القسم، الظهر = أهم نقطه فيه.
 * كمان أهم النقاط اللي فيها تعريف → بطاقات إضافية.
 */
export async function generateReviewCardsFromCourse(course, chapters = []) {
  const cards = [];
  const due = new Date().toISOString().split("T")[0];

  for (const ch of chapters) {
    const title = clean(ch.title || "");
    const points = extractKeyPoints(ch.content || "");
    if (!title) continue;

    // بطاقة رئيسية للقسم
    if (points.length) {
      cards.push({
        course_id: course.id,
        course_title: course.title,
        front: `اشرح: ${title}`,
        back: points.slice(0, 3).join(" • "),
        box: 1,
        due_date: due,
      });
    }

    // بطاقات من النقاط اللي على شكل (مصطلح: تعريف)
    for (const p of points.slice(0, 4)) {
      const m = p.match(/^(.{3,60}?)[:：]\s*(.{10,})$/);
      if (m) {
        cards.push({
          course_id: course.id,
          course_title: course.title,
          front: clean(m[1]),
          back: clean(m[2]),
          box: 1,
          due_date: due,
        });
      }
    }
  }

  // حد أقصى معقول للبطاقات لكل تلخيص
  const limited = cards.slice(0, 30);
  for (const card of limited) {
    await base44.entities.ReviewCard.create(card);
  }
  return limited.length;
}