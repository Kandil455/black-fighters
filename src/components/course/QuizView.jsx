import React, { useState, useEffect } from "react";
import ClassicQuizView from "./ClassicQuizView";
import ModernQuizView from "./ModernQuizView";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

export default function QuizView(props) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [useModern, setUseModern] = useState(() => {
    return localStorage.getItem("use_modern_quiz") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("use_modern_quiz", useModern);
  }, [useModern]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-end mb-4 px-4">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs font-bold text-white/70 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {isEn ? "Modern UI" : "التصميم الجديد (Neon)"}
          </span>
          <Switch checked={useModern} onCheckedChange={setUseModern} />
        </div>
      </div>
      {useModern ? <ModernQuizView {...props} /> : <ClassicQuizView {...props} />}
    </div>
  );
}
