import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FolderClock, HardDrive, Trash2, Image as ImageIcon, 
  HelpCircle, Calendar, Sparkles, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/LocaleContext";
import { listExtractionHistory, getExtractionSession, deleteExtractionSession } from "@/lib/imageExtractorDb";
import { playClick } from "@/lib/sounds";
import { toast } from "sonner";

export function ImageLibrary({ onLoadSession, onNewExtraction }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessionId, setLoadingSessionId] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const rows = await listExtractionHistory();
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelectSession = async (id) => {
    try {
      playClick();
      setLoadingSessionId(id);
      const session = await getExtractionSession(id);
      if (!session) {
        toast.error(isEn ? "Session not found" : "تعذر العثور على الجلسة");
        return;
      }
      onLoadSession(session);
    } catch (err) {
      toast.error(err?.message || (isEn ? "Failed to load session" : "فشل تحميل الجلسة المحفوظة"));
    } finally {
      setLoadingSessionId(null);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(isEn ? "Are you sure you want to delete this saved session?" : "هل أنت متأكد من حذف هذه الحزمة المحفوظة؟")) return;
    try {
      playClick();
      await deleteExtractionSession(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      toast.success(isEn ? "Session deleted from library" : "تم حذف الحزمة من المكتبة");
    } catch (err) {
      toast.error(isEn ? "Could not delete" : "تعذر الحذف");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" dir={dir}>
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#0a0b12] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-black text-white font-heading">
              {isEn ? "Local Visual Library (IndexedDB) 📚" : "مكتبتي المحلية للصور والمحاضرات (IndexedDB) 📚"}
            </h3>
          </div>
          <p className="text-xs text-white/60">
            {isEn
              ? "All extracted slide decks and graphics are stored locally on your device with zero cloud lag."
              : "جميع الحزم والصور التي استخرجتها محفوظة على جهازك بدون سيرفر وبسرعة فائقة"}
          </p>
        </div>

        <Button
          type="button"
          onClick={onNewExtraction}
          className="h-10 px-5 rounded-xl text-xs font-black bg-primary text-black hover:opacity-90 gap-2 shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isEn ? "Extract New File 🚀" : "استخراج ملف جديد 🚀"}</span>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <span className="text-xs text-white/50">{isEn ? "Loading library history..." : "جاري تحميل سجل المكتبة..."}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 max-w-md mx-auto">
          <FolderClock className="w-12 h-12 text-white/20 mx-auto" />
          <h4 className="text-base font-bold text-white">
            {isEn ? "No saved sessions yet" : "لا توجد حزم محفوظة بعد"}
          </h4>
          <p className="text-xs text-white/50 leading-relaxed">
            {isEn
              ? 'When you extract visual slides, click "Save to Local Library" to restore them anytime without re-uploading.'
              : 'عندما تستخرج صوراً من أي ملف، اضغط على "حفظ في مكتبتي المحلية" لتظهر هنا وتسترجعها في أي وقت بدون رفع الملف مجدداً.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              onClick={() => handleSelectSession(item.id)}
              className="p-5 rounded-2xl bg-[#0c0d15] border border-white/10 hover:border-primary/50 transition-colors cursor-pointer space-y-3 group shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-cyan-300 border border-primary/20">
                    {item.sourceType?.toUpperCase()}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, item.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title={isEn ? "Delete from library" : "حذف من المكتبة"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                  {item.fileName}
                </h4>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-cyan-400" />
                    <span>{item.totalImages} {isEn ? "images" : "صورة"}</span>
                  </span>

                  {item.quizzesCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <HelpCircle className="w-3 h-3" />
                      <span>{item.quizzesCount} {isEn ? "quizzes" : "كويز"}</span>
                    </span>
                  )}
                </div>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-white/30" />
                  <span>{new Date(item.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-EG")}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageLibrary;
