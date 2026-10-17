import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ensureFriendId } from "@/lib/social";
import { Loader2 } from "@/components/ui/animatedIcons";
import { useLocale } from "@/lib/LocaleContext";
import FriendIdCard from "@/components/social/FriendIdCard";
import AddFriend from "@/components/social/AddFriend";
import FriendRequests from "@/components/social/FriendRequests";
import FriendsList from "@/components/social/FriendsList";

const ChatWindow = lazy(() => import("@/components/social/ChatWindow"));

export default function Friends() {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [me, setMe] = useState(profile || null);
  const [peer, setPeer] = useState(null);
  const [chatParam] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("chat") : null,
  );

  useEffect(() => {
    if (profile?.id) setMe((prev) => ({ ...profile, ...prev, id: profile.id }));
  }, [profile]);

  useEffect(() => {
    if (!me?.id) return;
    if (me.friend_id) return;
    let cancelled = false;
    ensureFriendId(me)
      .then((fid) => { if (!cancelled && fid) setMe((prev) => ({ ...prev, friend_id: fid })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [me?.id, me?.friend_id]);

  const { data: social, isLoading } = useQuery({
    queryKey: ["friends-social", me?.id],
    enabled: Boolean(me?.id),
    queryFn: async () => {
      const links = await base44.entities.Friendship.filter({ participant_ids: me.id });
      const safeLinks = Array.isArray(links) ? links : [];
      const requests = safeLinks.filter((l) => l.status === "pending" && l.addressee_id === me.id);
      const accepted = safeLinks.filter((l) => l.status === "accepted");
      const friendIds = accepted.map((l) => (l.requester_id === me.id ? l.addressee_id : l.requester_id));
      const users = friendIds.length ? await base44.entities.User.filter({ id: { $in: friendIds } }) : [];
      const friends = users.map((fu) => ({
        id: fu.id,
        name: fu.full_name,
        avatar_url: fu.avatar_url,
        profile_frame: fu.profile_frame,
        friend_id: fu.friend_id,
      }));
      let requestedPeer = null;
      if (chatParam && chatParam !== me.id) {
        const target = (await base44.entities.User.filter({ id: chatParam }))?.[0];
        if (target) {
          requestedPeer = {
            id: target.id,
            name: target.full_name,
            avatar_url: target.avatar_url,
            profile_frame: target.profile_frame,
            friend_id: target.friend_id,
          };
        }
      }
      return { requests, friends, requestedPeer };
    },
  });

  useEffect(() => {
    if (social?.requestedPeer && !peer) setPeer(social.requestedPeer);
  }, [social?.requestedPeer, peer]);

  const requests = social?.requests || [];
  const friends = social?.friends || [];
  const queryClient = useQueryClient();
  const refreshSocial = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["friends-social", me?.id] }),
    [queryClient, me?.id],
  );

  if (!me?.id || isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sig)" }} animated={false} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12" dir={dir}>
      {/* Editorial Header */}
      <div className="hd mb-6">
        <span className="mono">{isEn ? "Friends & Referrals" : "الأصدقاء والإحالات"}</span>
        <h1 className="serif">
          {isEn ? "Invite peers and " : "ادعو زمايلك "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "win together." : "واكسبوا مع بعض."}</em>
        </h1>
      </div>

      <div className="two">
        <div className={`space-y-4 ${peer ? "hidden lg:block" : ""}`}>
          <FriendIdCard friendId={me?.friend_id} />
          <AddFriend me={me} onAdded={refreshSocial} />
          <FriendRequests requests={requests} onChange={refreshSocial} />
          <FriendsList
            friends={friends}
            activePeerId={peer?.isAi ? "ai" : peer?.id}
            onSelect={setPeer}
          />
        </div>

        <div className={`${peer ? "" : "hidden lg:block"}`}>
          {peer ? (
            <Suspense fallback={<div className="card h-[70vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sig)" }} animated={false} /></div>}>
              <ChatWindow me={me} peer={peer} onBack={() => setPeer(null)} />
            </Suspense>
          ) : (
            <div className="card h-[70vh] flex flex-col items-center justify-center text-center p-8">
              <span className="mono mb-2">{isEn ? "SELECT CONVERSATION" : "مفيش محادثة مفتوحة"}</span>
              <h2 className="serif text-3xl mb-2">
                {isEn ? "Select a friend to chat" : "اختار صاحب عشان تدردش"}
              </h2>
              <p style={{ color: "var(--mute)" }} className="text-sm max-w-sm">
                {isEn
                  ? "Select a friend from the list or start a conversation with Black Fighters AI 💬"
                  : "اختار صاحب من القائمة أو اتكلم مع مساعد بلاك فايترز الذكي 💬"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
