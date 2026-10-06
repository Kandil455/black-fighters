import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Play, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import { invokeSecureFunction } from "@/lib/secureFunctions";

const TIME_OPTIONS = [5, 10, 15, 20];

// Group host selects a quiz and configures time limit to launch session
export default function GroupQuizPicker({ open, onClose, me, group, onStarted }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.StandaloneQuiz.filter({ owner_id: me.id }, "-created_date", 50)
      .then((qs) => setQuizzes((qs || []).filter((q) => (q.questions || []).length > 0)))
      .finally(() => setLoading(false));
  }, [open, me.id]);

  // Server-authoritative: the server verifies the quiz belongs to the host,
  // copies its questions into the session, announces in group chat, and
  // notifies members. The client never writes sessions or group messages.
  const startWith = async (quiz) => {
    setCreating(true);
    try {
      const res = await invokeSecureFunction("social-actions", {
        action: "announceGroupQuiz",
        groupId: group.id,
        quizId: quiz.id,
        timeLimitMinutes: time,
      });
      toast.success(isEn ? "Session created 🎯" : "اتعملت الجلسة 🎯");
      onStarted?.({ id: res?.data?.sessionId, quiz_id: quiz.id, quiz_title: quiz.title });
      onClose();
    } catch (e) {
      toast.error(e.message || (isEn ? "An error occurred" : "حصل خطأ"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir={dir} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEn ? "Group Quiz 🎯" : "كويز جماعي 🎯"}</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {isEn ? "Time Limit" : "الوقت المحدد"}
          </p>
          <div className="flex gap-2">
            {TIME_OPTIONS.map((m) => (
              <button key={m} onClick={() => setTime(m)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${time === m ? "bg-accent/15 text-accent border border-accent/40" : "bg-secondary/40 text-muted-foreground border border-transparent"}`}>
                {m} {isEn ? "min" : "د"}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm font-bold mb-2">{isEn ? "Select a Quiz" : "اختار كويز"}</p>
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : quizzes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            {isEn ? "No quizzes ready — create a quiz from the quizzes page first" : "مفيش كويزات جاهزة — اعمل كويز من صفحة الكويزات الأول"}
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-none">
            {quizzes.map((q) => (
              <button key={q.id} onClick={() => !creating && startWith(q)} disabled={creating}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-primary/10 border border-border transition-colors text-start disabled:opacity-50">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{q.questions.length} {isEn ? "questions" : "سؤال"}</p>
                </div>
                {creating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Play className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}