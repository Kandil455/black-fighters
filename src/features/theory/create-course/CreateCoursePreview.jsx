import { motion } from 'framer-motion';
import { Check, CheckCircle2, Loader2, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudyContent from '@/components/course/StudyContent';
import ChapterCardBrowser from '@/components/course/ChapterCardBrowser';
import CreditCostBadge from '@/components/CreditCostBadge';

export default function CreateCoursePreview({
  preview,
  isEn,
  lastCost,
  saving,
  savedCourseId,
  editingChapters,
  onSave,
  onReset,
  onOpenSaved,
  onPreviewChange,
  onEditingChaptersChange,
}) {
  const updateChapter = (index, field, value) => {
    const chapters = (preview.chapters || []).map((chapter, chapterIndex) => (
      chapterIndex === index ? { ...chapter, [field]: value } : chapter
    ));
    onPreviewChange({ ...preview, chapters });
  };

  return (
    <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {savedCourseId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="text-sm font-black">{isEn ? 'Summary saved successfully in your courses!' : 'تم حفظ هذا الملخص بنجاح في حسابك! 🎉'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onOpenSaved} className="gap-1 bg-emerald-600 font-bold text-white hover:bg-emerald-500">
              {isEn ? 'Open Summary 📖' : 'عرض الملخص 📖'}
            </Button>
            <Button size="sm" variant="outline" onClick={onReset} className="gap-1 border-white/20 font-bold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {isEn ? 'New Summary ➕' : 'إنشاء تلخيص جديد ➕'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs text-muted-foreground hover:text-destructive">
            <RotateCcw className="h-3 w-3" />
            {isEn ? 'Discard & Start New Summary' : 'إلغاء وبدء تلخيص جديد'}
          </Button>
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-primary/20 p-6 glass-card">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">{preview.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preview.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{preview.subject}</span>}
              {preview.level && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{preview.level}</span>}
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"><Zap className="h-3 w-3" /> {preview.chapters?.length} {isEn ? (preview.chapters?.length === 1 ? 'chapter' : 'chapters') : 'فصل'}</span>
              <CreditCostBadge cost={lastCost} />
              {preview.summary_coverage && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${preview.summary_coverage.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {isEn ? 'Coverage' : 'تغطية'} {preview.summary_coverage.score}%
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <Button onClick={onSave} disabled={saving} className={`gap-2 font-bold ${savedCourseId ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : savedCourseId ? (isEn ? 'Saved — Open Summary 📖' : 'تم الحفظ — اضغط لفتحه 📖') : (isEn ? 'Save Summary' : 'احفظ الملخص')}
            </Button>
          </div>
        </div>
      </div>

      <ChapterCardBrowser
        chapters={preview.chapters || []}
        renderEditor={(chapter, index) => (
          <div>
            <div className="mb-3 mt-3 flex items-center justify-between gap-2">
              <input type="text" value={chapter.title} onChange={(event) => updateChapter(index, 'title', event.target.value)} className="flex-1 rounded border-b border-border bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none" dir="auto" placeholder={isEn ? 'Chapter title' : 'عنوان الفصل'} />
              <Button variant="outline" size="sm" onClick={() => onEditingChaptersChange((current) => ({ ...current, [index]: !current[index] }))} className="h-7 shrink-0 text-xs font-bold">
                {editingChapters[index] ? (isEn ? 'View Preview 👁️' : 'عرض التصميم 👁️') : (isEn ? 'Edit ✏️' : 'تعديل ✏️')}
              </Button>
            </div>
            {editingChapters[index] ? (
              <textarea value={chapter.content} onChange={(event) => updateChapter(index, 'content', event.target.value)} className="min-h-[300px] w-full rounded-xl border border-border/50 bg-background/50 p-4 font-mono text-sm text-foreground glass-card focus:border-primary focus:outline-none" dir="auto" placeholder={isEn ? 'Write or edit chapter content here...' : 'اكتب أو عدل محتوى الفصل هنا...'} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2"><StudyContent content={chapter.content} /></div>
            )}
          </div>
        )}
      />

      <div className="mt-6 text-center">
        <Button onClick={onSave} disabled={saving} size="lg" className="gap-2 px-8 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Summary 🎉' : 'احفظ الملخص 🎉')}
        </Button>
      </div>
    </motion.div>
  );
}
