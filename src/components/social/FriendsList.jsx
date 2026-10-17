import React from "react";
import { Bot, Users } from "@/components/ui/animatedIcons";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { useLocale } from "@/lib/LocaleContext";

export default function FriendsList({ friends, activePeerId, onSelect }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  return (
    <div className="card" style={{ gap: 0 }} dir={dir}>
      {/* AI partner header as top row */}
      <button
        onClick={() => onSelect({ isAi: true, name: isEn ? "Black Fighters AI" : "بلاك فايترز AI" })}
        className="row px-2 py-3 hover:bg-[var(--paper)] transition-colors text-start"
        style={{
          backgroundColor: activePeerId === "ai" ? "color-mix(in srgb, var(--sig) 8%, var(--paper2))" : undefined,
          borderInlineStart: activePeerId === "ai" ? "3px solid var(--sig)" : undefined,
        }}
      >
        <span className="av me">
          <Bot className="w-4 h-4" animated={false} />
        </span>
        <span className="grow">
          <b className="text-sm block">{isEn ? "Black Fighters AI" : "بلاك فايترز AI"}</b>
          <small className="mono text-[0.7rem] block">
            {isEn ? "Smart Study Assistant" : "المساعد الدراسي الذكي"}
          </small>
        </span>
        <span className="tag on text-[0.7rem]">AI</span>
      </button>

      {/* Friends list */}
      <div className="max-h-[55vh] overflow-y-auto scrollbar-none">
        {friends.length === 0 ? (
          <div className="py-10 text-center" style={{ color: "var(--mute)" }}>
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" animated={false} />
            <p className="text-sm">
              {isEn ? "No friends yet — add someone with their ID 👆" : "لسه مفيش أصحاب — ضيف حد بالـ ID 👆"}
            </p>
          </div>
        ) : (
          friends.map((f) => {
            const isActive = activePeerId === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelect(f)}
                className="row px-2 py-3 hover:bg-[var(--paper)] transition-colors text-start"
                style={{
                  backgroundColor: isActive ? "color-mix(in srgb, var(--sig) 8%, var(--paper2))" : undefined,
                  borderInlineStart: isActive ? "3px solid var(--sig)" : undefined,
                }}
              >
                <div className="shrink-0">
                  <AnimatedAvatar animate={false} src={f.avatar_url} frame={f.profile_frame} size={38} fallback="🎓" />
                </div>
                <span className="grow min-w-0">
                  <b className="text-sm block truncate">{f.name}</b>
                  <small className="mono text-[0.7rem] block">
                    {f.friend_id || (isEn ? "Friend" : "صديق")}
                  </small>
                </span>
                <span className="btn sm line">
                  {isEn ? "Chat" : "شات"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}