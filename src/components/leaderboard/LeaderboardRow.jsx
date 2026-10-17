import React from "react";
import { getLevelInfo } from "@/lib/xpSystem";
import { useLocale } from "@/lib/LocaleContext";
import AnimatedAvatar from "@/components/AnimatedAvatar";

export default function LeaderboardRow({ rank, name, correct, answered, isMe, xp = 0, avatar = "", isVideo = false, frame = "none" }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const { current: level } = getLevelInfo(xp);

  return (
    <div
      dir={dir}
      className="row px-3 py-3 hover:bg-[var(--paper)] transition-colors"
      style={{
        backgroundColor: isMe ? "color-mix(in srgb, var(--sig) 8%, var(--paper2))" : undefined,
        borderInlineStart: isMe ? "3px solid var(--sig)" : undefined,
      }}
    >
      {/* Rank number in mono */}
      <span className="mono text-sm font-bold w-7 text-center shrink-0" style={{ color: rank < 3 ? "var(--sig)" : "var(--mute)" }}>
        {rank + 1}
      </span>

      {/* Avatar */}
      <div className="shrink-0">
        <AnimatedAvatar
          src={avatar}
          isVideo={isVideo}
          frame={frame}
          size={38}
          fallback={(name || "?").trim().charAt(0).toUpperCase() || "؟"}
        />
      </div>

      {/* Name and level info */}
      <div className="grow min-w-0">
        <div className="flex items-center gap-2">
          <b className="text-sm truncate">{name}</b>
          {isMe && (
            <span className="tag on text-[0.68rem] py-0 px-2">
              {isEn ? "You" : "أنت"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <small className="mono text-[0.7rem]">
            {accuracy}% {isEn ? "acc" : "دقة"} · {answered} {isEn ? "q" : "سؤال"}
          </small>
          {xp > 0 && (
            <span className="mono text-[0.7rem]" style={{ color: "var(--sig)" }}>
              · {level.icon} {isEn && level.titleEn ? level.titleEn : level.title}
            </span>
          )}
        </div>
      </div>

      {/* Score in mono / display */}
      <div className="text-end shrink-0">
        <div className="mono font-bold text-sm" style={{ color: rank < 3 ? "var(--sig)" : "var(--ink)" }}>
          {xp.toLocaleString(isEn ? "en-US" : "ar-EG")} XP
        </div>
        <small className="mono text-[0.68rem] block text-[var(--mute)]">
          {correct} {isEn ? "correct" : "صح"}
        </small>
      </div>
    </div>
  );
}
