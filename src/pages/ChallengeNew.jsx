import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";
import { db } from "@/lib/firebaseDb";
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { reconcileQuestionAnswer } from "@/lib/quizQuality";

function normalizeChallengeQuestion(rawQ, idx = 0) {
  if (!rawQ || typeof rawQ !== "object") return null;
  const q = reconcileQuestionAnswer(rawQ);
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const options = rawOptions
    .map((opt) => (typeof opt === "object" ? String(opt.text || opt.label || "").trim() : String(opt || "").trim()))
    .filter(Boolean);
  if (options.length < 2) return null;

  const correctIndex =
    typeof q.correct_index === "number" && q.correct_index >= 0 && q.correct_index < options.length
      ? q.correct_index
      : 0;

  return {
    question: String(q.question || q.q || q.question_text || `سؤال ${idx + 1}`).trim(),
    options,
    correct_index: correctIndex,
    explanation: String(q.explanation || q.exp || "").trim(),
  };
}

function buildFallbackQuestionsFromCourse(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const facts = [];
  for (const ch of chapters) {
    const title = String(ch?.title || "محور المحاضرة").replace(/[#*_`]/g, "").trim();
    const lines = String(ch?.content || "")
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.)#>\s]+/, "").replace(/==\w+:([^=]+)==/g, "$1").replace(/\*\*/g, "").trim())
      .filter((line) => line.length >= 30 && line.length <= 220 && !line.startsWith("|"));
    for (const line of lines.slice(0, 4)) {
      facts.push({ title, fact: line });
    }
  }
  if (facts.length < 4) return [];
  return facts.slice(0, 10).map((item, idx) => {
    const distractors = facts
      .filter((_, j) => j !== idx)
      .slice(0, 3)
      .map((d) => d.fact);
    const allOptions = [item.fact, ...distractors];
    const correctPos = idx % allOptions.length;
    const rotated = [...allOptions];
    const temp = rotated[0];
    rotated[0] = rotated[correctPos];
    rotated[correctPos] = temp;
    return {
      question: `أي من العبارات التالية صحيحة بخصوص «${item.title}»؟`,
      options: rotated,
      correct_index: correctPos,
      explanation: item.fact,
    };
  });
}

export default function ChallengeNew() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, redirectToLogin } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";
  const created = useRef(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) { redirectToLogin(window.location.pathname); return; }
    if (created.current) return;
    created.current = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const cleanQuizId = decodeURIComponent(quizId || "").trim();

        let quiz = await base44.entities.StandaloneQuiz.get(cleanQuizId).catch(() => null);
        if (!quiz) {
          const list = await base44.entities.StandaloneQuiz.filter({ id: cleanQuizId }).catch(() => []);
          quiz = list?.[0];
        }
        if (!quiz && db) {
          try {
            const snap = await getDoc(doc(db, "standaloneQuizzes", cleanQuizId));
            if (snap.exists()) quiz = { id: snap.id, ...snap.data() };
          } catch {}
        }
        if (!quiz && db) {
          try {
            const snap = await getDocs(query(collection(db, "standaloneQuizzes"), where("id", "==", cleanQuizId)));
            if (!snap.empty) quiz = { id: snap.docs[0].id, ...snap.docs[0].data() };
          } catch {}
        }
        if (!quiz) {
          try {
            const content = await base44.entities.GeneratedContent.get(cleanQuizId, "quiz");
            if (content) {
              const raw = content.content || content.data;
              const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
              quiz = { id: cleanQuizId, title: content.metadata?.title || "كويز المحاضرة", questions: parsed?.questions || (Array.isArray(parsed) ? parsed : []) };
            }
          } catch {}
        }
        if (!quiz && db) {
          try {
            const snap = await getDocs(query(
              collection(db, "generatedContent"),
              where("course_id", "==", cleanQuizId),
              where("content_type", "==", "quiz")
            ));
            if (!snap.empty) {
              const d = snap.docs[0].data();
              const parsed = typeof d.content === "string" ? JSON.parse(d.content) : d.content;
              quiz = { id: cleanQuizId, title: "كويز الكورس", questions: parsed?.questions || (Array.isArray(parsed) ? parsed : []) };
            }
          } catch {}
        }
        if ((!quiz || !quiz.questions || quiz.questions.length === 0) && db) {
          try {
            const snap = await getDocs(query(
              collection(db, "standaloneQuizzes"),
              where("course_id", "==", cleanQuizId)
            ));
            if (!snap.empty) {
              const d = snap.docs[0].data();
              quiz = { id: snap.docs[0].id, ...d };
            }
          } catch {}
        }
        if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
          try {
            let course = await base44.entities.Course.get(cleanQuizId).catch(() => null);
            if (!course && db) {
              const snap = await getDoc(doc(db, "courses", cleanQuizId));
              if (snap.exists()) course = { id: snap.id, ...snap.data() };
            }
            if (course) {
              const courseFullText = (course.chapters || []).map((c) => `${c.title || ""}\n${c.content || ""}`).join("\n\n");
              let cachedBankQs = [];
              try {
                const { getCachedQuestionBank } = await import("@/lib/smartCache");
                cachedBankQs = await getCachedQuestionBank(courseFullText, course.language === "en" ? "en" : "ar");
              } catch {}
              const fallbackQs = cachedBankQs.length >= 3 ? cachedBankQs.slice(0, 10) : buildFallbackQuestionsFromCourse(course);
              quiz = {
                id: cleanQuizId,
                title: `تحدي: ${course.title || "الكورس"}`,
                questions: fallbackQs,
              };
            }
          } catch {}
        }

        const normalizedQuestions = (Array.isArray(quiz?.questions) ? quiz.questions : [])
          .map((q, idx) => normalizeChallengeQuestion(q, idx))
          .filter(Boolean);

        const challengePayload = {
          quiz_id: cleanQuizId,
          quiz_title: quiz?.title || quiz?.name || "تحدي كويز",
          quiz_questions: normalizedQuestions,
          host_id: me.id,
          host_name: me.full_name || me.email || "المضيف",
          time_limit_minutes: 10,
          status: "waiting",
          participants: [{
            user_id: me.id,
            user_name: me.full_name || me.email || "المضيف",
            score: 0,
            total: normalizedQuestions.length || 0,
            percentage: 0,
            time_spent_seconds: 0,
            finished: false,
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let challengeId = null;
        if (db) {
          try {
            const colRef = collection(db, "challenges");
            const docRef = await addDoc(colRef, challengePayload);
            challengeId = docRef.id;
          } catch (createErr) {
            console.warn("Direct Firestore challenge addDoc error:", createErr);
          }
        }
        if (!challengeId) {
          try {
            const ch = await base44.entities.Challenge.create(challengePayload);
            challengeId = ch?.id;
          } catch (fallbackErr) {
            console.warn("Entity challenge create fallback:", fallbackErr);
          }
        }
        if (!challengeId) {
          challengeId = `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        }

        try {
          localStorage.setItem(
            `bf_challenge_mirror_${challengeId}`,
            JSON.stringify({ id: challengeId, ...challengePayload })
          );
        } catch {}

        navigate(`/challenge/${challengeId}`, { replace: true });
      } catch (e) {
        console.error("ChallengeNew error:", e);
        toast.error(isEn ? "Error creating challenge" : "حصل خطأ في إنشاء التحدّي");
        navigate("/quizzes");
      }
    })();
  }, [quizId, navigate, isAuthenticated, isLoadingAuth, redirectToLogin, isEn]);

  return <PageLoader message={isEn ? "Preparing challenge arena..." : "بنجهّز غرفة التحدّي..."} />;
}
