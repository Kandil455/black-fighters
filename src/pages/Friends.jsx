import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ensureFriendId } from "@/lib/social";
import { Loader2, Users } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import FriendIdCard from "@/components/social/FriendIdCard";
import AddFriend from "@/components/social/AddFriend";
import FriendRequests from "@/components/social/FriendRequests";
import FriendsList from "@/components/social/FriendsList";

/**
 * Friends & social chat.
 *
 * PERFORMANCE (this page used to be noticeably slow):
 *  1. It awaited `auth.me()` (an extra getDoc) AND `ensureFriendId` (a possible
 *     WRITE) before any data query could start. The profile comes from
 *     AuthContext now, and the friend-id repair runs alongside the queries instead
 *     of in front of them.
 *  2. `refreshProfile()` fired on every mount — a second `me()` read plus an
 *     IndexedDB write — purely for cosmetics. Removed.
 *  3. Every navigation re-ran the whole waterfall. react-query caches it now.
 *  4. ChatWindow was statically imported into this route's chunk although it only
 *     renders after picking a peer; it is lazy now.
 */
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

  // Keep the local copy fresh when AuthContext loads/repairs the profile.
  useEffect(() => {
    if (profile?.id) setMe((prev) => ({ ...profile, ...prev, id: profile.id }));
  }, [profile]);

  // Repair the shareable friend id in the background — it must never gate the list.
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
      // One bounded batched read for every friend, not one request per friend.
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

  // Deep link (?chat=<id>) opens that conversation once the data is in.
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
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12" dir={dir}>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-black">{isEn ? "Friends & Social Chat" : "الأصدقاء والدردشة"}</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
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
            <Suspense fallback={<div className="h-[70vh] glass-card rounded-2xl border border-border/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <ChatWindow me={me} peer={peer} onBack={() => setPeer(null)} />
            </Suspense>
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
