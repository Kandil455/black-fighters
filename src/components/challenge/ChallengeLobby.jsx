import React, { useState } from "react";
import { Copy, Check, Users, Clock, Loader2 } from "@/components/ui/animatedIcons";
import { toast } from "sonner";

const TIME_OPTIONS = [5, 10, 15, 20];

export default function ChallengeLobby({ challenge, isHost, onStart, onSetTime, starting }) {
  const [copied, setCopied] = useState(false);
  const participants = challenge.participants || [];
  const url = `${window.location.origin}/challenge/${challenge.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("اتنسخ لينك الغرفة ✅ ابعته لصاحبك");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card max-w-xl mx-auto text-center p-6 sm:p-10">
      <div className="hd mb-2">
        <span className="mono">تحدي لايف</span>
        <h1 className="serif">
          غرفة <em style={{ color: "var(--sig)" }}>التحدّي.</em>
        </h1>
        <p className="mx-auto" style={{ color: "var(--mute)" }}>
          {challenge.quiz_title}
        </p>
      </div>

      {/* Share link */}
      <div className="comp my-4">
        <input
          value={url}
          readOnly
          dir="ltr"
          className="font-mono text-xs"
        />
        <button onClick={copyLink} className="btn sm">
          {copied ? <Check className="w-4 h-4" animated={false} /> : <Copy className="w-4 h-4" animated={false} />}
          <span>{copied ? "اتنسخ" : "انسخ"}</span>
        </button>
      </div>

      {/* Time selector (host only) */}
      {isHost && (
        <div className="mb-6">
          <p className="mono text-xs mb-2 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" animated={false} /> الوقت المحدد
          </p>
          <div className="flex gap-2 justify-center">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => onSetTime(m)}
                className={`tag ${challenge.time_limit_minutes === m ? "on" : ""}`}
              >
                {m} د
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="mb-6">
        <p className="mono text-xs mb-3 flex items-center justify-center gap-1.5">
          <Users className="w-3.5 h-3.5" animated={false} /> المشاركين ({participants.length})
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {participants.map((p, i) => (
            <div
              key={p.user_id}
              className="flex items-center gap-2 px-3 py-1.5 border border-[var(--line)] bg-[var(--paper)] rounded-full"
            >
              <span className={`av ${i === 0 ? "me" : ""}`} style={{ width: 28, height: 28, fontSize: "0.72rem" }}>
                {(p.user_name || "?")[0].toUpperCase()}
              </span>
              <span className="text-sm font-semibold">{p.user_name}</span>
              {i === 0 && <span className="text-[10px]">👑</span>}
            </div>
          ))}
          {participants.length < 2 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[var(--line)] text-xs" style={{ color: "var(--mute)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" animated={false} /> في انتظار لاعب...
            </div>
          )}
        </div>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={starting || participants.length < 2}
          className="btn w-full h-12"
        >
          {starting ? (
            <Loader2 className="w-4 h-4 animate-spin" animated={false} />
          ) : participants.length < 2 ? (
            "في انتظار اللاعب التاني..."
          ) : (
            "ابدأ التحدّي الآن 🚀"
          )}
        </button>
      ) : (
        <p className="mono text-xs py-3" style={{ color: "var(--mute)" }}>
          في انتظار صاحب الغرفة يبدأ التحدي... ⏳
        </p>
      )}
    </div>
  );
}