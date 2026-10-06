import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Share2, Trash2, Users, Check, Swords, CheckSquare, Square, Play, Bot } from "lucide-react";
import { toast } from "sonner";
import QuizExportButton from "@/components/quiz/QuizExportButton";
import { cn } from "@/lib/utils";

export default function QuizCard({ quiz, onDelete, isSelected, onToggleSelect }) {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/q/${quiz.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("اتنسخ لينك الكويز ✅ ابعته لأي حد");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("معرفناش ننسخ اللينك");
    }
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.9, rotateX: -12 },
        show: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: { type: "spring", stiffness: 260, damping: 18 } },
      }}
      whileHover={{ y: -8, scale: 1.035, rotateZ: -0.5, transition: { type: "spring", stiffness: 320, damping: 14 } }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/q/${quiz.id}`)}
      style={{ transformPerspective: 900 }}
      className={cn(
        "relative glass-card rounded-2xl p-5 border transition-colors cursor-pointer group overflow-hidden",
        isSelected ? "border-destructive/80 neon-glow-cyan bg-destructive/5" : "border-border hover:border-primary/50 hover:neon-glow-cyan"
      )}
    >
      {/* sheen sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      <div className="flex items-start justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect(quiz.id); }}
              className="text-muted-foreground hover:text-destructive transition-colors z-10 p-1 cursor-pointer"
            >
              {isSelected ? <CheckSquare className="w-5 h-5 text-destructive" /> : <Square className="w-5 h-5" />}
            </div>
          )}
          <motion.div
            whileHover={{ rotate: [0, -12, 12, -8, 0], scale: 1.15 }}
            transition={{ duration: 0.6 }}
            className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:neon-glow-cyan"
          >
            <Brain className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            title="امتحان الكويز على التليجرام"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://t.me/black_fighters_bot?start=quiz_${quiz.id}`, "_blank");
              toast.success("🚀 تم فتح الكويز على بوت التيليجرام (@black_fighters_bot)!");
            }}
          >
            <Bot className="w-4 h-4" />
          </Button>
          <QuizExportButton quiz={quiz} />
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleShare}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
          </Button>
          {onDelete && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(quiz); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <h3 className="font-extrabold text-base mb-1 line-clamp-1">{quiz.title}</h3>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span>{quiz.questions?.length || 0} سؤال</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {quiz.attempts_count || 0} محاولة</span>
      </div>
      <Button
        size="sm"
        className="w-full mb-2 gap-1.5 font-black text-xs"
        onClick={(e) => { e.stopPropagation(); navigate(`/q/${quiz.id}`); }}
      >
        <Play className="w-3.5 h-3.5 fill-current" /> ابدأ الحل
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 font-bold text-xs border-accent/30 text-accent hover:bg-accent/10"
        onClick={(e) => { e.stopPropagation(); navigate(`/challenge/new/${quiz.id}`); }}
      >
        <Swords className="w-3.5 h-3.5" /> ابدأ تحدّي
      </Button>
    </motion.div>
  );
}
