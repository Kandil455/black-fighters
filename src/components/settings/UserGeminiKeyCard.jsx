import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Eye, EyeOff, Key, Loader2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getIntegrationSettings,
  saveIntegrationSettings,
  getUserGeminiKeySync,
  setUserGeminiKeyLocal,
  getUserGeminiModeSync,
} from "@/lib/integrations";
import { useLocale } from "@/lib/LocaleContext";

function isValidGeminiKey(raw) {
  const cleaned = String(raw || "").trim();
  return /^AIza[0-9A-Za-z_-]{25,60}$/.test(cleaned);
}

function maskGeminiKey(raw) {
  const cleaned = String(raw || "").trim();
  if (cleaned.length <= 10) return "";
  return `${cleaned.slice(0, 6)}••••••••${cleaned.slice(-4)}`;
}

export default function UserGeminiKeyCard() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState(() => getUserGeminiKeySync());
  const [savedKey, setSavedKey] = useState(() => getUserGeminiKeySync());
  const [mode, setMode] = useState(() => getUserGeminiModeSync());
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await getIntegrationSettings();
        if (!mounted) return;
        const remoteKey = String(settings?.gemini_api_key || getUserGeminiKeySync() || "").trim();
        const remoteMode = String(settings?.ai_key_preference || getUserGeminiModeSync() || "auto_fallback");
        if (remoteKey) {
          setApiKey(remoteKey);
          setSavedKey(remoteKey);
          setUserGeminiKeyLocal(remoteKey, remoteMode);
        }
        setMode(remoteMode);
      } catch {
        // Keep local fallback
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    const clean = apiKey.trim();
    if (clean && !isValidGeminiKey(clean)) {
      toast.error(
        isEn
          ? "Invalid Gemini API key format. Must start with AIza."
          : "صيغة مفتاح Gemini غير صحيحة — يجب أن يبدأ المفتاح بـ AIza"
      );
      return;
    }

    setSaving(true);
    try {
      setUserGeminiKeyLocal(clean, mode);
      await saveIntegrationSettings({
        gemini_api_key: clean,
        ai_key_preference: mode,
      });
      setSavedKey(clean);
      toast.success(
        clean
          ? isEn
            ? "Personal Gemini API key saved & prioritized for lecture processing!"
            : "تم حفظ مفتاح Gemini الشخصي بنجاح وتفعيله كأولوية لتفريغ وتلخيص المحاضرات ✅"
          : isEn
          ? "AI key preferences updated"
          : "تم تحديث تفضيلات التشغيل التلقائي بنجاح"
      );
    } catch (err) {
      toast.error(err?.message || (isEn ? "Failed to save key" : "تعذر حفظ الإعدادات"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    const clean = apiKey.trim();
    if (!isValidGeminiKey(clean)) {
      toast.error(
        isEn
          ? "Please enter a valid Gemini key starting with AIza"
          : "يرجى إدخال مفتاح Gemini صحيح يبدأ بـ AIza أولاً"
      );
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(clean)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "أجب بكلمة واحدة: جاهز" }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 16 },
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      toast.success(
        isEn
          ? "Gemini API key verified and ready for lecture transcription!"
          : "تم التحقق من مفتاح Gemini بنجاح! المفتاح نشط وجاهز لتفريغ وتلخيص المحاضرات 🎉"
      );
    } catch {
      toast.error(
        isEn
          ? "Key verification failed — please check that your Gemini key is active"
          : "تعذر التحقق من المفتاح — تأكد من صلاحية مفتاح Gemini الخاص بك"
      );
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      setApiKey("");
      setSavedKey("");
      setMode("auto_fallback");
      setUserGeminiKeyLocal("", "auto_fallback");
      await saveIntegrationSettings({
        gemini_api_key: "",
        ai_key_preference: "auto_fallback",
      });
      toast.success(
        isEn
          ? "Personal Gemini key removed. Using automatic platform fallback."
          : "تم مسح المفتاح الشخصي والعودة للوضع التلقائي للمنصة"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-border flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border space-y-6" dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              {isEn ? "Personal Gemini API Key (Lecture Processing)" : "مفتاح Gemini الشخصي (تفريغ وتلخيص المحاضرات)"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEn
                ? "Your personal key is prioritized first for lecture transcription & summaries, with automatic fallback to platform keys."
                : "يُمنح مفتاحك الشخصي الأولوية القصوى عند تفريغ المحاضرات وتلخيصها، مع عمل المنصة تلقائياً في حال عدم إضافته."}
            </p>
          </div>
        </div>

        {savedKey ? (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isEn ? `Active (${maskGeminiKey(savedKey)})` : `مفعّل (${maskGeminiKey(savedKey)})`}
          </span>
        ) : (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {isEn ? "Auto Platform Key Active" : "المفتاح التلقائي للمنصة مفعّل"}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground block">
          {isEn ? "Google Gemini API Key (starts with AIza)" : "مفتاح Google Gemini API (يبدأ بـ AIza)"}
        </label>
        <div className="relative">
          <Input
            dir="ltr"
            type={showKey ? "text" : "password"}
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-11 font-mono text-sm pr-11"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute top-0 right-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showKey ? "Hide API Key" : "Show API Key"}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("auto_fallback")}
          className={`text-start p-3.5 rounded-2xl border transition-all ${
            mode === "auto_fallback"
              ? "border-emerald-500/60 bg-emerald-500/10"
              : "border-border bg-background/40 hover:bg-background/70"
          }`}
        >
          <p className="text-xs font-bold">
            {isEn ? "Smart Priority + Auto Fallback (Recommended)" : "أولوية لمفتاحك + تشغيل تلقائي (موصى به)"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isEn
              ? "Uses your key first if provided; falls back automatically to platform keys."
              : "يستخدم مفتاحك الشخصي أولاً إن وُجد، ويعمل تلقائياً بمفتاح المنصة عند تركه فارغاً."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("user_only")}
          className={`text-start p-3.5 rounded-2xl border transition-all ${
            mode === "user_only"
              ? "border-emerald-500/60 bg-emerald-500/10"
              : "border-border bg-background/40 hover:bg-background/70"
          }`}
        >
          <p className="text-xs font-bold">
            {isEn ? "Use My Personal Key Only" : "استخدام مفتاحي الشخصي فقط"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isEn
              ? "Strictly uses your personal Gemini key for all lecture operations."
              : "يعتمد حصرياً على مفتاحك الشخصي في تفريغ وتلخيص جميع المحاضرات."}
          </p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isEn ? "Save Key Settings" : "حفظ إعدادات المفتاح"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleTestKey}
          disabled={testing || !apiKey.trim()}
          className="font-bold gap-2"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isEn ? "Verify Key" : "فحص المفتاح"}
        </Button>

        {savedKey && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={saving}
            className="text-rose-400 hover:text-rose-300 font-bold gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            {isEn ? "Remove Key" : "مسح المفتاح"}
          </Button>
        )}
      </div>
    </div>
  );
}
