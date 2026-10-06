import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ensureFriendId } from "@/lib/social";
import { Loader2, Users } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import FriendIdCard from "@/components/social/FriendIdCard";
import AddFriend from "@/components/social/AddFriend";
import FriendRequests from "@/components/social/FriendRequests";
import FriendsList from "@/components/social/FriendsList";
import ChatWindow from "@/components/social/ChatWindow";

export default function Friends() {
  const { refreshProfile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [peer, setPeer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSocial = useCallback(async (user) => {
    const u = user || me;
    if (!u?.id) return;
    try {
      const links = await base44.entities.Friendship.filter({ participant_ids: u.id });
      const safeLinks = Array.isArray(links) ? links : [];
      // طلبات واردة معلقة
      setRequests(safeLinks.filter((l) => l.status === "pending" && l.addressee_id === u.id));
      // الأصدقاء المقبولين
      const accepted = safeLinks.filter((l) => l.status === "accepted");
      const friendIds = accepted.map((l) => (l.requester_id === u.id ? l.addressee_id : l.requester_id));
      if (friendIds.length) {
        const users = await base44.entities.User.filter({ id: { $in: friendIds } });
        setFriends(users.map((fu) => ({
          id: fu.id, name: fu.full_name, avatar_url: fu.avatar_url,
          profile_frame: fu.profile_frame, friend_id: fu.friend_id,
        })));
      } else {
        setFriends([]);
      }
    } catch (e) {
      console.warn("loadSocial error:", e.message);
      setFriends([]);
      setRequests([]);
    }
  }, [me]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          if (mounted) setLoading(false);
          return;
        }
        const fid = await ensureFriendId(u).catch(() => null);
        const withId = { ...u, friend_id: fid || u.friend_id || "GUEST" };
        if (mounted) {
          setMe(withId);
          await loadSocial(withId);

          // فتح شات مباشر من زر "تواصل" في البروفايل العام (?chat=<id>)
          const chatId = new URLSearchParams(window.location.search).get("chat");
          if (chatId && chatId !== u.id) {
            const list = await base44.entities.User.filter({ id: chatId });
            const target = list?.[0];
            if (target && mounted) {
              setPeer({
                id: target.id, name: target.full_name,
                avatar_url: target.avatar_url, profile_frame: target.profile_frame,
                friend_id: target.friend_id,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Friends initialization error:", err.message);
      } finally {
        if (mounted) {
          setLoading(false);
          refreshProfile?.();
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!me) {
    return (
      <div className="max-w-5xl mx-auto pb-12 text-center py-20" dir={dir}>
        <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">{isEn ? "Authentication Required" : "يرجى تسجيل الدخول"}</h2>
        <p className="text-sm text-muted-foreground">{isEn ? "Please sign in to access friends and messaging." : "سجّل دخولك عشان تقدر تضيف أصدقاء وتبدأ الدردشة."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12" dir={dir}>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-black">{isEn ? "Friends & Social Chat" : "الأصدقاء والدردشة"}</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
        {/* العمود الأيمن: الإدارة + القائمة */}
        <div className={`space-y-4 ${peer ? "hidden lg:block" : ""}`}>
          <FriendIdCard friendId={me?.friend_id} />
          <AddFriend me={me} onAdded={() => loadSocial()} />
          <FriendRequests requests={requests} onChange={() => loadSocial()} />
          <FriendsList
            friends={friends}
            activePeerId={peer?.isAi ? "ai" : peer?.id}
            onSelect={setPeer}
          />
        </div>

        {/* العمود الأيسر: نافذة الشات */}
        <div className={`${peer ? "" : "hidden lg:block"}`}>
          {peer ? (
            <ChatWindow me={me} peer={peer} onBack={() => setPeer(null)} />
          ) : (
            <div className="h-[70vh] glass-card rounded-2xl border border-border/50 flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-14 h-14 mb-3 opacity-30" />
              <p className="font-bold">{isEn ? "Select a friend or Black Fighters AI to start chatting 💬" : "اختار صاحب أو بلاك فايترز AI عشان تبدأ الدردشة 💬"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}