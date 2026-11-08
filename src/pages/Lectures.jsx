import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Settings } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebaseDb";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

import copy from "@/features/lectures/lib/lectures.ar";
import {
  prepareLecture,
  estimateUploadBytes,
} from "@/features/lectures/lib/audioPipeline";
import {
  estimateTranscribeSeconds,
  formatEtaAr,
  quoteLectureCredits,
} from "@/features/lectures/lib/config";
import { lectureApi } from "@/features/lectures/lib/lectureApi";
import { buildDocModel } from "@/features/lectures/ui/buildDocModel";
import { SectionCard, GapCard, BidiText, SourceChip } from "@/features/lectures/ui/blocks";
import { buildStudyView } from "@/features/lectures/ai/studyAndSummary";
import { buildDynamicStudySheet } from "@/features/lectures/ai/dynamicLectureBuilder";
import { downloadStandaloneHtml } from "@/features/lectures/export/exportHtml";
import { downloadTextExport, renderPlainText } from "@/features/lectures/export/exportText";
import { exportLecturePowerPoint } from "@/features/lectures/export/exportPowerPoint";
import {
  downloadPostMortemStudyHtml,
  printPostMortemStudyHtml,
} from "@/features/lectures/export/postMortemStudyHtml";
import { PrintView } from "@/features/lectures/export/PrintView";
import "@/features/lectures/styles/lecture-doc.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AiModelsAndProvidersManager from "@/components/settings/AiModelsAndProvidersManager";
import ModernQuizView from "@/components/course/ModernQuizView";
import { base44 } from "@/api/base44Client";
import { generateText } from "@/lib/ai";
import { extractTextFromFile } from "@/lib/fileProcessing";
import { extractQuickFiguresFromFile } from "@/lib/summaryFigures";

const ACCEPT =
  "audio/*,video/mp4,video/quicktime,video/webm,video/x-matroska,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.amr,.3gp,.webm,.mp4,.mov,.mkv";

function bytesLabel(n) {
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} ميجا` : `${Math.round(n / 1024)} كيلو`;
}

function minutesLabel(sec) {
  const m = Math.max(1, Math.round((Number(sec) || 0) / 60));
  return `${m} دقيقة`;
}

function StatusPill({ status }) {
  const map = {
    draft: "bg-white/10 text-[#9aa4b2]",
    queued: "bg-white/10 text-[#9aa4b2]",
    preparing_audio: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    uploading_chunks: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    transcribing: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    merging: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    organizing: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    ready: "bg-[#19f08c]/15 text-[#19f08c] border border-[#19f08c]/35",
    partial_ready: "bg-amber-500/15 text-amber-300 border border-amber-500/35",
    failed: "bg-rose-500/15 text-rose-300 border border-rose-500/35",
    cancelled: "bg-white/10 text-[#9aa4b2]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || map.draft}`}>
      {copy.status[status] || status}
    </span>
  );
}

