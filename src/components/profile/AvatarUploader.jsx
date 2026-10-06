import React, { useRef, useState } from "react";
import { Upload, Check, Loader2, Image as ImageIcon, Video, Palette } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { AVATAR_STYLES } from "@/lib/avatars";
import GeneratedAvatar from "@/components/GeneratedAvatar";

const MAX = 20 * 1024 * 1024;

export default function AvatarUploader({ avatar, name = "", avatarStyle = null, onPick, isAdmin = false }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("ارفع صورة أو فيديو بس");
    if (!isAdmin && file.size > MAX) return toast.error("الحجم أكبر من 20MB");
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const file_url = res.file_url;
      onPick({ url: file_url, isVideo, styleId: null });
      toast.success(isVideo ? "اترفع الفيديو بنجاح 🎬" : "اترفعت صورتك بنجاح 🖼️");
    } catch (err) {
      console.error("Avatar upload failure:", err);
      toast.error(err?.message || "حصل خطأ في الرفع — جرب تاني");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const isGradient = avatar && avatar.startsWith("linear-gradient");

  return (
    <div>
      <p className="text-sm font-bold mb-3">صورتك الشخصية</p>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full mb-4 glass-card rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors py-5 flex flex-col items-center gap-2"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
        <span className="text-sm font-bold">{uploading ? "جاري الرفع..." : "ارفع صورة أو فيديو"}</span>
        <span className="text-[11px] text-muted-foreground flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> صورة <Video className="w-3 h-3" /> فيديو · {isAdmin ? "أي حجم 👑" : "حتى 20MB"}
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />

      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Palette className="w-3 h-3" /> أو اختار لون مميز</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {AVATAR_STYLES.map((s) => {
          const selected = avatar === s.gradient || avatarStyle === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onPick({ url: s.gradient, isVideo: false, styleId: s.id })}
              className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-colors flex items-center justify-center ${selected ? "border-primary scale-105 shadow-[0_0_16px_rgba(0,245,255,0.5)]" : "border-border hover:border-primary/50"}`}
              style={{ background: s.gradient }}
              title={s.label}
            >
              <span className="text-white font-black text-lg drop-shadow-lg">{(name || "?").trim()[0]?.toUpperCase() || "؟"}</span>
              {selected && <span className="absolute inset-0 bg-white/15 flex items-center justify-center"><Check className="w-5 h-5 text-white drop-shadow" /></span>}
            </button>
          );
        })}
      </div>
      {isGradient && <p className="text-[11px] text-muted-foreground mt-2">سيظهر الحرف الأول من اسمك بهذا التدرج ✨</p>}

      {/* live preview */}
      <div className="flex justify-center mt-5">
        <GeneratedAvatar src={!isGradient ? avatar : null} name={name} styleId={avatarStyle} size={72} />
      </div>
    </div>
  );
}