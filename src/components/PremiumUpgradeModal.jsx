import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";

export default function PremiumUpgradeModal() {
  const { profile, updateMe, refreshProfile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // تظهر مرة واحدة فقط في حياة المستخدم عبر localStorage وتحديث السيرفر
    const isPremium = profile?.subscription_plan === "premium" || profile?.role === "admin";
    const alreadySeenLocal = localStorage.getItem("premium_celebration_seen_v1") === "true";
    const notified = profile?.premium_notified === true;

    if (isPremium && !notified && !alreadySeenLocal) {
      setOpen(true);
    }
  }, [profile]);

  const handleOk = async () => {
    localStorage.setItem("premium_celebration_seen_v1", "true");
    setOpen(false);
    try {
      await updateMe({ premium_notified: true });
      await refreshProfile();
    } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={handleOk} />

          <motion.div
            dir={dir}
            initial={{ scale: 0.82, y: 35, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative z-10 w-full max-w-md ios-glass-card rounded-3xl p-8 sm:p-9 border border-yellow-400/40 shadow-[0_25px_70px_rgba(255,213,79,0.2)] text-center overflow-hidden"
          >
            {/* Ambient Background Gold Glow */}
            <div className="absolute -top-20 inset-x-0 h-40 bg-gradient-to-b from-yellow-400/20 via-orange-400/10 to-transparent blur-3xl pointer-events-none" />

            {/* Glowing Crown Icon */}
            <motion.div
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="relative mx-auto mb-5 w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-400/20 to-orange-400/20 border border-yellow-400/40 flex items-center justify-center shadow-inner"
            >
              <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_16px_rgba(255,213,79,0.9)]" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-black mb-2 bg-gradient-to-l from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent font-heading">
              {isEn ? "VIP Exclusive Membership" : "عضوية VIP المتميزة"}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed font-medium">
              {isEn
                ? "Congratulations! 🎉 Your VIP subscription is active — all exclusive tools and unlimited features are unlocked."
                : "تهانينا! 🎉 تم تفعيل اشتراكك وتأكيد باقة الـ VIP — جميع الأدوات والميزات الحصرية مفتوحة الآن بالكامل بدون قيود."}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-7 text-start">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{isEn ? "Unlimited Uploads" : "رفع ملفات غير محدود"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{isEn ? "Instant Quiz Gen" : "توليد كويزات فوري"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{isEn ? "Deep Summary Studio" : "استوديو تلخيص متقدم"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{isEn ? "Smart Explanations" : "شروحات ذكية تفاعلية"}</span>
              </div>
            </div>

            <Button onClick={handleOk} className="w-full h-12 rounded-2xl font-black text-base gap-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 text-black shadow-[0_4px_25px_rgba(255,213,79,0.4)] border-none">
              <Sparkles className="w-4 h-4" /> {isEn ? "Continue & Explore" : "متابعة والاستمتاع"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
