import React, { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "@/components/ui/animatedIcons";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";
import GroupsList from "@/components/groups/GroupsList";

const GroupChatWindow = lazy(() => import("@/components/groups/GroupChatWindow"));
const CreateGroupDialog = lazy(() => import("@/components/groups/CreateGroupDialog"));
const GroupQuizPicker = lazy(() => import("@/components/groups/GroupQuizPicker"));
const GroupQuizSessionModal = lazy(() => import("@/components/groups/GroupQuizSessionModal"));

function PaneFallback() {
  return (
    <div className="card h-[75vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sig)" }} animated={false} />
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
        <span className="mono">{isEn ? "Batch Groups" : "جروبات الدفعة"}</span>
        <h1 className="serif">
          {isEn ? "Study with your " : "ذاكر مع "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "batch." : "دفعتك."}</em>
        </h1>
      </div>

      <div className="two">
        <div className={`${active ? "hidden lg:block" : ""}`}>
          <GroupsList
            groups={groups}
            activeId={active?.id}
            onSelect={setActive}
            onCreate={() => setShowCreate(true)}
          />
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
            <div className="card h-[75vh] flex flex-col items-center justify-center text-center p-8">
              <span className="mono mb-2">{isEn ? "NO ACTIVE GROUP" : "مفيش جروب محدد"}</span>
              <h2 className="serif text-3xl mb-2">
                {isEn ? "Select a group to start" : "اختار جروب عشان تبدأ"}
              </h2>
              <p style={{ color: "var(--mute)" }} className="text-sm max-w-sm">
                {isEn
                  ? "Or create a new group to study with your classmates 💬"
                  : "أو اعمل جروب جديد وذاكروا مع بعض وشاركوا الملخصات 💬"}
              </p>
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
