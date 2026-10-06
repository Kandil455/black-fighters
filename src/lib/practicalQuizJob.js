import { generateImageQuiz } from "./imageFilter";
import { saveExtractionSession } from "./imageExtractorDb";
import { getPracticalQuizCost } from "./creditCosts";
import { base44 } from "@/api/base44Client";
import { getAiConfig } from "@/api/index";
import { GEMINI_KEYS_POOL } from "./ai";
import { playSuccess } from "./sounds";
import { toast } from "sonner";

class PracticalQuizJobManager {
  constructor() {
    this.job = {
      isRunning: false,
      current: 0,
      total: 0,
      percent: 0,
      fileName: "",
      targetTotal: 0,
      images: [],
      quizzesMap: {},
      isCompleted: false,
    };
    this.listeners = new Set();
  }

  getState() {
    return this.job;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.job });
      } catch (err) {
        console.warn("[PracticalQuizJob] listener error:", err);
      }
    }
  }

  async startJob({ images, allocation, targetTotal, difficulty, fileName, profile, language = "auto" }) {
    if (this.job.isRunning) {
      toast.info("هناك كويز عملي قيد التوليد بالفعل في الخلفية!");
      return;
    }

    this.job = {
      isRunning: true,
      current: 0,
      total: allocation.length,
      percent: 0,
      fileName: fileName || "practical_quiz",
      targetTotal,
      images: [...images],
      quizzesMap: {},
      isCompleted: false,
      language,
    };
    this.notify();

    toast.info("🚀 بدأ توليد الكويز العملي في الخلفية! يمكنك تصفح الموقع بحرية وسنخبرك فور جهوزه.");

    // Calculated strictly by question count: 1 credit per 5 questions
    const estimatedCredits = getPracticalQuizCost(targetTotal);

    try {
      const baseAiConfig = await getAiConfig();
      const quizzesMap = {};

      // ── Process in parallel batches of 5 with rotated keys for maximum throughput ──
      const CONCURRENCY = 5;
      let completedCount = 0;

      for (let i = 0; i < allocation.length; i += CONCURRENCY) {
        const batch = allocation.slice(i, i + CONCURRENCY);

        await Promise.all(
          batch.map(async (item, batchIdx) => {
            try {
              // Safely select Gemini key or leave blank for secure server proxy
              const isCandidateGeminiKey = (k) => {
                if (!k || typeof k !== "string") return false;
                const clean = k.replace(/^["']|["']$/g, "").trim();
                return clean.length >= 15 && !clean.startsWith("gsk_") && !clean.startsWith("sk-or-") && !clean.startsWith("apx_") && clean !== "none";
              };
              const validGeminiPool = (GEMINI_KEYS_POOL || []).filter(isCandidateGeminiKey);
              const userKeyIsGemini = isCandidateGeminiKey(baseAiConfig?.api_key);
              const keyIndex = validGeminiPool.length > 0 ? ((i + batchIdx) % validGeminiPool.length) : 0;
              const chosenKey = validGeminiPool[keyIndex] || (userKeyIsGemini ? baseAiConfig.api_key : "");

              const rotatedConfig = {
                ...baseAiConfig,
                provider: "gemini",
                model: "gemini-3.5-flash-lite",
                api_key: chosenKey,
              };

              const questions = await generateImageQuiz(
                item.img,
                { numQuestions: item.count, difficulty, customExplanation: item.img.contextText, language },
                rotatedConfig
              );
              if (questions && questions.length > 0) {
                quizzesMap[item.img.id] = questions;
              }
            } catch (qErr) {
              console.warn(`[practicalQuizJob] Failed for image ${item.img.id}:`, qErr);
            } finally {
              completedCount++;
              this.job.current = completedCount;
              this.job.percent = Math.round((completedCount / allocation.length) * 100);
              this.job.quizzesMap = { ...quizzesMap };
              this.notify();
            }
          })
        );
      }

      // Update images with quizzes
      const updatedImages = this.job.images.map((img) =>
        quizzesMap[img.id] ? { ...img, quiz: quizzesMap[img.id] } : img
      );

      this.job.images = updatedImages;
      this.job.isCompleted = true;
      this.job.isRunning = false;
      this.job.percent = 100;
      this.notify();

      // Deduct credits if not pro
      if (estimatedCredits > 0 && !profile?.is_pro) {
        try {
          await base44.functions.invoke("chargeAiJob", {
            action: "charge",
            cost: estimatedCredits,
            amount: estimatedCredits,
            description: `توليد كويزات صور علمية (${allocation.length} صورة / ${targetTotal} سؤال)`,
          });
        } catch {}
      }

      // Auto save to IndexedDB
      try {
        await saveExtractionSession({
          id: `session_${Date.now()}`,
          fileName: this.job.fileName,
          totalExtracted: updatedImages.length,
          keptCount: updatedImages.filter((img) => img.status !== "rejected").length,
          quizzesCount: updatedImages.filter((img) => img.status !== "rejected" && img.quiz?.length > 0).length,
          images: updatedImages,
        });
      } catch (saveErr) {
        console.warn("[practicalQuizJob] auto save error:", saveErr);
      }

      playSuccess();
      toast.success(`🎯 تم إكمال توليد الكويز العملي (${targetTotal} سؤال) في الخلفية بنجاح!`, {
        duration: 12000,
        action: {
          label: "فتح الكويز الآن ⚡",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = "/practical";
            }
          },
        },
      });
    } catch (err) {
      console.error("[practicalQuizJob] Job failed:", err);
      this.job.isRunning = false;
      this.notify();
      toast.error(err?.message || "حدث خطأ أثناء توليد الكويز في الخلفية.");
    }
  }

  clearJob() {
    this.job = {
      isRunning: false,
      current: 0,
      total: 0,
      percent: 0,
      fileName: "",
      targetTotal: 0,
      images: [],
      quizzesMap: {},
      isCompleted: false,
    };
    this.notify();
  }
}

export const practicalQuizJob = new PracticalQuizJobManager();
export default practicalQuizJob;
