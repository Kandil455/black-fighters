import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Flame } from "lucide-react";

export default function TojiCoach({ course, generatedCount = 0 }) {
  const progress = Math.round((Math.min(generatedCount, 3) / 3) * 100);
  const message = progress >= 100
    ? "كده الكورس جاهز للسيطرة الكاملة. راجع وادخل الكويز بثقة."
    : progress >= 67
      ? "فاضل خطوة صغيرة وتبقى جاهز. كمّل آخر جزء يا بطل."
      : "ابدأ بالتلخيص والكويز، وأنا متابع تقدمك خطوة بخطوة.";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 18 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="ios-glass-card rounded-3xl border border-accent/40 p-6 mb-6 overflow-hidden relative shadow-[0_12px_40px_rgba(191,95,255,0.15)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(270_100%_68%/.15),transparent_40%),radial-gradient(circle_at_85%_50%,hsl(184_100%_50%/.12),transparent_40%)] pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Animated Holographic Core Avatar */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <motion.div 
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-accent to-primary opacity-30 blur-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="w-20 h-20 rounded-2xl bg-white/[0.05] border border-white/20 backdrop-blur-xl flex items-center justify-center relative z-10 shadow-inner">
            <Flame className="w-10 h-10 text-accent animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[hsl(152,100%,50%)] border-2 border-background animate-ping" />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-start">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-black text-accent mb-1">
            <Sparkles className="w-4 h-4" /> مساعد الذكاء الاصطناعي الذكي
          </div>
          <p className="font-black text-lg text-foreground truncate font-heading">{course?.title}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{message}</p>
          
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div 
                initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
                animate={{ clipPath: `inset(0% ${100 - progress}% 0% 0%)` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-l from-primary via-cyan-400 to-accent rounded-full shadow-[0_0_10px_rgba(0,245,255,0.5)]" 
              />
            </div>
            <span className="text-xs font-black text-primary flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
