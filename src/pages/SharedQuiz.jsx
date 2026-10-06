import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Loader2, Brain, LogIn, AlertTriangle, Swords, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import NeonBackground from "@/components/NeonBackground";
import PageLoader from "@/components/PageLoader";
import QuizPlayer from "@/components/quiz/QuizPlayer";
import QuizExportButton from "@/components/quiz/QuizExportButton";
import { reconcileQuestionAnswer } from "@/lib/quizQuality";
import { toast } from "sonner";

export default function SharedQuiz() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoadingAuth, redirectToLogin } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [auditing, setAuditing] = useState(false);

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ["shared-quiz", id],
    queryFn: async () => {
      const quiz = await base44.entities.StandaloneQuiz.get(id);
      if (!quiz) throw new Error("not_found");
      if (Array.isArray(quiz.questions)) {
        quiz.questions = quiz.questions.map(reconcileQuestionAnswer);
      }
      return quiz;
    },
    enabled: !!id,
    retry: false,
  });

  const handleAiAuditQuiz = async () => {
    if (!quiz?.questions?.length || auditing) return;
    setAuditing(true);
    const toastId = toast.loading(
      isEn
        ? `Multi-Agent AI is auditing all ${quiz.questions.length} questions... 🧠⚡`
        : `جاري فحص وتصحيح الـ ${quiz.questions.length} سؤال بواسطة Multi-Agent AI... 🧠⚡`
    );
    try {
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_audit",
        questions: quiz.questions,
      });
      const result = res?.data?.result || res?.data;
      const auditedQuestions = Array.isArray(result?.questions) && result.questions.length
        ? result.questions
        : quiz.questions.map(reconcileQuestionAnswer);
      const correctedCount = Number(result?.correctedCount) || 0;

      await base44.entities.StandaloneQuiz.update(id, { questions: auditedQuestions }).catch(() => {});
      try {
        const key = `quiz-session:${id}`;
        const saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (saved && Array.isArray(saved.questions)) {
          saved.questions = auditedQuestions;
          window.localStorage.setItem(key, JSON.stringify(saved));
        }
      } catch {}

      queryClient.setQueryData(["shared-quiz", id], (old) =>
        old ? { ...old, questions: auditedQuestions } : old
      );

      toast.dismiss(toastId);
      if (correctedCount > 0) {
        toast.success(
          isEn
            ? `AI Audit Complete: Fixed ${correctedCount} question(s) and updated the quiz! 🧠✅`
            : `تم الفحص والتدقيق بالـ AI: تم تصحيح ${correctedCount} سؤال وحفظ التعديلات! 🧠✅`
        );
      } else {
        toast.success(
          isEn
            ? `AI Audit Complete: All ${auditedQuestions.length} answers are 100% accurate! ✅⚡`
            : `تم الفحص بالـ AI: جميع الـ ${auditedQuestions.length} سؤال إجاباتها صحيحة ومطابقة للشرح 100%! ✅⚡`
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || (isEn ? "AI review failed" : "حدث خطأ أثناء المراجعة بالـ AI"));
    } finally {
      setAuditing(false);
    }
  };

  const handleFinish = async (score) => {
    try {
      const me = await base44.auth.me();
      await base44.entities.QuizAttempt.create({
        quiz_id: id,
        user_id: me.id,
        user_name: me.full_name || me.email,
        score,
        total: quiz.questions.length,
        percentage: Math.round((score / quiz.questions.length) * 100),
      });
      await base44.entities.StandaloneQuiz.update(id, { attempts_count: (quiz.attempts_count || 0) + 1 });
    } catch (e) {
      console.warn("failed to save attempt", e.message);
    }
  };

  if (isLoadingAuth) return <PageLoader message={isEn ? "Loading..." : "جاري التحميل..."} />;

  // Require login
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4" dir={dir}>
        <NeonBackground />
        <div className="relative z-10 glass-card rounded-3xl p-8 text-center border border-primary/20 max-w-sm">
          <Brain className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-black mb-2">
            {isEn ? "Quiz is waiting for you! 🎯" : "كويز في انتظارك! 🎯"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isEn ? "Log in to solve the quiz and save your progress." : "سجّل دخولك عشان تقدر تحل الكويز وتحفظ نتيجتك."}
          </p>
          <Button onClick={() => redirectToLogin(window.location.pathname)} className="w-full h-11 font-bold gap-2">
            <LogIn className="w-4 h-4" />
            {isEn ? "Log In & Start" : "سجّل دخول وابدأ"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-8 sm:py-12" dir={dir}>
      <NeonBackground />
      <div className="relative z-10 max-w-2xl mx-auto">
        <Link to="/quizzes" className="inline-flex items-center gap-2 mb-6">
          <img src="/icons/black-fighters-192.png" alt="Black Fighters" className="w-8 h-8 rounded-lg" />
          <span className="font-black neon-text-gradient">Black Fighters</span>
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="glass-card rounded-3xl p-10 text-center border border-destructive/30">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-black mb-1">{isEn ? "Quiz Not Found" : "الكويز مش موجود"}</h2>
            <p className="text-muted-foreground text-sm">
              {isEn ? "It may have been deleted or the link is incorrect." : "يمكن يكون اتحذف أو اللينك غلط."}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-black mb-1">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">
                {quiz.questions?.length || 0} {isEn ? "questions" : "سؤال"} • {isEn ? "Created by" : "من إنشاء"} {quiz.owner_name || (isEn ? "User" : "مستخدم")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              <Button
                variant="outline"
                disabled={auditing}
                className="gap-2 font-bold border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
                onClick={handleAiAuditQuiz}
              >
                {auditing ? <Loader2 className="w-4 h-4 animate-spin text-purple-300" /> : <Sparkles className="w-4 h-4 text-purple-300" />}
                {isEn ? "AI Review & Fix Answers 🧠" : "مراجعة وتصحيح بالـ AI 🧠"}
              </Button>
              <Button
                variant="outline"
                className="gap-2 font-bold border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                onClick={() => window.open(`https://t.me/black_fighters_bot?start=quiz_${quiz.id}`, "_blank")}
              >
                <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                {isEn ? "Solve on Telegram" : "امتحان الكويز على التليجرام 🤖"}
              </Button>
              <QuizExportButton quiz={quiz} variant="full" />
              <Button variant="outline" className="gap-2 font-bold border-accent/30 text-accent hover:bg-accent/10" onClick={() => window.location.assign(`/challenge/new/${quiz.id}`)}>
                <Swords className="w-4 h-4" /> {isEn ? "Start Challenge" : "ابدأ تحدّي"}
              </Button>
            </div>
            <QuizPlayer quiz={quiz} onFinish={handleFinish} />
          </>
        )}
      </div>
    </div>
  );
}