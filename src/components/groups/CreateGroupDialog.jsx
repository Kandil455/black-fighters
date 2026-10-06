import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { useLocale } from "@/lib/LocaleContext";

const EMOJIS = ["📚", "🧠", "🔥", "⚡", "🎯", "👑", "🚀", "💡", "📐", "🧪"];

export default function CreateGroupDialog({ open, onClose, me, friends, onCreated }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = async () => {
    if (!name.trim()) return toast.error(isEn ? "Please enter a group name" : "اكتب اسم الجروب");
    setLoading(true);
    try {
      const chosen = friends.filter((f) => picked.includes(f.id));
      const members = [
        { id: me.id, name: me.full_name, avatar: me.avatar_url || "" },
        ...chosen.map((f) => ({ id: f.id, name: f.name, avatar: f.avatar_url || "" })),
      ];
      const group = await base44.entities.StudyGroup.create({
        name: name.trim(),
        emoji,
        owner_id: me.id,
        owner_name: me.full_name,
        member_ids: members.map((m) => m.id),
        members,
      });
      toast.success(isEn ? "Group created successfully! 🎉" : "اتعمل الجروب 🎉");
      setName(""); setPicked([]); setEmoji("📚");
      onCreated?.(group);
      onClose();
    } catch (e) {
      toast.error(e.message || (isEn ? "Error creating group" : "حصل خطأ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir={dir} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEn ? "New Study Group" : "جروب مذاكرة جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex flex-wrap gap-1 max-w-[120px]">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${emoji === e ? "bg-primary/20 border border-primary/40 scale-110" : "bg-secondary/50 hover:bg-secondary"}`}>
                  {e}
                </button>
              ))}
            </div>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder={isEn ? "Group name" : "اسم الجروب"} 
              className="flex-1" 
              dir="auto"
            />
          </div>

          <div>
            <p className="text-sm font-bold mb-2">
              {isEn ? `Add Friends (${picked.length})` : `ضيف أصحابك (${picked.length})`}
            </p>
            <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-none">
              {friends.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  {isEn ? "No friends yet — add friends from the Friends tab first" : "مفيش أصحاب — ضيف حد من صفحة الأصدقاء الأول"}
                </p>
              )}
              {friends.map((f) => {
                const sel = picked.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggle(f.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${sel ? "bg-primary/15" : "hover:bg-secondary/40"}`}>
                    <AnimatedAvatar src={f.avatar_url} frame={f.profile_frame} size={36} fallback="🎓" />
                    <span className="flex-1 text-start font-bold text-sm truncate">{f.name}</span>
                    {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={create} disabled={loading} className="w-full font-bold gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEn ? "Create Group" : "إنشاء الجروب"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}