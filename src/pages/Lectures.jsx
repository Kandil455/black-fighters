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
import { downloadStandaloneHtml } from "@/features/lectures/export/exportHtml";
import { downloadTextExport } from "@/features/lectures/export/exportText";
import { PrintView } from "@/features/lectures/export/PrintView";
import "@/features/lectures/styles/lecture-doc.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AiModelsAndProvidersManager from "@/components/settings/AiModelsAndProvidersManager";

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

  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);

  // ─── live list of my lectures ─────────────────────────────────────────────
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
      () => setJobs([]),
    );
    return () => unsub();
  }, [profile?.id]);

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
      await lectureApi.finalize(jobId);
      await lectureApi.organize(jobId).catch((err) => {
        console.warn("[lectures] organize failed:", err?.message);
      });
      setPhase("done");
      await openViewer(jobId);
    } catch (err) {
      console.warn("[lectures] pipeline failed:", err?.message);
      setError(copy.errors[err?.message] || copy.errors.GENERIC);
      setPhase("confirm");
    }
  }, [prep, file, title, subject, lecturer, glossaryInput, openViewer]);

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

      {/* ─── upload card ─── */}
      {!viewerData && (phase === "idle" || phase === "prepare") ? (
        <section className="mb-8 rounded-3xl border-2 border-dashed border-[#19f08c]/35 bg-[#090c11] p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary-glow rounded-2xl px-8 py-4 text-lg font-bold cursor-pointer"
            disabled={phase === "prepare"}
          >
            {phase === "prepare" ? copy.upload.planning : copy.upload.cta}
          </button>
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

              {/* 4 Primary Action Buttons (Section 16.3) */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {copy.actions.pdf}
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
                  {copy.actions.html}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("study")}
                  className="rounded-xl border border-[#19f08c]/40 bg-[#19f08c]/10 text-[#19f08c] px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {copy.actions.restyle}
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
                  {aiWorking ? copy.actions.working : copy.actions.summary}
                </button>
              </div>
            </div>

            {/* Secondary Tabs + Reader Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex flex-wrap gap-1.5" role="tablist">
                {[
                  { id: "transcript", label: copy.viewer.transcriptTab },
                  { id: "study", label: copy.viewer.studyTab },
                  { id: "summary", label: copy.viewer.summaryTab },
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

          {/* Tab 2: Study View + Grounded Study Notes */}
          {activeTab === "study" && studyView ? (
            <div className="lecture-reading-column space-y-6">
              <div className="lecture-section-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="lecture-section-heading !mb-0">{copy.viewer.quickReview}</h3>
                  <button
                    type="button"
                    onClick={handleGenerateStudyNotes}
                    disabled={aiWorking}
                    className="btn-primary-glow rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    {aiWorking ? copy.actions.working : copy.viewer.generateStudyNotes}
                  </button>
                </div>

                {studyView.quickReviewGroups.length === 0 ? (
                  <p className="text-xs text-[#9aa4b2]">اضغط «توليد شرح مبسّط» لاستخراج نقاط المذاكرة من كلام الدكتور.</p>
                ) : (
                  <div className="space-y-4">
                    {studyView.quickReviewGroups.map((grp) => (
                      <div key={grp.kind} className="rounded-xl border border-white/10 bg-[#0e131b] p-3">
                        <h4 className="text-xs font-bold text-[#19f08c] mb-2">
                          {grp.labelAr} ({grp.count})
                        </h4>
                        <ul className="space-y-1.5 text-sm">
                          {grp.items.map((it) => (
                            <li key={it.sentenceId}>
                              <BidiText text={it.text} />
                              <SourceChip sentenceIds={[it.sentenceId]} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
            </div>
          ) : null}

          {/* Tab 3: Map-Reduce Grounded Summary */}
          {activeTab === "summary" ? (
            <div className="lecture-reading-column">
              <div className="lecture-section-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="lecture-section-heading !mb-0">{copy.viewer.summaryTab}</h3>
                  <div className="flex gap-1.5">
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
                  <p className="text-xs text-[#9aa4b2]">جاري استخراج الخلاصة من جمل المحاضرة...</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Tab 4: Export Options */}
          {activeTab === "export" ? (
            <div className="lecture-reading-column">
              <div className="lecture-section-card space-y-4">
                <h3 className="lecture-section-heading">تصدير المحاضرة</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(true)}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">طباعة / حفظ PDF (A4)</strong>
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
                    <strong className="block text-sm text-[#f5f7fa]">ملف HTML مستقل (يشتغل بدون إنترنت)</strong>
                    <span className="text-xs text-[#9aa4b2]">شامل الفهرس والبحث والوضع الليلي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextExport(docModel, { format: "txt", includeOfftopic: showOfftopic })}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">ملف نصي (.txt)</strong>
                    <span className="text-xs text-[#9aa4b2]">النص الحرفي الكامل مع التوقيت التقريبي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextExport(docModel, { format: "md", includeOfftopic: showOfftopic })}
                    className="rounded-2xl border border-white/10 bg-[#0e131b] p-4 text-right hover:border-[#19f08c]/50 transition-colors cursor-pointer"
                  >
                    <strong className="block text-sm text-[#f5f7fa]">ملف ماركداون (.md)</strong>
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
