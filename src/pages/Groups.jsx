import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Users } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import GroupsList from "@/components/groups/GroupsList";
import GroupChatWindow from "@/components/groups/GroupChatWindow";
import CreateGroupDialog from "@/components/groups/CreateGroupDialog";
import GroupQuizPicker from "@/components/groups/GroupQuizPicker";
import GroupQuizSessionModal from "@/components/groups/GroupQuizSessionModal";

export default function Groups() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [me, setMe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [active, setActive] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async (u) => {
    const user = u || me;
    if (!user) return;
    const gs = await base44.entities.StudyGroup.listForUser(user.id, 100);
    setGroups(gs || []);
  }, [me]);

  const loadFriends = useCallback(async (u) => {
    const links = await base44.entities.Friendship.filter({ participant_ids: u.id, status: "accepted" });
    const ids = links.map((l) => (l.requester_id === u.id ? l.addressee_id : l.requester_id));
    if (!ids.length) return setFriends([]);
    const users = await base44.entities.User.filter({ id: { $in: ids } });
    setFriends(users.map((fu) => ({ id: fu.id, name: fu.full_name, avatar_url: fu.avatar_url, profile_frame: fu.profile_frame })));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setMe(u);
        await Promise.all([loadGroups(u), loadFriends(u)]);
      } finally {
        setLoading(false);
      }
    })();
     
  }, []);

  if (loading) {
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
            <GroupChatWindow
              me={me}
              group={active}
              onBack={() => setActive(null)}
              onOpenQuiz={() => setShowQuizPicker(true)}
              onJoinSession={(id) => setActiveSessionId(id)}
            />
          ) : (
            <div className="h-[70vh] glass-card rounded-2xl border border-border/50 flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-14 h-14 mb-3 opacity-30" />
              <p className="font-bold">{isEn ? "Select a group or create a new one 💬" : "اختار جروب أو اعمل واحد جديد 💬"}</p>
            </div>
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        me={me}
        friends={friends}
        onCreated={(g) => { setGroups((prev) => [g, ...prev]); setActive(g); }}
      />

      {active && (
        <GroupQuizPicker
          open={showQuizPicker}
          onClose={() => setShowQuizPicker(false)}
          me={me}
          group={active}
          onStarted={(s) => setActiveSessionId(s.id)}
        />
      )}

      {activeSessionId && (
        <GroupQuizSessionModal
          open={!!activeSessionId}
          onClose={() => setActiveSessionId(null)}
          me={me}
          sessionId={activeSessionId}
        />
      )}
    </div>
  );
}
