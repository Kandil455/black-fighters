import { parseAIJson } from '@/lib/courseChunking';

export async function generateCourseChunk(base44, prompt) {
  const fullPrompt = `${prompt}\n\nيجب أن تكون الإجابة النهائية عبارة عن كود JSON فقط بدون أي نصوص إضافية أو علامات Markdown (مثل \`\`\`json)، ويجب أن يحتوي على هذا الهيكل:
{
  "title": "عنوان",
  "description": "وصف",
  "subject": "مادة",
  "level": "مستوى",
  "language": "لغة",
  "doc_type": "نوع",
  "chapters": [ { "title": "عنوان القسم", "content": "محتوى القسم" } ]
}`;
  const response = await base44.functions.invoke('generateText', { prompt: fullPrompt });
  const parsed = parseAIJson(response);
  if (!Array.isArray(parsed?.chapters) || !parsed.chapters.length) {
    throw new Error('الـ AI رجع نتيجة بدون أقسام');
  }
  return parsed;
}
