import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BellRing,
  BellOff,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Send,
  Sparkles,
  CheckCircle2,
  Terminal,
  Zap,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import TelegramLinkAction from "@/components/telegram/TelegramLinkAction";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Users } from "@/lib/firestore";
import { apiUrl } from "@/lib/apiBase";
import { invokeSecureFunction } from "@/lib/secureFunctions";

const DEFAULT_TYPES = [
  { id: "summary_ready", ar: "إشعار جاهزية الملخص الذكي", en: "Summary ready alert" },
  { id: "review_due", ar: "تذكير المراجعة المتباعدة (FSRS)", en: "FSRS review reminders" },
  { id: "quiz_graded", ar: "تقرير نتيجة الكويز وبنك الأخطاء", en: "Quiz score & Mistake Vault" },
  { id: "streak", ar: "تذكير الـ Streak ولوحة المتصدرين", en: "Streak & leaderboard alerts" },
  { id: "payment", ar: "تأكيد تفعيل الاشتراك", en: "Subscription approved" },
];

const QUICK_PLAYGROUND_COMMANDS = [
  { cmd: "/start", labelAr: "القائمة الرئيسية", labelEn: "Main Menu" },
  { cmd: "/summary", labelAr: "تلخيص فوري", labelEn: "Instant Summary" },
  { cmd: "/quiz", labelAr: "كويز نظري EBE", labelEn: "Theory Quiz" },
  { cmd: "/ospe", labelAr: "محطة عملي OSPE", labelEn: "OSPE Station" },
  { cmd: "/grill_me", labelAr: "اختبار شفوي", labelEn: "Oral Grill" },
  { cmd: "/plan", labelAr: "خطة مذاكرة", labelEn: "Study Plan" },
];

export function isTelegramAutoSendEnabled(profile) {
  try {
    const localVal = localStorage.getItem("bf_tg_auto_send");
    if (localVal === "true") return true;
    if (localVal === "false") return false;
  } catch {}
  return Boolean(profile?.telegram_notifications?.autoSendOnGenerate);
}

