import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, BellRing, BellOff, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import TelegramLinkAction from "@/components/telegram/TelegramLinkAction";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Users } from "@/lib/firestore";
import { apiUrl } from "@/lib/apiBase";

/**
 * TelegramPanel — the web side of the Telegram integration.
 *
 * What was missing before: the only Telegram UI was a read-only "linked / not
 * linked" badge on the profile and an out-of-band deep link. There was no way to
 * see the bot's actual commands, no notification preferences (the bot had a
 * budget + opt-out engine but nothing to configure it), and no way to unlink.
 */

const DEFAULT_TYPES = [
  { id: "review_due", ar: "تذكير المراجعة (FSRS)", en: "FSRS review reminders" },
  { id: "summary_ready", ar: "لما الملخص يخلص", en: "Summary finished" },
  { id: "quiz_graded", ar: "نتيجة كويز", en: "Quiz graded" },
  { id: "payment", ar: "تأكيد الاشتراك", en: "Subscription approved" },
  { id: "streak", ar: "الاستمرارية والإنجازات", en: "Streak & achievements" },
];

export default function TelegramPanel() {
  const { profile, refreshProfile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";

  const linked = Boolean(profile?.telegram_chat_id);
  const saved = profile?.telegram_notifications || {};

  const [prefs, setPrefs] = useState({ enabled: true, types: {}, ...saved });
  const [saving, setSaving] = useState(false);
  const [commands, setCommands] = useState(null);
  const [manifestError, setManifestError] = useState("");

  useEffect(() => {
    setPrefs({ enabled: true, types: {}, ...(profile?.telegram_notifications || {}) });
  }, [profile?.telegram_notifications]);

  // The command list comes from the server manifest, so the help shown here can
  // never advertise something the bot does not actually handle.
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("telegram-manifest"))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) setCommands(data);
      })
      .catch(() => {
        if (!cancelled) setManifestError(isEn ? "Could not load the command list" : "تعذر تحميل قائمة الأوامر");
      });
    return () => { cancelled = true; };
  }, [isEn]);

  const persist = useCallback(async (next) => {
    if (!profile?.id) {
      toast.error(isEn ? "Profile not loaded yet" : "البروفايل لسه ما اتحمّلش");
      return;
    }
    setSaving(true);
    try {
      // `telegram_notifications` is a user-owned preference field, so the rules
      // allow a direct self-update (unlike telegram_chat_id, which is server-only).
      await Users.update(profile.id, { telegram_notifications: next });
      toast.success(isEn ? "Notification settings saved" : "تم حفظ إعدادات التنبيهات");
      refreshProfile?.();
    } catch (err) {
      toast.error(err?.message || (isEn ? "Could not save" : "تعذر الحفظ"));
    } finally {
      setSaving(false);
    }
  }, [isEn, profile?.id, refreshProfile]);

  const toggleType = (id) => {
    const next = { ...prefs, types: { ...(prefs.types || {}), [id]: !(prefs.types?.[id] !== false) ? false : true } };
    // Normalise: `false` means muted, absence/true means enabled.
    if (next.types[id] === true) delete next.types[id];
    setPrefs(next);
    persist(next);
  };

  const toggleAll = () => {
    const next = { ...prefs, enabled: !prefs.enabled };
    setPrefs(next);
    persist(next);
  };

  const studentCommands = useMemo(
    () => (commands?.commands || []).filter((c) => c.scope === "student"),
    [commands],
  );

  return (
    <LVCard className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-primary">
              {isEn ? "Telegram bot" : "بوت تيليجرام"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {commands?.botUsername ? `@${commands.botUsername}` : "@black_fighters_bot"}
            </p>
          </div>
        </div>
        {linked ? (
          <LVBadge variant="accent">{isEn ? "Linked" : "مرتبط"}</LVBadge>
        ) : (
          <LVBadge variant="warning">{isEn ? "Not linked" : "غير مرتبط"}</LVBadge>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {isEn
          ? "Link your account so quizzes, summaries and review cards stay in sync between the platform and Telegram."
          : "اربط حسابك عشان الكويزات والملخصات وبطاقات المراجعة تتزامن بين المنصة وتيليجرام."}
      </p>

      <TelegramLinkAction linked={linked} onChange={() => refreshProfile?.()} />

      {/* Notification preferences */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {prefs.enabled === false ? (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <BellRing className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs font-bold">
              {isEn ? "Proactive notifications" : "التنبيهات التلقائية"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            disabled={saving}
            className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold transition hover:border-primary/40 disabled:opacity-60"
          >
            {prefs.enabled === false ? (isEn ? "Enable" : "تفعيل") : (isEn ? "Mute all" : "كتم الكل")}
          </button>
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
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-[11px] font-semibold transition disabled:opacity-50 ${
                  muted
                    ? "border-border bg-background text-muted-foreground"
                    : "border-primary/30 bg-primary/5 text-foreground"
                }`}
              >
                <span>{isEn ? type.en : type.ar}</span>
                <span className={muted ? "text-muted-foreground" : "text-primary"}>
                  {muted ? (isEn ? "Muted" : "مكتوم") : (isEn ? "On" : "شغّال")}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {isEn
            ? "Hard limits on the bot side: at most 2 proactive messages per day, nothing between 23:00 and 07:00, and 5 ignored messages switch you to a weekly digest."
            : "فيه حدود ثابتة من ناحية البوت: أقصى 2 تنبيه في اليوم، ومفيش تنبيه من 11 بالليل لـ 7 الصبح، ولو تجاهلت 5 رسايل بنحوّلك لملخص أسبوعي."}
        </p>
      </div>

      {/* Command reference, straight from the server manifest */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold">{isEn ? "Bot commands" : "أوامر البوت"}</span>
          {commands?.botUrl && (
            <a
              href={commands.botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {isEn ? "Open bot" : "افتح البوت"}
            </a>
          )}
        </div>

        {!commands && !manifestError && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {isEn ? "Loading…" : "جاري التحميل…"}
          </div>
        )}
        {manifestError && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            {manifestError}
          </button>
        )}

        <ul className="grid gap-1.5 sm:grid-cols-2">
          {studentCommands.map((cmd) => (
            <li key={cmd.command} className="flex items-baseline gap-2 text-[11px]">
              <code className="shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {cmd.command}
              </code>
              <span className="text-muted-foreground">{isEn ? cmd.descriptionEn : cmd.descriptionAr}</span>
            </li>
          ))}
        </ul>
      </div>
    </LVCard>
  );
}
