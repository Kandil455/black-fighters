import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2 } from "lucide-react";
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

      // Check existing connection
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
    <div className="glass-card rounded-2xl p-5 border border-accent/30" dir={dir}>
      <div className="flex items-center gap-2 mb-3 text-accent">
        <UserPlus className="w-5 h-5" />
        <span className="font-bold text-sm">{isEn ? "Add Friend" : "إضافة صديق"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="BF-XXXX-XXXX"
          className="font-mono"
        />
        <Button onClick={send} disabled={loading || !fid.trim()} className="gap-1.5 font-bold shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {isEn ? "Add" : "إضافة"}
        </Button>
      </div>
    </div>
  );
}