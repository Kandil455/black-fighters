import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, ChevronRight, Loader2, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const TODAY_IDX = new Date().getDay();

export default function StudyPlanPanel() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["plan-courses"],
    queryFn: () => base44.entities.Course.filter({}, "-created_date", 50),
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ["plan-quiz"],
    queryFn: () => base44.entities.QuizResult.filter({}, "-created_date", 100),
  });

  const generatePlan = async () => {
    if (!courses.length) { toast.error("ضيف كورسات الأول!"); return; }
    setLoading(true);
    try {
      const weakSubjects = courses.filter(c => {
        const results = quizResults.filter(r => r.course_id === c.id);
        if (!results.length) return true;
        const avg = results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length;
        return avg < 70;
      }).map(c => c.title);

      const prompt = `أنت مساعد تخطيط المذاكرة. بناءً على هذه البيانات:
الكورسات: ${courses.map(c => c.title).join(', ')}
المواد الضعيفة (أقل من 70%): ${weakSubjects.join(', ') || 'لا يوجد'}
اليوم: ${DAYS[TODAY_IDX]}

اعمل خطة مذاكرة أسبوعية ذكية بصيغة JSON:
{
  "week_summary": "جملة تشجيعية واحدة",
  "daily_hours": 2,
  "days": [
    {
      "day": "الأحد",
      "focus": "اسم المادة",
      "tasks": ["مهمة 1", "مهمة 2"],
      "duration_min": 90,
      "priority": "high|medium|low"
    }
  ],
  "tips": ["نصيحة 1", "نصيحة 2"]
}
فقط 5 أيام (الأحد للخميس). ركز على المواد الضعيفة.`;

      const res = await base44.functions.invoke("generateText", { prompt });
      let generatedText = res.trim();
      generatedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
      setPlan(JSON.parse(generatedText));
      setExpanded(true);
    } catch (err) {
      toast.error("حدث خطأ أثناء إعداد خطة المذاكرة — حاول ثانية");
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (p) =>
    p === 'high' ? 'text-destructive border-destructive/30 bg-destructive/5'
    : p === 'medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'
    : 'text-muted-foreground border-border bg-secondary/30';

  return (
    <div className="glass-card rounded-3xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <h2 className="font-bold text-base">خطة المذاكرة الذكية 🗓️</h2>
        </div>
        <Button size="sm" onClick={generatePlan} disabled={loading} className="gap-2 text-xs">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {plan ? "جدّد الخطة" : "ولّد خطة"}
        </Button>
      </div>

      {!plan && !loading && (
        <div className="text-center py-6 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">اضغط "ولّد خطة" والـ AI هيعمل لك خطة مذاكرة أسبوعية مخصوصة</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
          <p className="text-sm text-muted-foreground">الـ AI بيحلل نتايجك وبيعمل خطة...</p>
        </div>
      )}

      <AnimatePresence>
        {plan && expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {plan.week_summary && (
              <div className="glass-card rounded-2xl p-3 border border-accent/20 bg-accent/5 mb-4">
                <p className="text-sm font-medium text-accent">✨ {plan.week_summary}</p>
              </div>
            )}
            <div className="space-y-2">
              {(plan.days || []).map((d, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border p-3 ${priorityColor(d.priority)} ${d.day === DAYS[TODAY_IDX] ? 'ring-1 ring-primary/40' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{d.day} {d.day === DAYS[TODAY_IDX] ? "⭐ اليوم" : ""}</span>
                    <span className="text-xs opacity-70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {d.duration_min} دقيقة
                    </span>
                  </div>
                  <p className="text-xs font-semibold mb-1 opacity-80">{d.focus}</p>
                  <ul className="space-y-0.5">
                    {(d.tasks || []).map((t, ti) => (
                      <li key={ti} className="text-xs opacity-70 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            {plan.tips?.length > 0 && (
              <div className="mt-4 space-y-1">
                {plan.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-yellow-400 shrink-0">💡</span> {tip}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {plan && (
        <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="w-full mt-2 text-xs text-muted-foreground">
          {expanded ? "إخفاء الخطة" : "عرض الخطة"}
        </Button>
      )}
    </div>
  );
}