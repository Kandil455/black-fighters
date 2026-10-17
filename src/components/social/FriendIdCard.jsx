import React, { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function FriendIdCard({ friendId }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(friendId || "");
    setCopied(true);
    toast.success(isEn ? "Friend ID copied" : "اتنسخ الـ ID");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="card" dir={dir}>
      <span className="mono">{isEn ? "YOUR FRIEND ID" : "الـ ID بتاعك"}</span>
      <div className="comp">
        <input
          value={friendId || "..."}
          dir="ltr"
          readOnly
          className="font-mono font-bold text-sm tracking-wider"
        />
        <button onClick={copy} className="btn sm">
          {copied ? (isEn ? "Copied" : "اتنسخ") : (isEn ? "Copy" : "انسخ")}
        </button>
      </div>
      <p style={{ color: "var(--mute)" }} className="text-xs">
        {isEn
          ? "Share your ID with classmates to add you to their network"
          : "شاركه مع زمايلك في الدفعة عشان يضيفوك ويبدأوا يذاكروا معاك"}
      </p>
    </div>
  );
}