import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardType, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

export default function TextPastePanel({ onSubmit }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [text, setText] = useState("");

  const submitText = () => {
    const currentText = text || document.querySelector('textarea[name="courseText"]')?.value || '';
    onSubmit(currentText);
  };

  return (
    <div className="glass-card border border-accent/25 rounded-3xl p-6 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardType className="w-5 h-5 text-accent" />
        <h3 className="font-extrabold">{isEn ? "Or Paste Text Here" : "أو الصق النص هنا"}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {isEn 
          ? "After entering text, you will choose the language and summary style before generating."
          : "بعد ما تدخل النص هتختار اللغة وشكل الملخص قبل التوليد."}
      </p>
      <Textarea
        name="courseText"
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="auto"
        placeholder={isEn ? "Paste lecture notes or text here..." : "الصق المحاضرة أو النوتس هنا..."}
        className="min-h-44 bg-background/70 text-start leading-loose"
      />
      <Button
        onClick={submitText}
        disabled={false}
        className="w-full mt-4 font-bold gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {isEn ? "Summarize Text Now" : "لخّص النص الآن"}
      </Button>
    </div>
  );
}