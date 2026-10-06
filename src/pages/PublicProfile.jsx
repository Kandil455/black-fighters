import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, ArrowRight, UserX } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import ProfileCard from "@/components/profile/ProfileCard";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [list, current] = await Promise.all([
          base44.entities.User.filter({ id }),
          base44.auth.me().catch(() => null),
        ]);
        setUser(list?.[0] || null);
        setMe(current);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-32 text-center text-muted-foreground" dir={dir}>
        <UserX className="w-14 h-14 mx-auto mb-3 opacity-40" />
        <p className="font-bold">{isEn ? "Profile not found" : "البروفايل ده مش موجود"}</p>
      </div>
    );
  }

  const isMe = me?.id === user.id;

  return (
    <div className="max-w-3xl mx-auto pb-12" dir={dir}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowRight className={isEn ? "w-4 h-4 rotate-180" : "w-4 h-4"} /> {isEn ? "Back" : "رجوع"}
      </button>

      <ProfileCard user={user} />

      {!isMe && (
        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            className="h-12 px-8 font-bold gap-2 neon-glow-cyan"
            onClick={() => navigate(`/friends?chat=${user.id}`)}
          >
            <MessageCircle className="w-5 h-5" /> {isEn ? "Message / Chat" : "تواصل / راسل"}
          </Button>
        </div>
      )}
    </div>
  );
}