export default function TelegramPanel() {
  const { profile, refreshProfile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";

  const linked = Boolean(profile?.telegram_chat_id);
  const saved = profile?.telegram_notifications || {};

  const [prefs, setPrefs] = useState(() => ({
    enabled: true,
    autoSendOnGenerate: isTelegramAutoSendEnabled(profile),
    types: {},
    ...saved,
  }));
  const [saving, setSaving] = useState(false);
  const [commands, setCommands] = useState(null);
  const [manifestError, setManifestError] = useState("");
  const [diagnostics, setDiagnostics] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [syncingMenu, setSyncingMenu] = useState(false);
  const [sendingTestNote, setSendingTestNote] = useState(false);
  const [testNotePreview, setTestNotePreview] = useState("");

  // Interactive Bot Playground state
  const [activeCommand, setActiveCommand] = useState("/summary");
  const [customTopic, setCustomTopic] = useState("Acute Coronary Syndrome & ECG Localization");
  const [simulating, setSimulating] = useState(false);
  const [sendSimToChat, setSendSimToChat] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  useEffect(() => {
    setPrefs((prev) => ({
      ...prev,
      enabled: true,
      types: {},
      ...(profile?.telegram_notifications || {}),
      autoSendOnGenerate: isTelegramAutoSendEnabled(profile),
    }));
  }, [profile]);

  const loadManifest = useCallback(() => {
    setManifestError("");
    fetch(apiUrl("telegram-manifest"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setCommands(data);
      })
      .catch(() => {
        setManifestError(isEn ? "Could not load the command list" : "تعذر تحميل قائمة الأوامر");
      });
  }, [isEn]);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  const runDiagnostics = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const res = await invokeSecureFunction("telegram-manifest", { action: "diagnostics" });
      if (res?.data?.ok) {
        setDiagnostics(res.data);
        toast.success(isEn ? "Bot connection verified" : "تم فحص حالة اتصال البوت بنجاح ⚡");
      }
    } catch (err) {
      toast.error(err?.message || (isEn ? "Diagnostics failed" : "تعذر فحص حالة البوت"));
    } finally {
      setCheckingHealth(false);
    }
  }, [isEn]);

  const handleSyncCommands = async () => {
    setSyncingMenu(true);
    try {
      const res = await invokeSecureFunction("telegram-manifest", { action: "sync_commands" });
      if (res?.data?.ok) {
        toast.success(res.data.message || "تمت مزامنة أوامر البوت بنجاح ✅");
      } else {
        toast.error(res?.data?.message || "تعذر مزامنة الأوامر");
      }
    } catch (err) {
      toast.error(err?.message || "تعذر مزامنة الأوامر");
    } finally {
      setSyncingMenu(false);
    }
  };

  const handleSendTestAlert = async (notificationType = "summary_ready") => {
    setSendingTestNote(true);
    try {
      const res = await invokeSecureFunction("telegram-manifest", {
        action: "test_notification",
        notificationType,
      });
      if (res?.data?.ok) {
        setTestNotePreview(res.data.previewHtml || "");
        toast.success(res.data.message || "تم إرسال التنبيه التجريبي بنجاح 🔔");
      }
    } catch (err) {
      toast.error(err?.message || "تعذر إرسال التنبيه التجريبي");
    } finally {
      setSendingTestNote(false);
    }
  };

  const handleRunSimulation = useCallback(
    async (cmdOverride = null) => {
      const targetCmd = cmdOverride || activeCommand;
      if (cmdOverride) setActiveCommand(cmdOverride);
      setSimulating(true);
      try {
        const res = await invokeSecureFunction("telegram-manifest", {
          action: "simulate_command",
          command: targetCmd,
          topic: customTopic,
          sendToChat: sendSimToChat && linked,
        });
        if (res?.data?.ok) {
          setSimulationResult(res.data.simulation);
          if (res.data.deliveredToTelegram) {
            toast.success("تم إرسال رد البوت إلى شات التيليجرام الخاص بك! 🤖");
          }
        }
      } catch (err) {
        toast.error(err?.message || "تعذر تشغيل محاكي البوت");
      } finally {
        setSimulating(false);
      }
    },
    [activeCommand, customTopic, linked, sendSimToChat],
  );

  // Load initial simulation preview on mount
  useEffect(() => {
    handleRunSimulation("/summary");
     
  }, []);

  const persist = useCallback(
    async (next) => {
      try {
        localStorage.setItem("bf_tg_auto_send", String(Boolean(next.autoSendOnGenerate)));
      } catch {}
      if (!profile?.id) {
        toast.success(isEn ? "Settings saved locally" : "تم حفظ الإعدادات");
        return;
      }
      setSaving(true);
      try {
        await Users.update(profile.id, { telegram_notifications: next });
        toast.success(isEn ? "Telegram settings saved" : "تم حفظ إعدادات التيليجرام بنجاح ✅");
        refreshProfile?.();
      } catch (err) {
        toast.error(err?.message || (isEn ? "Could not save" : "تعذر الحفظ"));
      } finally {
        setSaving(false);
      }
    },
    [isEn, profile?.id, refreshProfile],
  );

  const toggleType = (id) => {
    const next = {
      ...prefs,
      types: { ...(prefs.types || {}), [id]: !(prefs.types?.[id] !== false) ? false : true },
    };
    if (next.types[id] === true) delete next.types[id];
    setPrefs(next);
    persist(next);
  };

  const toggleAll = () => {
    const next = { ...prefs, enabled: !prefs.enabled };
    setPrefs(next);
    persist(next);
  };

  const toggleAutoSend = () => {
    const next = { ...prefs, autoSendOnGenerate: !prefs.autoSendOnGenerate };
    setPrefs(next);
    persist(next);
  };

  const studentCommands = useMemo(
    () => (commands?.commands || []).filter((c) => c.scope === "student"),
    [commands],
  );

  return (
    <div className="space-y-5">
      {/* 1. Primary Connection & Diagnostics Card */}
      <LVCard className="p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#19f08c]/10 border border-[#19f08c]/30 flex items-center justify-center text-[#19f08c]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#f5f7fa]">
                  {isEn ? "Telegram Bot Command Center" : "مركز التحكم والربط الفوري ببوت التيليجرام"}
                </h3>
                {linked ? (
                  <LVBadge variant="accent">{isEn ? "Linked" : "مرتبط ونشط"}</LVBadge>
                ) : (
                  <LVBadge variant="warning">{isEn ? "Not linked" : "غير مرتبط"}</LVBadge>
                )}
              </div>
              <p className="text-xs font-mono text-[#9aa4b2] mt-0.5">
                {commands?.botUsername ? `@${commands.botUsername}` : "@Black_Fighters_FREE_bot"} ·{" "}
                {commands?.botConfigured
                  ? isEn
                    ? "Bot API Token Ready"
                    : "متصل بـ Telegram Bot API"
                  : isEn
                  ? "Interactive Sandbox Mode"
                  : "وضع المحاكاة التفاعلية جاهز"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/tg"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#19f08c]/35 bg-[#19f08c]/10 px-3 py-1.5 text-xs font-bold text-[#19f08c] hover:bg-[#19f08c]/20 transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5" />
              {isEn ? "Open Mini App (/tg)" : "فتح التطبيق المصغر (/tg)"}
            </Link>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={checkingHealth}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-[#f5f7fa] hover:border-[#19f08c]/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              {checkingHealth ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#19f08c]" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-[#19f08c]" />
              )}
              {isEn ? "Check Bot Health" : "فحص الاتصال والويب هوك"}
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#9aa4b2]">
          {isEn
            ? "Connect your Telegram account to automatically receive formatted study guides, interactive Quiz Polls, FSRS review reminders, and sync your Mistake Vault."
            : "اربط حسابك بالبوت لاستلام المذكرات الذكية فور توليدها، وحل الكويزات كاستطلاعات Quiz Polls حية في الشات، واستقبال تذكيرات المراجعة المتباعدة (FSRS)."}
        </p>

        <TelegramLinkAction linked={linked} onChange={() => refreshProfile?.()} />

        {/* Live Diagnostics Result Strip */}
        {diagnostics && (
          <div className="rounded-xl border border-[#19f08c]/25 bg-[#05070a] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#19f08c] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {isEn ? "Live Telegram Bot Status" : "تقرير الفحص الحي لبوت التيليجرام"}
              </span>
              <span className="text-[11px] font-mono text-[#9aa4b2]">
                @{diagnostics.botUsername}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <span className="text-[#647084] block text-[10px]">حالة التوكن (Bot API)</span>
                <strong className="text-[#f5f7fa] font-mono">
                  {diagnostics.botConfigured ? "متصل (Active)" : "محلي (Sandbox)"}
                </strong>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <span className="text-[#647084] block text-[10px]">حالة الـ Webhook</span>
                <strong className="text-[#f5f7fa] font-mono">
                  {diagnostics.webhookInfo?.url
                    ? `نشط (${diagnostics.webhookInfo.pending_update_count || 0} بالانتظار)`
                    : diagnostics.webhookSecretConfigured
                    ? "مؤمّن وجاهز"
                    : "وضع المحاكاة"}
                </strong>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <span className="text-[#647084] block text-[10px]">ربط حساب الطالب</span>
                <strong className="text-[#19f08c] font-mono">
                  {diagnostics.linked ? `مرتبط (${diagnostics.chatId})` : "غير مرتبط بعد"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Delivery on Generation + Notification Preferences */}
        <div className="space-y-3 border-t border-white/[0.07] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/[0.06] p-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#19f08c]" />
                <span className="text-xs font-bold text-[#f5f7fa]">
                  {isEn
                    ? "Auto-send summaries & quizzes to Telegram on generation"
                    : "إرسال تلقائي للملخصات والكويزات إلى تيليجرام فور توليدها"}
                </span>
              </div>
              <p className="text-[11px] text-[#9aa4b2]">
                {isEn
                  ? "Whenever you generate a summary or quiz on the site, a copy is sent straight to your bot chat."
                  : "بمجرد توليد أي ملخص أو كويز داخل الموقع، يرسل البوت نسخة فورية إلى شات التيليجرام الخاص بك تلقائياً."}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAutoSend}
              disabled={saving}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                prefs.autoSendOnGenerate
                  ? "bg-[#19f08c] text-[#03150c] border-[#19f08c]"
                  : "bg-[#05070a] text-[#9aa4b2] border-white/[0.1] hover:text-[#f5f7fa]"
              }`}
            >
              {prefs.autoSendOnGenerate
                ? isEn
                  ? "Auto-Send ON ✓"
                  : "مُفعّل تلقائياً ✓"
                : isEn
                ? "Enable Auto-Send"
                : "تفعيل الإرسال التلقائي"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              {prefs.enabled === false ? (
                <BellOff className="h-4 w-4 text-[#9aa4b2]" />
              ) : (
                <BellRing className="h-4 w-4 text-[#19f08c]" />
              )}
              <span className="text-xs font-bold text-[#f5f7fa]">
                {isEn ? "Smart Telegram Notifications" : "أنواع التنبيهات الفورية من البوت"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSendTestAlert("summary_ready")}
                disabled={sendingTestNote}
                className="rounded-lg border border-[#19f08c]/35 bg-[#19f08c]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#19f08c] transition hover:bg-[#19f08c]/20 cursor-pointer disabled:opacity-60 inline-flex items-center gap-1"
              >
                {sendingTestNote ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                {isEn ? "Send Test Alert" : "إرسال تنبيه تجريبي"}
              </button>
              <button
                type="button"
                onClick={toggleAll}
                disabled={saving}
                className="rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[11px] font-bold text-[#f5f7fa] transition hover:border-[#19f08c]/40 cursor-pointer disabled:opacity-60"
              >
                {prefs.enabled === false ? (isEn ? "Enable All" : "تفعيل الكل") : (isEn ? "Mute All" : "كتم الكل")}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_TYPES.map((type) => {
              const muted = prefs.types?.[type.id] === false;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.id)}
                  disabled={saving || prefs.enabled === false}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                    muted
                      ? "border-white/[0.07] bg-[#05070a] text-[#647084]"
                      : "border-[#19f08c]/30 bg-[#19f08c]/[0.06] text-[#f5f7fa]"
                  }`}
                >
                  <span>{isEn ? type.en : type.ar}</span>
                  <span className={muted ? "text-[#647084] font-mono" : "text-[#19f08c] font-mono"}>
                    {muted ? (isEn ? "Muted" : "مكتوم") : (isEn ? "Active" : "شغّال")}
                  </span>
                </button>
              );
            })}
          </div>

          {testNotePreview && (
            <div className="rounded-xl border border-[#19f08c]/30 bg-[#05070a] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#19f08c] font-mono">
                <span>TELEGRAM NOTIFICATION PREVIEW</span>
                <button
                  type="button"
                  onClick={() => setTestNotePreview("")}
                  className="text-[#9aa4b2] hover:text-[#f5f7fa]"
                >
                  إغلاق ×
                </button>
              </div>
              <div
                className="text-xs text-[#f5f7fa] leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: testNotePreview }}
              />
            </div>
          )}
        </div>
      </LVCard>

      {/* 2. Interactive Bot Command Simulator & Playground */}
      <LVCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#19f08c]/10 border border-[#19f08c]/30 flex items-center justify-center text-[#19f08c]">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#f5f7fa]">
                {isEn
                  ? "Interactive Bot Playground & Command Tester"
                  : "محاكي وتجربة أوامر البوت مباشرة من الموقع"}
              </h4>
              <p className="text-[11px] text-[#9aa4b2]">
                {isEn
                  ? "Test /summary, /quiz, /ospe, /grill_me, and /plan right here or send the output to your Telegram chat."
                  : "جرّب أوامر التلخيص والكويزات والاختبار الشفوي وخطة المذاكرة مباشرة، أو أرسل النتيجة لشاتك في تيليجرام."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncCommands}
            disabled={syncingMenu}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-[#f5f7fa] hover:border-[#19f08c]/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            {syncingMenu ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#19f08c]" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#19f08c]" />
            )}
            {isEn ? "Sync Bot Menu" : "مزامنة قائمة أوامر البوت"}
          </button>
        </div>

        {/* Command Pills */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PLAYGROUND_COMMANDS.map((item) => {
            const active = activeCommand === item.cmd;
            return (
              <button
                key={item.cmd}
                type="button"
                onClick={() => handleRunSimulation(item.cmd)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-[#19f08c] text-[#03150c] border-[#19f08c]"
                    : "bg-[#05070a] text-[#9aa4b2] border-white/[0.08] hover:text-[#f5f7fa] hover:border-[#19f08c]/35"
                }`}
              >
                <span className="font-mono">{item.cmd}</span>
                <span>·</span>
                <span>{isEn ? item.labelEn : item.labelAr}</span>
              </button>
            );
          })}
        </div>

        {/* Topic Input + Execute */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder={
              isEn
                ? "Enter lecture title or medical/scientific topic..."
                : "اكتب اسم المحاضرة أو الموضوع العلمي لتجربة التلخيص أو الاختبار الشفوي..."
            }
            className="flex-1 rounded-xl bg-[#05070a] border border-white/[0.09] px-3.5 py-2 text-xs text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
          />
          {linked && (
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#05070a] border border-white/[0.08] text-xs text-[#9aa4b2] cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={sendSimToChat}
                onChange={(e) => setSendSimToChat(e.target.checked)}
                className="accent-[#19f08c]"
              />
              <span>{isEn ? "Also send to my Telegram" : "إرسال لشاتي في تيليجرام أيضاً"}</span>
            </label>
          )}
          <button
            type="button"
            onClick={() => handleRunSimulation()}
            disabled={simulating}
            className="px-4 py-2 rounded-xl bg-[#19f08c] text-[#03150c] font-bold text-xs inline-flex items-center justify-center gap-1.5 hover:brightness-110 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {simulating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isEn ? "Run Command" : "تنفيذ الأمر الآن"}
          </button>
        </div>

        {/* Simulated Bot Terminal Output */}
        {simulationResult && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#05070a] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#19f08c]" />
                <span className="text-xs font-bold text-[#f5f7fa]">{simulationResult.title}</span>
              </div>
              <span className="text-[11px] font-mono text-[#19f08c]">{activeCommand}</span>
            </div>

            <div
              className="text-xs sm:text-sm text-[#e5e7eb] leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: simulationResult.html }}
            />

            {Array.isArray(simulationResult.buttons) && simulationResult.buttons.length > 0 && (
              <div className="pt-2 space-y-1.5">
                {simulationResult.buttons.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {row.map((btn, bIdx) =>
                      btn.url ? (
                        <a
                          key={bIdx}
                          href={btn.url}
                          className="rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/10 px-3 py-2 text-center text-xs font-bold text-[#19f08c] hover:bg-[#19f08c]/20 transition-colors"
                        >
                          {btn.text}
                        </a>
                      ) : (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            const nextCmd =
                              btn.callback_data === "cmd_summary"
                                ? "/summary"
                                : btn.callback_data === "cmd_ebe"
                                ? "/quiz"
                                : btn.callback_data === "cmd_ospe"
                                ? "/ospe"
                                : btn.callback_data === "cmd_grill"
                                ? "/grill_me"
                                : btn.callback_data === "cmd_plan"
                                ? "/plan"
                                : "/start";
                            handleRunSimulation(nextCmd);
                          }}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-center text-xs font-bold text-[#f5f7fa] hover:border-[#19f08c]/40 hover:text-[#19f08c] transition-colors cursor-pointer"
                        >
                          {btn.text}
                        </button>
                      ),
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Bot Command Reference */}
        <div className="space-y-2 border-t border-white/[0.07] pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#f5f7fa]">
              {isEn ? "All Registered Bot Commands" : "جميع الأوامر المسجلة في البوت"}
            </span>
            {commands?.botUrl && (
              <a
                href={commands.botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#19f08c] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {isEn ? "Open in Telegram" : "افتح البوت في تيليجرام"}
              </a>
            )}
          </div>

          {!commands && !manifestError && (
            <div className="flex items-center gap-2 text-[11px] text-[#9aa4b2]">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              {isEn ? "Loading…" : "جاري التحميل…"}
            </div>
          )}
          {manifestError && (
            <button
              type="button"
              onClick={loadManifest}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9aa4b2] hover:text-[#f5f7fa]"
            >
              <RefreshCw className="h-3 w-3" />
              {manifestError}
            </button>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            {studentCommands.map((cmd) => (
              <li
                key={cmd.command}
                onClick={() => handleRunSimulation(cmd.command)}
                className="flex items-baseline justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#05070a] px-3 py-2 text-[11px] hover:border-[#19f08c]/35 transition-colors cursor-pointer"
              >
                <div className="flex items-baseline gap-2">
                  <code className="shrink-0 rounded-md border border-[#19f08c]/30 bg-[#19f08c]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#19f08c]">
                    {cmd.command}
                  </code>
                  <span className="text-[#9aa4b2]">{isEn ? cmd.descriptionEn : cmd.descriptionAr}</span>
                </div>
                {cmd.alt && <span className="text-[10px] font-mono text-[#647084]">{cmd.alt}</span>}
              </li>
            ))}
          </ul>
        </div>
      </LVCard>
    </div>
  );
}
