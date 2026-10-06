import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { subscribeToLockdown } from "@/lib/securityGuard";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";

export default function RemoteLockOverlay() {
  const [lockState, setLockState] = useState({ isLocked: false, message: "" });
  const { locale, dir } = useLocale();

  useEffect(() => {
    const unsub = subscribeToLockdown((state) => {
      setLockState(state);
    });
    return unsub;
  }, []);

  if (!lockState.isLocked) return null;

  const msg = locale === "ar" ? lockState.message : (lockState.messageEn || lockState.message);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] bg-[#07090e]/98 backdrop-blur-2xl flex items-center justify-center p-6 text-center select-none"
        dir={dir}
      >
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.03] border border-red-500/30 shadow-[0_0_80px_rgba(239,68,68,0.2)] space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {locale === "ar" ? "قفل النظام المؤقت 🔒" : "System Lockdown 🔒"}
            </h2>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              {msg}
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-2 border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{locale === "ar" ? "إعادة الفحص والتحقق" : "Retry Connection"}</span>
            </Button>
          </div>

          <p className="text-[10px] text-white/30 font-mono">
            BLACK FIGHTERS SECURITY SHIELD • ACCESS SUSPENDED BY COMMAND
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