export default function Lectures() {
  const { profile, isLoadingAuth } = useAuth();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isPrintRoute = location.pathname.endsWith("/print");

  const [jobs, setJobs] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [phase, setPhase] = useState("idle"); // idle|prepare|confirm|upload|transcribe|done
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [glossaryInput, setGlossaryInput] = useState("");
  const [prep, setPrep] = useState(null);
  const [activeJobId, setActiveJobId] = useState(params.id || null);
  const [activeJob, setActiveJob] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [viewerData, setViewerData] = useState(null);

  // Reader controls (Section 16.3)
  const [activeTab, setActiveTab] = useState("transcript"); // transcript | study | summary | export
  const [showOfftopic, setShowOfftopic] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [highlightTerms, setHighlightTerms] = useState(true);
  const [fontSize, setFontSize] = useState("md"); // sm | md | lg
  const [searchQuery, setSearchQuery] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Study notes & summary state (Section 13)
  const [studyNotes, setStudyNotes] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLevel, setSummaryLevel] = useState("detailed"); // detailed | medium | quick
  const [aiWorking, setAiWorking] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Live microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Copy full transcript & PPTX export state
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [pptxBusy, setPptxBusy] = useState(false);

  // Main Website Quiz Engine state (uses platform's StandaloneQuiz + ModernQuizView)
  const [lectureQuizCount, setLectureQuizCount] = useState(15);
  const [lectureQuizDifficulty, setLectureQuizDifficulty] = useState("mixed");
  const [lectureQuizGenerating, setLectureQuizGenerating] = useState(false);
  const [lectureQuizRecord, setLectureQuizRecord] = useState(null);
  const [lectureQuizTelegramBusy, setLectureQuizTelegramBusy] = useState(false);
  const [lectureQuizTelegramMsg, setLectureQuizTelegramMsg] = useState("");

  // Lecture AI Assistant state
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);

  // Doctor PDF / Slides / Figures integration & Post-Mortem Study Sheet state
  const [doctorFileName, setDoctorFileName] = useState("");
  const [doctorPdfText, setDoctorPdfText] = useState("");
  const [doctorFigures, setDoctorFigures] = useState([]);
  const [includeDoctorFigures, setIncludeDoctorFigures] = useState(() => {
    try {
      return localStorage.getItem("bf_include_source_images") !== "false";
    } catch {
      return true;
    }
  });
  const [doctorFileBusy, setDoctorFileBusy] = useState(false);
  const [aiPostMortemSheet, setAiPostMortemSheet] = useState(null);
  const [postMortemBusy, setPostMortemBusy] = useState(false);
  const doctorFileInputRef = useRef(null);

  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);

  // ─── live list of my lectures ─────────────────────────────────────────────
  const refreshJobsList = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await lectureApi.listLectures();
      const list = res?.jobs || res?.data?.jobs || [];
      if (Array.isArray(list) && list.length > 0) {
        setJobs(list);
      }
    } catch {
      // Ignored: onSnapshot will handle or retry
    }
  }, [profile?.id]);

  useEffect(() => {
    refreshJobsList();
  }, [refreshJobsList]);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const q = query(collection(db, "lectureJobs"), where("user_id", "==", profile.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.created_date?.seconds || 0) - (a.created_date?.seconds || 0));
        setJobs(rows);
      },
      () => {
        // Fallback to server API if Firestore client is blocked by browser extension
        refreshJobsList();
      },
    );
    return () => unsub();
  }, [profile?.id, refreshJobsList]);

  // ─── live progress of the active job ─────────────────────────────────────
  useEffect(() => {
    if (!activeJobId || !profile?.id) return undefined;
    const unsub = onSnapshot(
      doc(db, "lectureJobs", activeJobId),
      (snap) => {
        if (snap.exists()) setActiveJob({ id: snap.id, ...snap.data() });
      },
      () => {
        // Non-critical: latency delay absorbed silently
      }
    );
    return () => unsub();
  }, [activeJobId, profile?.id]);

  const openViewer = useCallback(async (jobId) => {
    if (!jobId) return;
    setActiveJobId(jobId);

    // 1. Resilient server proxy first (immune to browser adblockers and Dot Bypasser extensions)
    try {
      const res = await lectureApi.getLectureData(jobId);
      const payload = res?.data || res;
      if (payload?.job || payload?.transcript) {
        setViewerData({
          job: payload.job || null,
          transcript: payload.transcript || null,
          organization: payload.organization || null,
        });
        return;
      }
    } catch (apiErr) {
      console.warn("[lectures] server getLectureData fallback to Firestore:", apiErr?.message);
    }

    // 2. Direct Firestore fallback
    try {
      const [jobSnap, tSnap, oSnap] = await Promise.all([
        getDoc(doc(db, "lectureJobs", jobId)),
        getDoc(doc(db, "lectureTranscripts", jobId)),
        getDoc(doc(db, "lectureOrganizations", jobId)),
      ]);
      setViewerData({
        job: jobSnap.exists() ? { id: jobSnap.id, ...jobSnap.data() } : null,
        transcript: tSnap.exists() ? tSnap.data() : null,
        organization: oSnap.exists() ? oSnap.data() : null,
      });
    } catch (err) {
      // `permission-denied` means the signed-in account is not the owner of this
      // job (rules: resource.data.user_id == request.auth.uid) — a stale
      // bookmark or a shared link. That is an expected outcome, not a crash:
      // show an empty viewer instead of a console warning the owner sees as a bug.
      const code = err?.code || "";
      if (code === "permission-denied") {
        setViewerData(null);
        return;
      }
      console.warn("[lectures] viewer load failed:", err?.message);
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      openViewer(params.id);
    }
  }, [params.id, openViewer]);

  const onPickFile = useCallback(async (picked) => {
    if (!picked) return;
    setError("");
    setFile(picked);
    setPhase("prepare");
    setPrep(null);
    try {
      const result = await prepareLecture(picked, {
        onProgress: (p) => setProgress({ done: 0, total: 0, label: p.phase }),
      });
      if (result.durationSec > 4 * 60 * 60) {
        setError(copy.file_too_long);
        setPhase("idle");
        return;
      }
      setPrep(result);
      setProgress({ done: 0, total: result.chunks.length, label: "" });
      setPhase("confirm");
    } catch (err) {
      setError(copy.errors[err?.message] || copy.file_corrupt);
      setPhase("idle");
      console.warn("[lectures] decode failed:", err?.message);
    }
  }, []);

  const startTranscription = useCallback(async () => {
    if (!prep || !file) return;
    cancelledRef.current = false;
    setError("");
    setPhase("upload");
    try {
      const created = await lectureApi.create({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        subject: subject.trim(),
        lecturer: lecturer.trim(),
        glossary_hints: glossaryInput
          .split(/[،,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        file_name: file.name,
        mime: file.type || "audio/wav",
        size_bytes: file.size,
        duration_sec: Math.round(prep.durationSec),
        chunk_count: prep.chunks.length,
      });
      const jobId = created?.job_id || created?.data?.job_id || created?.id || created?.data?.id;
      if (!jobId) {
        console.error("[lectures] failed to obtain valid jobId from created response:", created);
        throw new Error("INVALID_REQUEST");
      }
      setActiveJobId(jobId);
      setActiveJob({
        id: jobId,
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        subject: subject.trim(),
        lecturer: lecturer.trim(),
        status: "transcribing",
      });
      setPhase("transcribe");
      setProgress({ done: 0, total: prep.chunks.length, label: copy.progress.heading });

      let doneChunks = 0;
      for (const [i, chunk] of prep.chunks.entries()) {
        if (cancelledRef.current) return;
        setProgress({
          done: i,
          total: prep.chunks.length,
          label: copy.progress.chunk(i, prep.chunks.length),
        });
        const chunkIndex = Number.isInteger(chunk.index) ? chunk.index : i;

        // Convert chunk blob to base64 for direct resilient transmission
        let audioBase64 = null;
        try {
          audioBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(chunk.blob);
          });
        } catch (e) {
          console.warn("[lectures] base64 convert error:", e);
        }

        if (!audioBase64) {
          throw new Error("CHUNK_CONVERT_FAILED");
        }

        let attempt = 0;
        let chunkSuccess = false;
        for (;;) {
          if (cancelledRef.current) return;
          attempt += 1;
          try {
            const res = await lectureApi.transcribeChunk({
              jobId,
              chunkIndex,
              audioBase64,
              mime: "audio/wav",
            });
            if (res?.ok) {
              chunkSuccess = true;
              doneChunks += 1;
              break;
            }
            if (res?.retryable && attempt < 4) {
              await new Promise((r) => setTimeout(r, 1_500 * attempt));
              continue;
            }
          } catch (transcribeErr) {
            console.warn(`[lectures] chunk ${chunkIndex} attempt ${attempt} error:`, transcribeErr?.message);
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1_500 * attempt));
              continue;
            }
          }
          break;
        }
      }

      if (cancelledRef.current) return;
      if (doneChunks === 0) {
        throw new Error("TRANSCRIBE_FAILED");
      }
      setProgress({ done: prep.chunks.length, total: prep.chunks.length, label: copy.progress.done });
      const finRes = await lectureApi.finalize(jobId);
      const orgRes = await lectureApi.organize(jobId).catch((err) => {
        console.warn("[lectures] organize failed:", err?.message);
        return null;
      });
      const transcriptData = finRes?.transcript || finRes?.data?.transcript || null;
      const orgData = orgRes?.organization || orgRes?.data?.organization || null;
      if (transcriptData) {
        setViewerData({
          job: {
            id: jobId,
            title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
            subject: subject.trim(),
            lecturer: lecturer.trim(),
            duration_sec: Math.round(prep.durationSec),
            created_date: new Date(),
          },
          transcript: transcriptData,
          organization: orgData,
        });
      }
      setPhase("done");
      await openViewer(jobId);
      refreshJobsList();
    } catch (err) {
      console.warn("[lectures] pipeline failed:", err?.message);
      setError(copy.errors[err?.message] || copy.errors.GENERIC);
      setPhase("confirm");
    }
  }, [prep, file, title, subject, lecturer, glossaryInput, openViewer, refreshJobsList]);

  const docModel = useMemo(() => {
    if (!viewerData?.transcript) return null;
    const sentences = viewerData.transcript.sentences || [];
    const planObj = viewerData.organization?.plan || viewerData.organization || null;
    const gaps = viewerData.transcript.gaps || [];
    return buildDocModel([{ pageIndex: 0, sentences }], planObj, gaps, {
      title: viewerData.job?.title || "محاضرة",
      subject: viewerData.job?.subject || "",
      lecturer: viewerData.job?.lecturer || "",
      durationSec: viewerData.job?.source?.duration_sec || 0,
    });
  }, [viewerData]);

  const studyView = useMemo(() => (docModel ? buildStudyView(docModel) : null), [docModel]);

  const dynamicSheet = useMemo(
    () => (docModel ? buildDynamicStudySheet(docModel, { studyNotes, summaryData }) : null),
    [docModel, studyNotes, summaryData],
  );

  // ─── Live Microphone Recording ────────────────────────────────────────────
  const startLiveRecording = useCallback(async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح الحالي لا يدعم التسجيل المباشر من المايكروفون.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const recFile = new File(
            [blob],
            `تسجيل-محاضرة-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`,
            { type: "audio/webm" },
          );
          onPickFile(recFile);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecordingSec(0);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => {
        setRecordingSec((s) => s + 1);
      }, 1000);
    } catch {
      setError("تعذر الوصول للمايكروفون — تأكد من السماح للموقع بصلاحية المايكروفون.");
    }
  }, [onPickFile]);

  const stopLiveRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ─── One-Click Copy Full Transcript ───────────────────────────────────────
  const handleCopyFullTranscript = useCallback(async () => {
    if (!docModel) return;
    const textToCopy = renderPlainText(docModel, { includeOfftopic: showOfftopic });
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2500);
    } catch {
      // Fallback copy
    }
  }, [docModel, showOfftopic]);

  // ─── PowerPoint (.pptx) Export ────────────────────────────────────────────
  const handleExportPowerPoint = useCallback(
    async (mode = "bilingual") => {
      if (!docModel || pptxBusy) return;
      setPptxBusy(true);
      try {
        await exportLecturePowerPoint(docModel, dynamicSheet, { mode });
      } catch (err) {
        console.warn("[lectures] pptx export error:", err?.message);
      } finally {
        setPptxBusy(false);
      }
    },
    [docModel, dynamicSheet, pptxBusy],
  );

  // ─── Main Website Quiz Generator (Platform's StandaloneQuiz + ModernQuizView) ───
  const handleGenerateMainPlatformQuiz = useCallback(async () => {
    if (!docModel || lectureQuizGenerating) return;
    setLectureQuizGenerating(true);
    setLectureQuizTelegramMsg("");
    setError("");
    try {
      const fullLectureText = (docModel.sections || [])
        .flatMap((sec) => (sec.sentences || []).map((s) => s.text))
        .join("\n");
      const studyContext = (dynamicSheet?.studySections || [])
        .map(
          (sec) =>
            `${sec.topicTitle}:\n${(sec.englishMedicalNotes || []).join("\n")}\n${(
              sec.arabicExplanation || []
            ).join("\n")}`,
        )
        .join("\n\n");
      const combinedSource = `${studyContext}\n\n${fullLectureText}`.slice(0, 65000);

      const response = await base44.functions.invoke("generateStudyContent", {
        task: "quiz",
        sourceText: combinedSource,
        questionCount: lectureQuizCount,
        difficulty: lectureQuizDifficulty,
        questionTypes: ["mcq", "true_false"],
        topicFocus: docModel.meta?.title || "المحاضرة",
      });

      const rawResult = response?.data?.result || response?.result || response?.data || response || {};
      const rawQuestions = Array.isArray(rawResult?.questions)
        ? rawResult.questions
        : Array.isArray(rawResult)
        ? rawResult
        : [];
      const questions = rawQuestions
        .filter((q) => q && typeof q === "object" && (q.question || q.stem || q.text))
        .map((q, idx) => ({
          id: q.id || `q_${idx + 1}`,
          type: q.type || "mcq",
          question: String(q.question || q.stem || q.text || "").trim(),
          options: Array.isArray(q.options)
            ? q.options.map((o) => String(o ?? ""))
            : ["True", "False"],
          correct_answer:
            typeof q.correct_answer === "number"
              ? q.correct_answer
              : typeof q.correctIndex === "number"
              ? q.correctIndex
              : 0,
          explanation: String(q.explanation || q.rationale || "").trim(),
          difficulty: q.difficulty || lectureQuizDifficulty,
        }));

      if (!questions.length) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من توليد أسئلة كافية — حاول مرة أخرى.");
      }

      const createdQuiz = await base44.entities.StandaloneQuiz.create({
        title: `امتحان المحاضرة: ${docModel.meta?.title || "محاضرة طبية"}`,
        topic: docModel.meta?.subject || docModel.meta?.title || "طب",
        difficulty: lectureQuizDifficulty,
        source_type: "lecture_transcript",
        lecture_job_id: activeJobId || "",
        questions,
        question_count: questions.length,
        share_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      });

      setLectureQuizRecord(createdQuiz);
      setActiveTab("quiz");
    } catch (err) {
      setError(err?.message || "حدث خطأ أثناء توليد الكويز من المحاضرة.");
    } finally {
      setLectureQuizGenerating(false);
    }
  }, [docModel, dynamicSheet, lectureQuizCount, lectureQuizDifficulty, lectureQuizGenerating, activeJobId]);

  const handleSendLectureQuizToTelegram = useCallback(async () => {
    if (!lectureQuizRecord?.questions?.length || lectureQuizTelegramBusy) return;
    setLectureQuizTelegramBusy(true);
    setLectureQuizTelegramMsg("");
    try {
      const res = await base44.functions.invoke("export-to-telegram", {
        title: lectureQuizRecord.title,
        questions: lectureQuizRecord.questions,
      });
      if (res?.ok !== false) {
        setLectureQuizTelegramMsg("✅ تم إرسال كويز المحاضرة إلى تليجرام كـ Polls تفاعلية!");
      } else {
        setLectureQuizTelegramMsg("⚠️ تأكد من ربط حسابك ببوت التليجرام من الإعدادات أولاً.");
      }
    } catch {
      setLectureQuizTelegramMsg("⚠️ تأكد من ربط حسابك ببوت التليجرام من الإعدادات أولاً.");
    } finally {
      setLectureQuizTelegramBusy(false);
    }
  }, [lectureQuizRecord, lectureQuizTelegramBusy]);

  // ─── Lecture AI Assistant ─────────────────────────────────────────────────
  const handleAskLectureAssistant = useCallback(
    async (customQuestion = "") => {
      const qText = String(customQuestion || assistantInput).trim();
      if (!qText || !docModel || assistantBusy) return;
      if (!customQuestion) setAssistantInput("");
      const userMsg = { role: "user", text: qText };
      setAssistantMessages((prev) => [...prev, userMsg]);
      setAssistantBusy(true);
      try {
        const contextText = (docModel.sections || [])
          .flatMap((sec) => (sec.sentences || []).map((s) => `[${s.id}] ${s.text}`))
          .join("\n")
          .slice(0, 35000);
        const prompt = `أنت المساعد الطبي الذكي الخاص بمنصة Black Fighters.
المحاضرة بعنوان: "${docModel.meta?.title || "محاضرة"}"
أجب عن سؤال الطالب بدقة عالية بالاعتماد على نص المحاضرة التالي مع كتابة المصطلحات الطبية بالإنجليزية وشرحها بالعربي المبسط:

نص المحاضرة:
${contextText}

سؤال الطالب:
${qText}`;
        const reply = await generateText(prompt, { maxTokens: 2048, temperature: 0.3 });
        setAssistantMessages((prev) => [
          ...prev,
          { role: "assistant", text: String(reply || "لم أتمكن من استخراج إجابة حالياً.") },
        ]);
      } catch {
        setAssistantMessages((prev) => [
          ...prev,
          { role: "assistant", text: "حدث خطأ مؤقت في الاتصال بالمساعد الذكي، جرب مرة أخرى." },
        ]);
      } finally {
        setAssistantBusy(false);
      }
    },
    [assistantInput, docModel, assistantBusy],
  );

  // ─── Attach Doctor PDF / PPTX / Images & Extract Figures ──────────────────
  const handleAttachDoctorFile = useCallback(
    async (pickedFile) => {
      if (!pickedFile) return;
      setDoctorFileBusy(true);
      setDoctorFileName(pickedFile.name);
      try {
        const [extractedTxt, extractedFigs] = await Promise.all([
          extractTextFromFile(pickedFile).catch(() => ""),
          includeDoctorFigures
            ? extractQuickFiguresFromFile(pickedFile, { max: 12 }).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (extractedTxt) setDoctorPdfText(extractedTxt);
        if (extractedFigs?.length) setDoctorFigures(extractedFigs);
      } catch (err) {
        console.warn("[lectures] doctor file extraction warning:", err?.message);
      } finally {
        setDoctorFileBusy(false);
      }
    },
    [includeDoctorFigures],
  );

  const toggleIncludeDoctorFigures = useCallback(() => {
    setIncludeDoctorFigures((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bf_include_source_images", next ? "true" : "false");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // ─── AI Post-Mortem Study Sheet Synthesizer ───────────────────────────────
  const handleSynthesizePostMortemSheet = useCallback(async () => {
    if (!docModel || postMortemBusy) return;
    setPostMortemBusy(true);
    try {
      const transcriptExcerpt = (docModel.sections || [])
        .map(
          (sec, idx) =>
            `[القسم ${idx + 1}: ${sec.title}]\n` +
            (sec.sentences || [])
              .filter((s) => !s.isOfftopic)
              .map((s) => s.text)
              .join(" "),
        )
        .join("\n\n")
        .slice(0, 26000);
      const pdfExcerpt = doctorPdfText ? `\n\n[محتوى ملف الـ PDF الخاص بالدكتور]:\n${doctorPdfText.slice(0, 12000)}` : "";
      const prompt = `أنت خبير إعداد مذكرات المذاكرة الطبية والأكاديمية بنمط Post-Mortem الاحترافي.
المطلوب: تحويل تفريغ المحاضرة التالي (وملف الـ PDF المرفق إن وجد) إلى كائن JSON منظم يحتوي على:
1) "titleAr": عنوان المحاضرة بالعربي
2) "titleEn": عنوان المحاضرة بالإنجليزي
3) "overviewPairs": مصفوفة من 2 إلى 3 عناصر، كل عنصر {"en": "Summary sentence in English...", "ar": "شرح عربي مبسط"}
4) "sections": مصفوفة أقسام المحاضرة، كل قسم يحتوي على:
   - "number": رقم القسم
   - "titleAr": عنوان القسم بالعربي
   - "titleEn": عنوان القسم بالإنجليزي
   - "pairs": مصفوفة نقاط، كل نقطة {"en": "Definition/Mechanism/Causes/Formula/N.B.: Clear English sentence with numbers & terms", "ar": "الشرح والتفصيل بالعربي", "doc": "كلام الدكتور الحرفي المهم من الريكورد"}
   - "comparisonTable": اختياري {"headers": ["المقارنة", "..."], "rows": [["...", "..."]]}
   - "keyNote": ملحوظة امتحانية هامة N.B.
5) "examCompilationTable": مصفوفة من 8 إلى 15 عنصر لأهم الأرقام والجرعات والتعريفات {"item": "Term / Item", "value": "Value / الرقم أو الشرح"}
6) "examTricks": مصفوفة من 4 إلى 6 تريكات امتحانات {"en": "Exam Trick in English", "ar": "شرح التريكة بالعربي", "doc": "تنبيه الدكتور"}

أرجع JSON صالح فقط بدون أي نص خارجه.

نص تفريغ المحاضرة:
${transcriptExcerpt}${pdfExcerpt}`;

      const raw = await generateText(prompt, { maxTokens: 4096, temperature: 0.2 });
      const cleaned = String(raw || "")
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          setAiPostMortemSheet(parsed);
        }
      }
    } catch (err) {
      console.warn("[lectures] AI Post-Mortem synthesis fallback to deterministic model:", err?.message);
    } finally {
      setPostMortemBusy(false);
    }
  }, [docModel, doctorPdfText, postMortemBusy]);

  const handleGenerateStudyNotes = useCallback(async () => {
    if (!activeJobId) return;
    setAiWorking(true);
    try {
      const res = await lectureApi.summary(activeJobId, "study_notes");
      if (res?.payload || res?.data?.payload) {
        setStudyNotes(res.payload || res.data.payload);
      }
      setActiveTab("study");
    } catch (err) {
      setError(copy.errors[err?.message] || copy.errors.GENERIC);
    } finally {
      setAiWorking(false);
    }
  }, [activeJobId]);

  const handleGenerateSummary = useCallback(
    async (level = summaryLevel) => {
      if (!activeJobId) return;
      setAiWorking(true);
      try {
        const res = await lectureApi.summary(activeJobId, `summary_${level}`);
        if (res?.payload || res?.data?.payload) {
          setSummaryData(res.payload || res.data.payload);
        }
        setActiveTab("summary");
      } catch (err) {
        setError(copy.errors[err?.message] || copy.errors.GENERIC);
      } finally {
        setAiWorking(false);
      }
    },
    [activeJobId, summaryLevel],
  );

  const deleteJob = useCallback(
    async (jobId) => {
      if (typeof window !== "undefined" && !window.confirm(copy.delete_confirm)) return;
      try {
        await lectureApi.deleteLecture(jobId).catch(() => deleteDoc(doc(db, "lectureJobs", jobId)));
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        if (activeJobId === jobId) {
          setViewerData(null);
          setActiveJobId(null);
        }
      } catch (err) {
        console.warn("[lectures] delete failed:", err?.message);
      }
    },
    [activeJobId],
  );

  const plan = useMemo(() => {
    if (!prep) return null;
    const chunks = prep.chunks.length;
    return {
      chunks,
      eta: formatEtaAr(estimateTranscribeSeconds(chunks)),
      credits: quoteLectureCredits(Math.round(prep.durationSec)),
      upload: bytesLabel(estimateUploadBytes(prep.chunks)),
      duration: minutesLabel(prep.durationSec),
    };
  }, [prep]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    if (statusFilter === "ready") return jobs.filter((j) => j.status === "ready" || j.status === "partial_ready");
    if (statusFilter === "active")
      return jobs.filter((j) => ["transcribing", "organizing", "uploading_chunks", "queued"].includes(j.status));
    if (statusFilter === "failed") return jobs.filter((j) => j.status === "failed");
    return jobs;
  }, [jobs, statusFilter]);

  if (!isLoadingAuth && !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" dir="rtl">
        <h1 className="mb-4 text-2xl font-bold text-[#f5f7fa]">{copy.title}</h1>
        <p className="mb-6 text-[#9aa4b2]">{copy.errors.UNAUTHORIZED}</p>
        <Link to="/login" className="btn-primary-glow inline-flex rounded-2xl px-6 py-3 font-semibold">
          سجّل دخول
        </Link>
      </div>
    );
  }

  // Dedicated Print View route (/lectures/:id/print) or modal
  if ((isPrintRoute || printModalOpen) && docModel) {
    return (
      <PrintView
        docModel={docModel}
        studyNotes={studyNotes}
        summary={summaryData}
        figures={doctorFigures}
        includeFigures={includeDoctorFigures}
        pdfText={doctorPdfText}
        aiPostMortemSheet={aiPostMortemSheet}
        onClose={() => {
          setPrintModalOpen(false);
          if (isPrintRoute && activeJobId) navigate(`/lectures/${activeJobId}`);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lecture-doc-root" dir="rtl" lang="ar" data-font-size={fontSize}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f5f7fa]">{copy.title}</h1>
          <p className="mt-1 text-[#9aa4b2]">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="apple-glass-btn flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[#f5f7fa] hover:border-[#19f08c]/40 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#19f08c]" />
            <span>إعدادات النماذج ومفاتيح AI</span>
          </button>
          {viewerData ? (
            <button
              type="button"
              onClick={() => {
                setViewerData(null);
                setPhase("idle");
              }}
              className="btn-primary-glow rounded-2xl px-5 py-2.5 text-sm font-bold cursor-pointer"
            >
              + {copy.upload.newLecture}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-500/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-300" role="alert">
          {error}
        </div>
      ) : null}

      {/* ─── upload card + Live Microphone Recording ─── */}
      {!viewerData && (phase === "idle" || phase === "prepare") ? (
        <section className="mb-8 rounded-3xl border-2 border-dashed border-[#19f08c]/35 bg-[#090c11] p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary-glow rounded-2xl px-8 py-4 text-lg font-bold cursor-pointer"
              disabled={phase === "prepare" || isRecording}
            >
              {phase === "prepare" ? copy.upload.planning : copy.upload.cta}
            </button>

            {!isRecording ? (
              <button
                type="button"
                onClick={startLiveRecording}
                disabled={phase === "prepare"}
                className="rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-6 py-4 text-base font-bold cursor-pointer transition-colors"
              >
                🎙️ تسجيل المحاضرة لايف من المايك
              </button>
            ) : (
              <button
                type="button"
                onClick={stopLiveRecording}
                className="rounded-2xl border border-rose-500 bg-rose-600 text-white px-6 py-4 text-base font-bold cursor-pointer animate-pulse"
              >
                ⏹️ إيقاف التسجيل وتفريغه الآن ({Math.floor(recordingSec / 60)}:
                {String(recordingSec % 60).padStart(2, "0")})
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-[#9aa4b2]">{copy.upload.formats}</p>
          <p className="text-xs text-[#646e7d]">{copy.upload.limits}</p>
        </section>
      ) : null}

      {/* ─── confirm plan (4-step wizard step 2) ─── */}
      {phase === "confirm" && plan ? (
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#090c11] p-6">
          <h2 className="mb-4 text-xl font-bold text-[#f5f7fa]">{copy.plan.heading}</h2>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 text-[#f5f7fa]">
            <div className="rounded-xl border border-white/10 bg-[#0e131b] p-3"><dt className="text-xs text-[#9aa4b2]">{copy.plan.duration(plan.duration)}</dt></div>
            <div className="rounded-xl border border-white/10 bg-[#0e131b] p-3"><dd className="font-semibold">{copy.plan.parts(plan.chunks)}</dd></div>
            <div className="rounded-xl border border-white/10 bg-[#0e131b] p-3"><dd className="font-semibold text-[#19f08c]">{copy.plan.cost(plan.credits)}</dd></div>
            <div className="rounded-xl border border-white/10 bg-[#0e131b] p-3"><dd className="font-semibold">{copy.plan.sizeNote(plan.upload)}</dd></div>
          </dl>
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {copy.plan.eta(plan.eta)} · {copy.plan.qualityNote}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2.5 text-sm text-[#f5f7fa] placeholder:text-[#646e7d]"
              placeholder={copy.upload.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2.5 text-sm text-[#f5f7fa] placeholder:text-[#646e7d]"
              placeholder={copy.upload.subjectPlaceholder}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2.5 text-sm text-[#f5f7fa] placeholder:text-[#646e7d]"
              placeholder={copy.upload.lecturerPlaceholder}
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2.5 text-sm text-[#f5f7fa] placeholder:text-[#646e7d]"
              placeholder={copy.upload.glossaryPlaceholder}
              value={glossaryInput}
              onChange={(e) => setGlossaryInput(e.target.value)}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={startTranscription}
              className="btn-primary-glow flex-1 rounded-2xl px-6 py-3 font-bold cursor-pointer"
            >
              {copy.upload.confirm}
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#f5f7fa] cursor-pointer"
            >
              {copy.upload.cancel}
            </button>
          </div>
        </section>
      ) : null}

      {/* ─── live progress screen ─── */}
      {(phase === "upload" || phase === "transcribe") && plan ? (
        <section className="mb-8 rounded-3xl border border-[#19f08c]/30 bg-[#090c11] p-6" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#f5f7fa]">{copy.progress.heading}</h2>
            <span className="text-xs font-semibold text-amber-300">
              {copy.keep_tab_open_warning}
            </span>
          </div>
          <p className="mb-3 text-sm text-[#9aa4b2]">
            {copy.progress.chunk(progress.done, progress.total)}
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#19f08c] transition-[width] duration-300"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[#9aa4b2]">{copy.progress.queueNote}</p>
        </section>
      ) : null}

      {/* ─── Lecture Reader (/lectures/:id) ─── */}
      {docModel ? (
        <section className="mb-10">
          {/* Sticky Action Bar: 4 primary buttons + 2 secondary */}
          <div className="mb-5 rounded-3xl border border-white/10 bg-[#090c11] p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="lecture-doc-title">
                  <BidiText text={docModel.meta.title} />
                </h2>
                <p className="text-xs text-[#9aa4b2] mt-1">
                  {copy.viewer.sentences(docModel.meta.totalSentences)} ·{" "}
                  {copy.viewer.words(docModel.meta.totalWords)}
                  {docModel.meta.subject ? ` · ${docModel.meta.subject}` : ""}
                </p>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  🖨️ {copy.actions.pdf}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadStandaloneHtml(docModel, {
                      includeOfftopic: showOfftopic,
                      includeAnnotations: showAnnotations,
                      studyNotes,
                      summary: summaryData,
                    })
                  }
                  className="rounded-xl border border-white/15 bg-white/[0.04] text-[#f5f7fa] px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  🌐 {copy.actions.html}
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPowerPoint("bilingual")}
                  disabled={pptxBusy}
                  className="rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-300 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {pptxBusy ? "جاري تجهيز البوربوينت..." : "📊 تحميل PowerPoint (.pptx)"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("study")}
                  className="rounded-xl border border-[#19f08c]/40 bg-[#19f08c]/10 text-[#19f08c] px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  ✨ {copy.actions.restyle}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("summary");
                    if (!summaryData) handleGenerateSummary("detailed");
                  }}
                  disabled={aiWorking}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {aiWorking ? copy.actions.working : `📝 ${copy.actions.summary}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("quiz");
                    if (!lectureQuizRecord && !lectureQuizGenerating) {
                      handleGenerateMainPlatformQuiz();
                    }
                  }}
                  className="rounded-xl border border-violet-500/40 bg-violet-500/15 text-violet-200 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  🎯 امتحن كويز على المحاضرة
                </button>
              </div>
            </div>

            {/* Secondary Tabs + Reader Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex flex-wrap gap-1.5" role="tablist">
                {[
                  { id: "transcript", label: copy.viewer.transcriptTab },
                  { id: "study", label: `✨ ${copy.viewer.studyTab}` },
                  { id: "summary", label: copy.viewer.summaryTab },
                  { id: "quiz", label: "🎯 كويز المحاضرة (بنظام المنصة)" },
                  { id: "ai_helper", label: "🤖 مساعد المحاضرة الذكي" },
                  { id: "export", label: copy.viewer.exportTab },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                      activeTab === t.id
                        ? "bg-[#19f08c] text-[#03150c]"
                        : "bg-white/[0.05] text-[#9aa4b2] hover:text-[#f5f7fa]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="search"
                  placeholder="بحث داخل المحاضرة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0e131b] px-2.5 py-1 text-xs text-[#f5f7fa] placeholder:text-[#646e7d]"
                />
                <button
                  type="button"
                  onClick={() => setShowOfftopic((v) => !v)}
                  className="rounded-lg border border-white/10 bg-[#0e131b] text-[#f5f7fa] px-2.5 py-1 cursor-pointer"
                >
                  {showOfftopic ? "إخفاء الكلام الجانبي" : "إظهار الكلام الجانبي"}
                </button>
                <button
                  type="button"
                  onClick={() => setHighlightTerms((v) => !v)}
                  className="rounded-lg border border-white/10 bg-[#0e131b] text-[#f5f7fa] px-2.5 py-1 cursor-pointer"
                >
                  {highlightTerms ? "تمييز المصطلحات ✓" : "تمييز المصطلحات"}
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  aria-label="حجم الخط"
                  className="rounded-lg border border-white/10 bg-[#0e131b] text-[#f5f7fa] px-2 py-1"
                >
                  <option value="sm">خط صغير</option>
                  <option value="md">خط متوسط</option>
                  <option value="lg">خط كبير</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gap markers */}
          {docModel.gaps.map((g) => (
            <GapCard key={g.id} gap={g} />
          ))}

          {/* Tab 1: Verbatim Organized Transcript */}
          {activeTab === "transcript" ? (
            <div className="lecture-reading-column">
              {/* Top Transcript Utility Banner: Copy Full Text + Masterpiece Study Sheet CTA */}
              <div className="lecture-section-card !py-4 mb-5 flex flex-wrap items-center justify-between gap-3 border border-[#19f08c]/30">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFullTranscript}
                    className="rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] px-3.5 py-2 text-xs font-bold text-[#f5f7fa] cursor-pointer"
                  >
                    {copiedTranscript ? "✅ تم نسخ النص الكامل!" : "📋 نسخ كامل النص"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("study")}
                    className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    ✨ تحسين الشكل واستخلاص المذاكرة المهمة من الريكورد
                  </button>
                </div>
                <span className="text-xs text-[#9aa4b2]">
                  تم إرجاع المصطلحات الطبية المنطوقة للإنجليزية تلقائياً مع الحفاظ على كلام الدكتور
                </span>
              </div>

              {docModel.toc.length > 1 ? (
                <nav className="lecture-section-card !py-4 mb-6" aria-label={copy.viewer.sections}>
                  <h3 className="text-sm font-bold mb-2">{copy.viewer.sections}</h3>
                  <ol className="grid gap-1 text-xs sm:grid-cols-2 pr-4 list-decimal">
                    {docModel.toc.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="text-[#19f08c] hover:underline font-semibold">
                          <BidiText text={item.title} />
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              {docModel.sections.map((sec) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  lazy={docModel.meta.lazySections}
                  showOfftopic={showOfftopic}
                  showAnnotations={showAnnotations}
                  highlightTerms={highlightTerms}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : null}

          {/* Tab 2: Masterpiece Bilingual Medical Study Sheet + Grounded Study Notes */}
          {activeTab === "study" && studyView ? (
            <div className="lecture-reading-column space-y-6">
              {/* Top Study Export & AI Enrichment Bar */}
              <div className="lecture-section-card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="lecture-section-heading !mb-1">
                    ✨ مذكرة المذاكرة الطبية المزدوجة (English Exam Notes + الشرح العربي)
                  </h3>
                  <p className="text-xs text-[#9aa4b2]">
                    مرتبة للامتحان: نقاط طبية إنجليزية في مربعات مستقلة + شرح عربي + قاموس التعريفات في النهاية
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateStudyNotes}
                    disabled={aiWorking}
                    className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    {aiWorking ? copy.actions.working : `🤖 ${copy.viewer.generateStudyNotes}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(true)}
                    className="rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-[#f5f7fa] cursor-pointer"
                  >
                    🖨️ كتاب PDF (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadPostMortemStudyHtml(docModel, {
                        studyNotes,
                        summaryData,
                        aiSheet: aiPostMortemSheet,
                        pdfText: doctorPdfText,
                        figures: doctorFigures,
                        includeFigures: includeDoctorFigures,
                      })
                    }
                    className="rounded-xl border border-amber-400/50 bg-amber-400/15 text-amber-300 px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors"
                  >
                    📄 تحميل مذكرة Post-Mortem (HTML)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printPostMortemStudyHtml(docModel, {
                        studyNotes,
                        summaryData,
                        aiSheet: aiPostMortemSheet,
                        pdfText: doctorPdfText,
                        figures: doctorFigures,
                        includeFigures: includeDoctorFigures,
                      })
                    }
                    className="rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-200 px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors"
                  >
                    🖨️ طباعة Post-Mortem (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPowerPoint("bilingual")}
                    disabled={pptxBusy}
                    className="rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-300 px-3.5 py-2 text-xs font-bold cursor-pointer"
                  >
                    📊 PowerPoint
                  </button>
                </div>
              </div>

              {/* Doctor PDF / Slides & Source Figures Control Card */}
              <div className="lecture-section-card border border-amber-500/35 space-y-3">
                <input
                  ref={doctorFileInputRef}
                  type="file"
                  accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => handleAttachDoctorFile(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-300">
                      📎 دمج ملف الـ PDF / السلايدز وصور المحاضرة مع التفريغ الصوتي (نمط Post-Mortem)
                    </h4>
                    <p className="text-xs text-[#9aa4b2] mt-0.5">
                      ارفق ملف الدكتور (PDF أو PPTX) لدمج نصوصه واستخراج صوره التوضيحية داخل المذكرة، مع زر التحكم في إظهار أو إخفاء الصور.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => doctorFileInputRef.current?.click()}
                      disabled={doctorFileBusy}
                      className="rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors"
                    >
                      {doctorFileBusy
                        ? "⏳ جاري قراءة الملف والصور..."
                        : doctorFileName
                          ? `📄 تغيير الملف (${doctorFileName})`
                          : "➕ إرفاق ملف PDF / سلايدز الدكتور"}
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={includeDoctorFigures}
                      onClick={toggleIncludeDoctorFigures}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-extrabold cursor-pointer transition-colors ${
                        includeDoctorFigures
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                          : "border-white/15 bg-white/[0.04] text-[#9aa4b2]"
                      }`}
                    >
                      {includeDoctorFigures
                        ? `🖼️ دمج صور الملف: مفعّل${doctorFigures.length ? ` (${doctorFigures.length} صورة)` : ""}`
                        : "⭕ دمج صور الملف: غير مفعّل"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSynthesizePostMortemSheet}
                      disabled={postMortemBusy}
                      className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      {postMortemBusy
                        ? "⏳ جاري بناء الجداول والـ Pairs..."
                        : aiPostMortemSheet
                          ? "✅ تحديث مذكرة Post-Mortem بالـ AI"
                          : "⚡ توليد مذكرة Post-Mortem بالـ AI"}
                    </button>
                  </div>
                </div>

                {/* Preview of extracted Doctor figures when toggled ON */}
                {includeDoctorFigures && doctorFigures.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {doctorFigures.map((fig, fIdx) => (
                      <div
                        key={fIdx}
                        className="rounded-xl border border-white/10 bg-[#0e131b] p-2 text-center"
                      >
                        <img
                          src={fig.url}
                          alt={`صورة ${fIdx + 1}`}
                          className="max-h-28 w-auto mx-auto rounded border border-white/10 bg-white object-contain"
                        />
                        <p className="mt-1 text-[11px] text-[#9aa4b2] truncate">
                          صورة {fIdx + 1} {fig.page ? `(صفحة ${fig.page})` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* 1. Executive Summary */}
              {dynamicSheet?.executiveSummary?.length ? (
                <div className="lecture-section-card border border-[#19f08c]/35">
                  <h4 className="text-sm font-extrabold text-[#19f08c] mb-3">
                    📌 الخلاصة التنفيذية السريعة (Executive Summary)
                  </h4>
                  <ul className="space-y-2 text-sm pr-4 list-disc">
                    {dynamicSheet.executiveSummary.map((item, idx) => (
                      <li key={idx}>
                        <BidiText text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* 2. High-Yield Exam Alerts & Dosages/Numbers */}
              {(dynamicSheet?.highYieldWarnings?.length || dynamicSheet?.dosageAndNumbers?.length) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {dynamicSheet.highYieldWarnings?.length ? (
                    <div className="lecture-section-card !mb-0 border border-amber-500/35">
                      <h4 className="text-xs font-extrabold text-amber-400 mb-2.5">
                        🔥 تنبيهات ومواضع أسئلة الامتحان (Exam Pearls)
                      </h4>
                      <ul className="space-y-2 text-xs pr-4 list-disc">
                        {dynamicSheet.highYieldWarnings.slice(0, 8).map((w, idx) => (
                          <li key={idx}>
                            <BidiText text={w.text} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {dynamicSheet.dosageAndNumbers?.length ? (
                    <div className="lecture-section-card !mb-0 border border-sky-500/35">
                      <h4 className="text-xs font-extrabold text-sky-400 mb-2.5">
                        💊 الأرقام والنسب والجرعات الهامة (Dosages & Values)
                      </h4>
                      <ul className="space-y-2 text-xs pr-4 list-disc">
                        {dynamicSheet.dosageAndNumbers.slice(0, 8).map((n, idx) => (
                          <li key={idx}>
                            <BidiText text={n.text} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* 3. Bilingual Study Sections (1. ENGLISH MEDICAL NOTES + ٢. الشرح بالعربي) */}
              {dynamicSheet?.studySections?.map((sec, idx) => (
                <div key={sec.id || idx} className="lecture-section-card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="lecture-section-heading !mb-0">
                      {idx + 1}. <BidiText text={sec.topicTitle} />
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      {sec.kindLabelAr ? (
                        <span className="rounded-full bg-[#19f08c]/15 text-[#19f08c] px-2.5 py-0.5 font-bold">
                          {sec.kindLabelAr}
                        </span>
                      ) : null}
                      {sec.approxTime ? (
                        <span className="font-mono text-[#9aa4b2]">~{sec.approxTime}</span>
                      ) : null}
                    </div>
                  </div>

                  {sec.englishMedicalNotes?.length ? (
                    <div
                      dir="ltr"
                      className="rounded-2xl border-l-4 border-blue-500 bg-blue-500/[0.08] p-4 text-left font-sans"
                    >
                      <strong className="block text-[11px] font-extrabold uppercase tracking-wider text-blue-400 mb-2">
                        1. ENGLISH MEDICAL STUDY NOTES (FOR EXAMS)
                      </strong>
                      <ul className="space-y-1.5 text-sm list-disc pl-5 text-slate-800 dark:text-slate-100">
                        {sec.englishMedicalNotes.map((en, enIdx) => (
                          <li key={enIdx}>{en}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {sec.arabicExplanation?.length ? (
                    <div
                      dir="rtl"
                      className="rounded-2xl border-r-4 border-[#19f08c] bg-[#19f08c]/[0.07] p-4 text-right"
                    >
                      <strong className="block text-xs font-extrabold text-[#19f08c] mb-2">
                        ٢. الشرح والفهم بالعربي
                      </strong>
                      <ul className="space-y-1.5 text-sm list-disc pr-5">
                        {sec.arabicExplanation.map((ar, arIdx) => (
                          <li key={arIdx}>
                            <BidiText text={ar} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}

              {/* AI Grounded Study Notes (if generated from server) */}
              {studyNotes?.sections?.map((sn) => (
                <div key={sn.section_id} className="lecture-section-card">
                  <h3 className="lecture-section-heading">
                    <BidiText text={sn.title || sn.section_id} />
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {[...(sn.basics || []), ...(sn.from_lecture || [])].map((b, idx) => (
                      <li key={idx}>
                        <BidiText text={b.text} />
                        <SourceChip sentenceIds={b.src} added={b.added} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* 4. Medical Definitions Glossary at the VERY END */}
              {dynamicSheet?.glossary?.length ? (
                <div className="lecture-section-card border border-teal-500/35">
                  <h3 className="lecture-section-heading">
                    📖 قاموس التعريفات والمصطلحات الطبية (في نهاية المحاضرة)
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dynamicSheet.glossary.map((g, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-[#0e131b] p-3.5 flex flex-col gap-1.5"
                      >
                        <span
                          dir="ltr"
                          className="inline-block self-start rounded-lg bg-[#19f08c]/15 border border-[#19f08c]/35 px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#19f08c]"
                        >
                          {g.term}
                        </span>
                        <p className="text-xs text-[#f5f7fa] leading-relaxed">
                          <BidiText text={g.ar} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Tab 3: Map-Reduce Grounded Summary */}
          {activeTab === "summary" ? (
            <div className="lecture-reading-column">
              <div className="lecture-section-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="lecture-section-heading !mb-0">{copy.viewer.summaryTab}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "detailed", label: "ملخص مفصّل" },
                      { id: "medium", label: "ملخص متوسط" },
                      { id: "quick", label: "مراجعة سريعة (ليلة الامتحان)" },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setSummaryLevel(lvl.id);
                          handleGenerateSummary(lvl.id);
                        }}
                        className={`rounded-lg px-3 py-1 text-xs font-bold cursor-pointer ${
                          summaryLevel === lvl.id
                            ? "bg-[#19f08c] text-[#03150c]"
                            : "bg-white/[0.05] text-[#9aa4b2] hover:text-[#f5f7fa]"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPrintModalOpen(true)}
                      className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-bold text-[#f5f7fa] cursor-pointer"
                    >
                      🖨️ تنزيل الملخص PDF
                    </button>
                  </div>
                </div>

                {summaryData ? (
                  <div className="space-y-4">
                    {(summaryData.main_points || []).map((mp, idx) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-[#0e131b] p-3">
                        {mp.title ? <strong className="block text-sm mb-1">{mp.title}</strong> : null}
                        <BidiText text={mp.text} />
                        <SourceChip sentenceIds={mp.src} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dynamicSheet?.executiveSummary?.length ? (
                      <div className="space-y-2">
                        {dynamicSheet.executiveSummary.map((line, idx) => (
                          <div key={idx} className="rounded-xl border border-white/10 bg-[#0e131b] p-3 text-sm">
                            <BidiText text={line} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9aa4b2]">اضغط على مستوى الملخص لاستخراج الخلاصة من جمل المحاضرة...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Tab 4: Main Website Native Quiz Engine (StandaloneQuiz + ModernQuizView) */}
          {activeTab === "quiz" ? (
            <div className="lecture-reading-column space-y-6">
              <div className="lecture-section-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="lecture-section-heading !mb-1">
                      🎯 بنك أسئلة وكويزات المحاضرة (بنظام المنصة الأساسي)
                    </h3>
                    <p className="text-xs text-[#9aa4b2]">
                      يتم توليد الامتحان وحفظه في كويزات المنصة الأساسية مع مشاركة الرابط وإرساله كـ Polls لتليجرام
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={lectureQuizCount}
                      onChange={(e) => setLectureQuizCount(Number(e.target.value))}
                      className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2 text-xs text-[#f5f7fa]"
                    >
                      <option value={10}>10 أسئلة</option>
                      <option value={15}>15 سؤال</option>
                      <option value={20}>20 سؤال</option>
                      <option value={30}>30 سؤال</option>
                    </select>
                    <select
                      value={lectureQuizDifficulty}
                      onChange={(e) => setLectureQuizDifficulty(e.target.value)}
                      className="rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2 text-xs text-[#f5f7fa]"
                    >
                      <option value="mixed">مستوى متدرج (امتحان فعلي)</option>
                      <option value="hard">مستوى صعب (Cases & High-Yield)</option>
                      <option value="medium">مستوى متوسط</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerateMainPlatformQuiz}
                      disabled={lectureQuizGenerating}
                      className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      {lectureQuizGenerating ? "جاري بناء كويز المنصة..." : "⚡ توليد كويز جديد على المحاضرة"}
                    </button>
                  </div>
                </div>

                {lectureQuizRecord ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#19f08c]/35 bg-[#19f08c]/10 px-4 py-3">
                    <span className="text-xs font-bold text-[#19f08c]">
                      ✅ تم حفظ الكويز في كويزات المنصة ({lectureQuizRecord.questions?.length || 0} سؤال)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {lectureQuizRecord.id ? (
                        <Link
                          to={`/q/${lectureQuizRecord.id}`}
                          className="rounded-xl bg-[#19f08c] text-[#03150c] px-3.5 py-1.5 text-xs font-extrabold"
                        >
                          🚀 فتح صفحة الامتحان المستقلة (/q/{lectureQuizRecord.id})
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSendLectureQuizToTelegram}
                        disabled={lectureQuizTelegramBusy}
                        className="rounded-xl border border-sky-400/40 bg-sky-500/15 text-sky-200 px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        {lectureQuizTelegramBusy ? "جاري الإرسال..." : "✈️ إرسال لبوت التليجرام"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {lectureQuizTelegramMsg ? (
                  <p className="mb-3 text-xs font-semibold text-amber-300">{lectureQuizTelegramMsg}</p>
                ) : null}
              </div>

              {lectureQuizRecord?.questions?.length ? (
                <ModernQuizView
                  questions={lectureQuizRecord.questions}
                  courseId={activeJobId || "lecture"}
                  userId={profile?.id}
                  courseTitle={docModel.meta?.title || "محاضرة طبية"}
                />
              ) : (
                <div className="lecture-section-card text-center py-10">
                  <p className="text-sm font-bold text-[#f5f7fa] mb-2">
                    {lectureQuizGenerating
                      ? "⏳ جاري تحليل المحاضرة وتوليد أسئلة MCQ و True/False بنظام المنصة..."
                      : "اضغط «توليد كويز جديد على المحاضرة» لبدء الاختبار التفاعلي فوراً"}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Tab 5: Integrated Lecture AI Assistant */}
          {activeTab === "ai_helper" ? (
            <div className="lecture-reading-column">
              <div className="lecture-section-card space-y-4">
                <div>
                  <h3 className="lecture-section-heading !mb-1">🤖 مساعد المحاضرة الطبي الذكي (24/7)</h3>
                  <p className="text-xs text-[#9aa4b2]">
                    اسأل عن أي جزئية في المحاضرة، أو اطلب تبسيط فقرة، أو مقارنة طبية، أو أسئلة شفوي متوقعة
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    "اشرح لي أهم 5 نقاط امتحانات في المحاضرة بالتفصيل",
                    "استخرج كل الأدوية والجرعات والأرقام المذكورة في المحاضرة",
                    "اعمل لي جدول مقارنة لأهم الأمراض أو المفاهيم في المحاضرة",
                    "ما هي أهم التعريفات الطبية المذكورة وكيف تأتي في الامتحان؟",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskLectureAssistant(preset)}
                      disabled={assistantBusy}
                      className="rounded-xl border border-white/10 bg-[#0e131b] hover:border-[#19f08c]/40 px-3 py-1.5 text-xs text-[#f5f7fa] cursor-pointer"
                    >
                      ✨ {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#0e131b] p-4">
                  {assistantMessages.length === 0 ? (
                    <p className="text-xs text-[#9aa4b2] text-center py-6">
                      اختر سؤالاً سريعاً من الأعلى أو اكتب سؤالك بالأسفل وسيجيبك المساعد فوراً من كلام الدكتور.
                    </p>
                  ) : (
                    assistantMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-[#19f08c]/15 border border-[#19f08c]/30 text-[#f5f7fa]"
                            : "bg-white/[0.04] border border-white/10 text-[#f5f7fa]"
                        }`}
                      >
                        <strong className="block text-xs text-[#19f08c] mb-1">
                          {m.role === "user" ? "أنت:" : "🤖 المساعد الطبي الذكي:"}
                        </strong>
                        <BidiText text={m.text} />
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAskLectureAssistant();
                    }}
                    placeholder="اكتب سؤالك حول المحاضرة..."
                    className="flex-1 rounded-xl border border-white/10 bg-[#0e131b] px-3.5 py-2.5 text-sm text-[#f5f7fa] placeholder:text-[#646e7d]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAskLectureAssistant()}
                    disabled={assistantBusy || !assistantInput.trim()}
                    className="btn-primary-glow rounded-xl px-5 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    {assistantBusy ? "جاري الإجابة..." : "إرسال"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 6: Export Options */}
          {activeTab === "export" ? (
            <div className="lecture-reading-column">
              <div className="lecture-section-card space-y-4">
                <h3 className="lecture-section-heading">تصدير وتحميل المحاضرة بجميع الصيغ</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadPostMortemStudyHtml(docModel, {
                        studyNotes,
                        summaryData,
                        aiSheet: aiPostMortemSheet,
                        pdfText: doctorPdfText,
                        figures: doctorFigures,
                        includeFigures: includeDoctorFigures,
                      })
                    }
                    className="rounded-2xl border border-amber-400/50 bg-amber-400/15 p-4 text-right hover:border-amber-300 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">📄 مذكرة Post-Mortem الشاملة (.html) — جداول + SVG + قال الدكتور</strong>
                    <span className="text-xs text-[#9aa4b2]">نفس تنسيق ملف post-mortem-part2-study.html بالضبط مع تجميعة الامتحان وصور الملف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printPostMortemStudyHtml(docModel, {
                        studyNotes,
                        summaryData,
                        aiSheet: aiPostMortemSheet,
                        pdfText: doctorPdfText,
                        figures: doctorFigures,
                        includeFigures: includeDoctorFigures,
                      })
                    }
                    className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-right hover:border-amber-300 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">🖨️ طباعة / حفظ PDF بنمط Post-Mortem (A4)</strong>
                    <span className="text-xs text-[#9aa4b2]">إنجليزي بالتظليل الأصفر + شرح عربي + إطار قال الدكتور + رسومات SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(true)}
                    className="rounded-2xl border border-[#19f08c]/40 bg-[#19f08c]/10 p-4 text-right hover:border-[#19f08c] transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">🖨️ كتاب المذاكرة PDF (3 قوالب A4 جاهزة للطباعة)</strong>
                    <span className="text-xs text-[#9aa4b2]">{copy.export.printHint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadStandaloneHtml(docModel, {
                        includeOfftopic: showOfftopic,
                        includeAnnotations: showAnnotations,
                        studyNotes,
                        summary: summaryData,
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">🌐 كتاب HTML تفاعلي مستقل (يعمل بدون إنترنت)</strong>
                    <span className="text-xs text-[#9aa4b2]">شامل المذكرة المزدوجة والفهرس والوضع الليلي وقاموس التعريفات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPowerPoint("bilingual")}
                    disabled={pptxBusy}
                    className="rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4 text-right hover:border-sky-400 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">📊 عرض PowerPoint (.pptx) — مزدوج (English + عربي)</strong>
                    <span className="text-xs text-[#9aa4b2]">شرائح منظمة للمراجعة السريعة والعرض الأكاديمي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPowerPoint("english_only")}
                    disabled={pptxBusy}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-sky-400/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">📊 عرض PowerPoint (.pptx) — English Exam Slides</strong>
                    <span className="text-xs text-[#9aa4b2]">شرائح النقاط الطبية الإنجليزية الصافية للامتحانات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextExport(docModel, { format: "txt", includeOfftopic: showOfftopic })}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">📄 ملف نصي (.txt)</strong>
                    <span className="text-xs text-[#9aa4b2]">النص الحرفي الكامل مع التوقيت التقريبي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextExport(docModel, { format: "md", includeOfftopic: showOfftopic })}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">📝 ملف ماركداون (.md)</strong>
                    <span className="text-xs text-[#9aa4b2]">مناسب لـ Notion و Obsidian</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ─── Lecture Library (/lectures) ─── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#f5f7fa]">{copy.navMyLectures}</h2>
          <div className="flex gap-1.5 text-xs">
            {[
              { id: "all", label: "الكل" },
              { id: "ready", label: "جاهزة" },
              { id: "active", label: "قيد التفريغ" },
              { id: "failed", label: "فشلت" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 font-semibold cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#19f08c] text-[#03150c]"
                    : "bg-white/[0.05] text-[#9aa4b2] hover:text-[#f5f7fa]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#090c11] p-8 text-center">
            <p className="font-semibold text-[#f5f7fa]">{copy.empty.title}</p>
            <p className="mt-1 text-sm text-[#9aa4b2]">{copy.empty.body}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#090c11] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#f5f7fa]" dir="auto">
                    {job.title}
                  </p>
                  <p className="text-xs text-[#9aa4b2]">
                    {job.source?.duration_sec ? minutesLabel(job.source.duration_sec) : ""}
                    {job.plan?.chunk_count ? ` · ${job.plan.chunk_count} جزء` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={job.status} />
                  <button
                    type="button"
                    onClick={() => openViewer(job.id)}
                    className="rounded-xl border border-white/15 bg-white/[0.04] text-[#f5f7fa] px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    افتح
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteJob(job.id)}
                    className="rounded-xl px-3 py-1.5 text-xs text-rose-400 cursor-pointer"
                  >
                    {copy.actions.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#090c11] border border-white/10 text-[#f5f7fa] p-4 sm:p-6 rounded-3xl" dir="rtl">
          <AiModelsAndProvidersManager isAdmin={true} onConfigUpdated={() => {}} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
