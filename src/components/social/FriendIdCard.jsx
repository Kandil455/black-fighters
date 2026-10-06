import React, { useState } from "react";
import { Copy, Check, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function FriendIdCard({ friendId }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(friendId);
    setCopied(true);
    toast.success(isEn ? "Friend ID copied" : "اتنسخ الـ ID");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-primary/30 neon-glow-cyan" dir={dir}>
      <div className="flex items-center gap-2 mb-2 text-primary">
        <Fingerprint className="w-5 h-5" />
        <span className="font-bold text-sm">{isEn ? "Your Friend ID" : "الـ ID بتاعك"}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {isEn ? "Share it with friends so they can add you" : "شاركه مع أصحابك عشان يضيفوك"}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-secondary/60 rounded-xl px-4 py-2.5 font-mono font-bold text-base tracking-wide select-all" dir="ltr">
          {friendId || "..."}
        </code>
        <button
          onClick={copy}
          className="w-11 h-11 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 flex items-center justify-center transition-colors"
        >
          {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-primary" />}
        </button>
      </div>
    </div>
  );
}