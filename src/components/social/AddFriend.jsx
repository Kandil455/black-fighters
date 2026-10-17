import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "@/components/ui/animatedIcons";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import { pushNotification } from "@/lib/notifications";

export default function AddFriend({ me, onAdded }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [fid, setFid] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const target = fid.trim().toUpperCase();
    if (!target) return;
    if (target === me.friend_id) return toast.error(isEn ? "That's your own ID 😅" : "ده الـ ID بتاعك 😅");

    setLoading(true);
    try {
      const found = await base44.entities.User.filter({ friend_id: target });
      const friend = found?.[0];
      if (!friend) return toast.error(isEn ? "No user found with this ID" : "مفيش حد بالـ ID ده");

      const existing = await base44.entities.Friendship.filter({ participant_ids: { $all: [me.id, friend.id] } });
      if (existing?.length) return toast.error(isEn ? "A friendship or request already exists" : "في طلب/صداقة بينكم بالفعل");

      await base44.entities.Friendship.create({
        requester_id: me.id,
        requester_name: me.full_name,
        requester_avatar: me.avatar_url || "",
        addressee_id: friend.id,
        addressee_name: friend.full_name,
        addressee_avatar: friend.avatar_url || "",
        status: "pending",
        participant_ids: [me.id, friend.id],
      });
      await pushNotification(friend.id, {
        type: "social",
        title: "طلب صداقة جديد 👥",
        body: `أرسل لك ${me.full_name || "مستخدم"} طلب صداقة`,
        icon: "user-plus",
        link: "/friends",
      }).catch(() => {});
      toast.success(isEn ? `Friend request sent to ${friend.full_name} ✨` : `اتبعت طلب صداقة لـ ${friend.full_name} ✨`);
      setFid("");
      onAdded?.();
    } catch (e) {
      toast.error(e.message || (isEn ? "An error occurred" : "حصل خطأ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" dir={dir}>
      <span className="mono">{isEn ? "ADD A FRIEND" : "إضافة صديق جديد"}</span>
      <div className="comp">
        <input
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="BF-XXXX-XXXX"
          className="font-mono text-sm uppercase"
        />
        <button onClick={send} disabled={loading || !fid.trim()} className="btn sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" animated={false} /> : (isEn ? "Add" : "إضافة")}
        </button>
      </div>
    </div>
  );
}