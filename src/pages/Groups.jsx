import React, { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Users } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";
import GroupsList from "@/components/groups/GroupsList";

/**
 * Study Groups.
 *
 * PERFORMANCE (this page used to take seconds to open):
 *  1. It awaited `auth.me()` — a full extra getDoc — before issuing ANY query.
 *     The profile is already in AuthContext, so we read it from there and let the
 *     queries start immediately.
 *  2. The friends list (a friendships query + N user reads) was loaded BEFORE
 *     first paint even though only CreateGroupDialog consumes it, and it held the
 *     full-page spinner. It is now fetched lazily, only when that dialog opens.
 *  3. Every navigation re-ran the whole waterfall. react-query caches it
 *     (staleTime 5 min / no refetch on mount, configured in lib/query-client.js).
 *  4. The chat window, quiz picker and session modal were statically imported into
 *     this route's chunk; they are now lazy and only fetched when used.
 */
const GroupChatWindow = lazy(() => import("@/components/groups/GroupChatWindow"));
const CreateGroupDialog = lazy(() => import("@/components/groups/CreateGroupDialog"));
const GroupQuizPicker = lazy(() => import("@/components/groups/GroupQuizPicker"));
const GroupQuizSessionModal = lazy(() => import("@/components/groups/GroupQuizSessionModal"));

function PaneFallback() {
  return (
    <div className="h-[70vh] glass-card rounded-2xl border border-border/50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export default function Groups() {
  const { locale, dir } = useLocale();
  const { profile } = useAuth();
  const isEn = locale === "en";

  const me = profile || null;
  const [active, setActive] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["study-groups", me?.id],
    enabled: Boolean(me?.id),
    queryFn: async () => (await base44.entities.StudyGroup.listForUser(me.id, 100)) || [],
  });

  // Only needed by CreateGroupDialog — fetched when that dialog actually opens.
  const { data: friends = [] } = useQuery({
    queryKey: ["group-friends", me?.id],
    enabled: Boolean(me?.id && showCreate),
    queryFn: async () => {
      const links = await base44.entities.Friendship.filter({ participant_ids: me.id, status: "accepted" });
      const ids = links.map((l) => (l.requester_id === me.id ? l.addressee_id : l.requester_id));
      if (!ids.length) return [];
      const users = await base44.entities.User.filter({ id: { $in: ids } });
      return users.map((fu) => ({
        id: fu.id,
        name: fu.full_name,
        avatar_url: fu.avatar_url,
        profile_frame: fu.profile_frame,
      }));
    },
  });

  if (!me || isLoading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12" dir={dir}>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-black">{isEn ? "Study Groups" : "جروبات المذاكرة"}</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-5">
        <div className={`${active ? "hidden lg:block" : ""}`}>
          <GroupsList groups={groups} activeId={active?.id} onSelect={setActive} onCreate={() => setShowCreate(true)} />
        </div>

        <div className={`${active ? "" : "hidden lg:block"}`}>
          {active ? (
            <Suspense fallback={<PaneFallback />}>
              <GroupChatWindow
                me={me}
                group={active}
                onBack={() => setActive(null)}
                onOpenQuiz={() => setShowQuizPicker(true)}
                onJoinSession={(id) => setActiveSessionId(id)}
              />
            </Suspense>
          ) : (
            <div className="h-[70vh] glass-card rounded-2xl border border-border/50 flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-14 h-14 mb-3 opacity-30" />
              <p className="font-bold">{isEn ? "Select a group or create a new one 💬" : "اختار جروب أو اعمل واحد جديد 💬"}</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Suspense fallback={null}>
          <CreateGroupDialog
            open={showCreate}
            onClose={() => setShowCreate(false)}
            me={me}
            friends={friends}
            onCreated={(g) => { setActive(g); }}
          />
        </Suspense>
      )}

      {active && (
        <Suspense fallback={null}>
          <GroupQuizPicker
            open={showQuizPicker}
            onClose={() => setShowQuizPicker(false)}
            me={me}
            group={active}
            onStarted={(s) => setActiveSessionId(s.id)}
          />
        </Suspense>
      )}

      {activeSessionId && (
        <Suspense fallback={null}>
          <GroupQuizSessionModal
            open={!!activeSessionId}
            onClose={() => setActiveSessionId(null)}
            me={me}
            sessionId={activeSessionId}
          />
        </Suspense>
      )}
    </div>
  );
}
