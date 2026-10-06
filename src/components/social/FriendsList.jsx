import React from "react";
import { Bot, MessageCircle, Users, Sparkles } from "lucide-react";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { useLocale } from "@/lib/LocaleContext";

export default function FriendsList({ friends, activePeerId, onSelect }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  return (
    <div className="glass-card rounded-2xl border border-border/50 overflow-hidden" dir={dir}>
      {/* AI partner header */}
      <button
        onClick={() => onSelect({ isAi: true, name: isEn ? "Black Fighters AI" : "بلاك فايترز AI" })}
        className={`w-full flex items-center gap-3 p-3 transition-colors border-b border-border/50 ${
          activePeerId === "ai" ? "bg-accent/15" : "hover:bg-secondary/40"
        }`}
      >
        <div className="w-11 h-11 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 text-start min-w-0">
          <p className="font-bold text-sm flex items-center gap-1">
            {isEn ? "Black Fighters AI" : "بلاك فايترز AI"} <Sparkles className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isEn ? "Smart AI Study Assistant" : "مساعدك الدراسي الذكي"}
          </p>
        </div>
      </button>

      {/* Friends list */}
      <div className="max-h-[55vh] overflow-y-auto scrollbar-none">
        {friends.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {isEn ? "No friends yet — add someone with their ID 👆" : "لسه مفيش أصحاب — ضيف حد بالـ ID 👆"}
            </p>
          </div>
        ) : (
          friends.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className={`w-full flex items-center gap-3 p-3 transition-colors ${
                activePeerId === f.id ? "bg-primary/15" : "hover:bg-secondary/40"
              }`}
            >
              <AnimatedAvatar animate={false} src={f.avatar_url} frame={f.profile_frame} size={44} fallback="🎓" />
              <div className="flex-1 text-start min-w-0">
                <p className="font-bold text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground truncate font-mono">{f.friend_id || ""}</p>
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}