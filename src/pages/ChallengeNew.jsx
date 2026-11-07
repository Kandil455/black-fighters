import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";
import { db } from "@/lib/firebaseDb";
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";

function normalizeChallengeQuestion(q, idx = 0) {
  if (!q || typeof q !== "object") return null;
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const options = rawOptions
    .map((opt) => (typeof opt === "object" ? String(opt.text || opt.label || "").trim() : String(opt || "").trim()))
    .filter(Boolean);
  if (options.length < 2) return null;

  let correctIndex = 0;
  const numericCandidates = [q.correct_index, q.correctIndex, q.correct, q.correctOption];
  let resolved = false;
  for (const cand of numericCandidates) {
    if (typeof cand === "number" && Number.isInteger(cand) && cand >= 0 && cand < options.length) {
      correctIndex = cand;
      resolved = true;
      break;
    }
    if (typeof cand === "string" && /^\d+$/.test(cand.trim())) {
      const parsed = parseInt(cand.trim(), 10);
      if (parsed >= 0 && parsed < options.length) {
        correctIndex = parsed;
        resolved = true;
        break;
      }
    }
  }
  if (!resolved) {
    const answerStr = String(q.correct_answer ?? q.answer ?? "").trim();
    if (/^[A-Fa-f]$/.test(answerStr)) {
      const letterIdx = answerStr.toUpperCase().charCodeAt(0) - 65;
      if (letterIdx >= 0 && letterIdx < options.length) {
        correctIndex = letterIdx;
        resolved = true;
      }
    } else if (answerStr) {
      const matchIdx = options.findIndex(
        (opt) => opt.toLowerCase() === answerStr.toLowerCase() || opt.toLowerCase().includes(answerStr.toLowerCase())
      );
      if (matchIdx >= 0) {
        correctIndex = matchIdx;
      }
    }
  }

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
              const fallbackQs = buildFallbackQuestionsFromCourse(course);
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
          const ch = await base44.entities.Challenge.create(challengePayload);
          challengeId = ch.id;
        }

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
