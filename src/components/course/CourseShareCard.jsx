import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Twitter, Swords, Coins } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

const LOGO_URL = "/icons/black-fighters-192.png";

export default function CourseShareCard({ course }) {
  const { locale, dir } = useLocale();
  const navigate = useNavigate();
  const isEn = locale === "en";
  const [copied, setCopied] = useState(false);

  const priceCredits = Number(course?.price_credits || 0);
  const appUrl = course?.id ? `${window.location.origin}/course/${course.id}` : window.location.origin;

  const shareText = isEn
    ? `I just studied "${course?.title}" on Black Fighters 📚\n\nAI converted lecture notes into interactive quizzes, structured summaries, and spaced flashcards! 🔥${priceCredits > 0 ? `\n(Unlock: ${priceCredits} Credits)` : ""}`
    : `بدأت كورس "${course?.title}" على منصة Black Fighters 📚\n\nالذكاء الاصطناعي حوّل المحاضرة لكورس كامل بكويزات وملخصات وبطاقات مراجعة! 🔥${priceCredits > 0 ? `\n(الدخول: ${priceCredits} كريدت)` : ""}`;
  const fullText = `${shareText}\n\n${appUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success(isEn ? "Copied to clipboard! 📋" : "اتنسخ! 📋");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, "_blank");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: course?.title, text: shareText, url: appUrl });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl border border-accent/25 p-5"
      dir={dir}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-accent" />
          <h3 className="font-extrabold">{isEn ? "Share Your Progress 🏆" : "شارك إنجازك 🏆"}</h3>
        </div>
        {priceCredits > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <Coins className="w-3.5 h-3.5" /> {priceCredits} {isEn ? "Credits" : "كريدت"}
          </span>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 border border-border mb-4 text-sm leading-relaxed text-muted-foreground" dir={dir}>
        <div className="flex items-center gap-2 mb-2">
          <img src={LOGO_URL} alt="Black Fighters" className="w-6 h-6 rounded-lg" />
          <span className="font-bold text-foreground">Black Fighters</span>
        </div>
        {shareText}
        <div className="mt-2 text-xs text-primary font-mono select-all truncate" dir="ltr">
          {appUrl}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button onClick={copy} variant="outline" size="sm" className="gap-2 flex-1 font-bold">
          {copied ? <Check className="w-4 h-4 text-[hsl(152,100%,50%)]" /> : <Copy className="w-4 h-4" />}
          {copied ? (isEn ? "Copied!" : "اتنسخ!") : (isEn ? "Copy" : "نسخ")}
        </Button>
        <Button onClick={shareTwitter} variant="outline" size="sm" className="gap-2 flex-1 font-bold">
          <Twitter className="w-4 h-4" /> X
        </Button>
        <Button onClick={nativeShare} size="sm" className="gap-2 flex-1 font-bold">
          <Share2 className="w-4 h-4" /> {isEn ? "Share" : "مشاركة"}
        </Button>
      </div>

      {course?.id && (
        <Button
          onClick={() => navigate(`/challenge/new/${course.id}`)}
          size="sm"
          className="w-full gap-2 font-bold rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-600 hover:to-orange-600 text-white shadow-md shadow-orange-500/20"
        >
          <Swords className="w-4 h-4" />
          {isEn ? "Start Live Challenge on this Course ⚔️" : "بدء تحدّي مباشر على هذا الكورس ⚔️"}
        </Button>
      )}
    </motion.div>
  );
}
