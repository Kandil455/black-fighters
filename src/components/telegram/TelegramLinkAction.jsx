import React, { useCallback, useEffect, useState } from "react";
import { Bot, Copy, Check, ExternalLink, LoaderCircle, Link2Off } from "lucide-react";
import { toast } from "sonner";
import {
  createTelegramLinkCode,
  unlinkTelegramAccount,
  openTelegramLink,
} from "@/lib/telegramClient";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

/**
 * TelegramLinkAction — the single account-linking control.
 *
 * Flow: request a short-lived code → show it (copyable) → open the bot with the
 * code prefilled → the bot redeems it server-side. No uid is ever placed in a
 * deep link (see netlify/functions/_shared/telegram-link.mjs).
 */
export default function TelegramLinkAction({
  linked = false,
  onChange,
  variant = "full",
  className = "",
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleLink = useCallback(async () => {
    setPending(true);
    try {
      const result = await createTelegramLinkCode();
      setCode(result.code);
      setDeepLink(result.deepLink);
      setSecondsLeft(Math.round((result.ttlMs || 600000) / 1000));
      openTelegramLink(result.deepLink);
      toast.success(isEn ? "Code created — send it to the bot" : "تم إنشاء الكود — ابعته للبوت");
    } catch (err) {
      toast.error(err?.message || (isEn ? "Could not create a link code" : "تعذر إنشاء كود الربط"));
    } finally {
      setPending(false);
    }
  }, [isEn]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(isEn ? "Copy failed — select the code manually" : "تعذر النسخ — انسخ الكود يدويًا");
    }
  }, [code, isEn]);

  const handleUnlink = useCallback(async () => {
    setPending(true);
    try {
      await unlinkTelegramAccount();
      setCode("");
      setDeepLink("");
      toast.success(isEn ? "Telegram unlinked" : "تم فصل حساب التيليجرام");
      onChange?.({ linked: false });
    } catch (err) {
      toast.error(err?.message || (isEn ? "Unlink failed" : "تعذر فصل الحساب"));
    } finally {
      setPending(false);
    }
  }, [isEn, onChange]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleLink}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/15 disabled:opacity-60",
          className,
        )}
      >
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
        {isEn ? "Link Telegram" : "ربط تيليجرام"}
      </button>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {code ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">
              {isEn ? "Send this code to the bot" : "ابعت الكود ده للبوت"}
            </span>
            {secondsLeft > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {minutes}:{seconds}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-lg font-black tracking-[0.25em] text-primary">
              {code}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-border bg-background p-2 transition hover:border-primary/40"
              aria-label={isEn ? "Copy code" : "نسخ الكود"}
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isEn ? "In the bot, send: " : "جوه البوت اكتب: "}
            <code className="font-mono text-foreground">/link {code}</code>
          </p>
          <button
            type="button"
            onClick={() => openTelegramLink(deepLink)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {isEn ? "Open the bot again" : "افتح البوت تاني"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLink}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          {linked
            ? (isEn ? "Get a new link code" : "كود ربط جديد")
            : (isEn ? "Link via Telegram" : "ربط الحساب عبر التيليجرام")}
        </button>

        {linked && (
          <button
            type="button"
            onClick={handleUnlink}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
          >
            <Link2Off className="h-3.5 w-3.5" />
            {isEn ? "Unlink" : "فصل الحساب"}
          </button>
        )}
      </div>
    </div>
  );
}
