import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function OtpVerify({ email, onVerify, onResend, onBack }) {
  const { locale } = useLocale();
  const isEn = locale === "en";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (code) => {
    const otpCode = code || digits.join("");
    if (otpCode.length !== 6) return toast.error(isEn ? "Please enter complete 6-digit code" : "اكتب الكود كامل (6 أرقام)");
    setLoading(true);
    try {
      await onVerify(otpCode);
    } catch (err) {
      const msg = err.message || "";
      if (/invalid|wrong|incorrect|expired/i.test(msg)) {
        toast.error(isEn ? "Code is invalid or expired — try again" : "الكود غلط أو منتهي — جرب تاني");
      } else {
        toast.error(msg || (isEn ? "Verification failed" : "حصل خطأ في التحقق"));
      }
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (digits.every((d) => d !== "")) submit(digits.join(""));
  }, [digits]);

  const resend = async () => {
    try {
      await onResend();
      setCooldown(30);
      toast.success(isEn ? "Verification code resent 📩" : "بعتنا الكود تاني 📩");
    } catch {
      toast.error(isEn ? "Unable to send code — try again shortly" : "مش قادرين نبعت الكود — جرب بعد شوية");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-primary/10 border border-primary/30 neon-glow-cyan">
        <MailCheck className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-black">{isEn ? "Verify Your Email" : "أكّد إيميلك"}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        {isEn ? "We sent a 6-digit verification code to" : "بعتنا كود من 6 أرقام على"}
        <br />
        <span className="text-foreground font-bold" dir="ltr">{email}</span>
      </p>

      <div dir="ltr" className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            inputMode="numeric"
            maxLength={1}
            disabled={loading}
            className="w-12 h-14 text-center text-xl font-black rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-foreground"
          />
        ))}
      </div>

      <Button onClick={() => submit()} disabled={loading} className="w-full h-11 font-bold gap-2 mb-3">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {isEn ? "Confirm Code" : "تأكيد الكود"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          {isEn ? "← Back" : "← رجوع"}
        </button>
        {cooldown > 0 ? (
          <span className="text-muted-foreground">{isEn ? `Resend in (${cooldown})` : `إعادة الإرسال (${cooldown})`}</span>
        ) : (
          <button onClick={resend} className="text-primary font-bold hover:underline">
            {isEn ? "Resend Code" : "إعادة إرسال الكود"}
          </button>
        )}
      </div>
    </motion.div>
  );
}