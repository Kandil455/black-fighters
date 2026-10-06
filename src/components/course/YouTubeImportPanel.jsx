import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Youtube, Sparkles, Loader2, PlayCircle, AlertCircle, Crown } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";
import { fetchYouTubeTranscript, extractYouTubeId } from "@/lib/youtubeService";
import { toast } from "sonner";

export default function YouTubeImportPanel({ onImportTranscript }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const { profile, isAdmin, isPremium } = useAuth();

  const isSubscriber = Boolean(
    isPremium ||
    isAdmin ||
    profile?.isPremium ||
    profile?.is_pro ||
    profile?.subscription_status === "active" ||
    ["starter", "pro", "plus", "max", "ultimate", "supreme", "premium"].includes(
      (profile?.subscription_plan || "").toLowerCase()
    )
  );

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickPaste = () => {
    if (!isSubscriber) {
      toast.error(isEn ? "YouTube import requires a paid subscription" : "استيراد وتلخيص فيديوهات يوتيوب متاح حصرياً للمشتركين!");
      return;
    }
    setUrl("https://youtu.be/IKlpGhcWjo0");
    setError("");
  };

  const handleFetch = async () => {
    if (!isSubscriber) {
      setError(isEn ? "YouTube import requires a paid subscription" : "استيراد وتلخيص فيديوهات يوتيوب متاح حصرياً للمشتركين!");
      toast.error(isEn ? "Exclusive subscriber feature" : "هذه الميزة متاحة حصرياً للمشتركين!");
      return;
    }

    if (!url.trim()) {
      setError(isEn ? "Please enter a valid YouTube URL" : "يرجى إدخال رابط يوتيوب أولاً");
      return;
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setError(isEn ? "Invalid YouTube URL format" : "رابط اليوتيوب غير صالح، تأكد من صحته");
      return;
    }

    setError("");
    setLoading(true);

    try {
      toast.loading(isEn ? "Fetching video transcript..." : "جاري سحب نص وترجمة المحاضرة من يوتيوب... 🔍", { id: "yt-fetch" });
      const data = await fetchYouTubeTranscript(url);
      
      if (data.hasCaptions === false) {
        toast.success(
          isEn
            ? "Lecture topic & syllabus imported successfully! ✨"
            : "تم استيراد محاور وموضوع المحاضرة وتجهيزها للتلخيص بنجاح! ✨",
          { id: "yt-fetch", duration: 4500 }
        );
      } else {
        toast.success(
          isEn
            ? `Transcript fetched (${data.charCount} chars)!`
            : `تم سحب نص وترجمة المحاضرة بنجاح (${data.charCount} حرف) ✨`,
          { id: "yt-fetch" }
        );
      }
      
      onImportTranscript({
        text: data.transcript,
        title: data.title || (isEn ? `YouTube Lecture (${data.videoId})` : `محاضرة يوتيوب (${data.videoId})`),
        sourceUrl: url,
        videoId: data.videoId,
      });
    } catch (err) {
      console.error("YouTube import failed:", err);
      const msg = err.message || (isEn ? "Failed to extract captions" : "تعذر سحب الترجمة من هذا الفيديو");
      setError(msg);
      toast.error(msg, { id: "yt-fetch" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card border border-red-500/25 rounded-3xl p-6 mt-5 relative overflow-hidden group">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-red-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/15 transition-colors duration-500" />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
            <Youtube className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-foreground">
            {isEn ? "Or Import from YouTube Video" : "أو استورد من فيديو يوتيوب مباشرة"}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleQuickPaste}
          className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <PlayCircle className="w-3 h-3" />
          {isEn ? "Try Demo Video" : "جرّب فيديو تجريبي"}
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {isEn
          ? "Paste any medical or educational YouTube link. AI will pull the transcript and build your lecture summary."
          : "الصق رابط أي فيديو طبي أو تعليمي، والذكاء الاصطناعي هيسحب المحتوى ويصيغ المذكرة فوراً."}
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isSubscriber ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {isEn ? "Exclusive to Active Subscribers" : "ميزة حصرية للمشتركين في الباقات"}
              </h4>
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Upgrade your membership to unlock instant YouTube video transcription and AI synthesis."
                  : "اشترك في إحدى باقات المنصة لتفعيل السحب التلقائي لمحاضرات اليوتيوب وبناء المذكرات الذكية."}
              </p>
            </div>
          </div>
          <Link
            to="/subscriptions"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shrink-0 shadow-lg shadow-amber-500/20 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isEn ? "Upgrade Plan" : "ترقية الحساب"}</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
            className="bg-background/80 border-white/10 focus-visible:ring-red-500/50 flex-1 font-mono text-sm"
            dir="ltr"
            disabled={loading}
          />
          <Button
            type="button"
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold gap-2 shadow-lg shadow-red-600/20 px-6 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? "Extracting..." : "جاري السحب..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isEn ? "Import & Summarize" : "استيراد وتلخيص المحاضرة"}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
