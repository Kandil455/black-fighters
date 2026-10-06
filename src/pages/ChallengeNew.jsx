import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";
import { db } from "@/lib/firebaseDb";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

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

        let quiz = await base44.entities.StandaloneQuiz.get(cleanQuizId);
        if (!quiz) {
          const list = await base44.entities.StandaloneQuiz.filter({ id: cleanQuizId });
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
        if (!quiz && db) {
          try {
            const snap = await getDoc(doc(db, "courses", cleanQuizId));
            if (snap.exists()) {
              const c = snap.data();
              quiz = { id: cleanQuizId, title: `تحدي: ${c.title || "الكورس"}`, questions: [] };
            }
          } catch {}
        }

        const challengePayload = {
          quiz_id: cleanQuizId,
          quiz_title: quiz?.title || quiz?.name || "تحدي كويز",
          quiz_questions: Array.isArray(quiz?.questions) ? quiz.questions : [],
          host_id: me.id,
          host_name: me.full_name || me.email || "المضيف",
          time_limit_minutes: 10,
          status: "waiting",
          participants: [{
            user_id: me.id,
            user_name: me.full_name || me.email || "المضيف",
            score: 0,
            total: 0,
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