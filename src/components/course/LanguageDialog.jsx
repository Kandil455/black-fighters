import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/LocaleContext";

export default function LanguageDialog({ open, onSelect, onClose }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dir} className="bg-[#0a0d18]/95 backdrop-blur-2xl border border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-start">
            {isEn ? "Select Content Language 🌐" : "الملف لغته مختلطة 🌐"}
          </DialogTitle>
          <DialogDescription className="text-start">
            {isEn ? "Which language would you like to generate this study material in?" : "عايز المحتوى يتولد بأي لغة؟"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-2 sm:grid-cols-2">
          <Button onClick={() => onSelect("ar")} className="font-bold h-14 text-base gap-2">
            🇪🇬 العربية
          </Button>
          <Button onClick={() => onSelect("en")} variant="outline" className="font-bold h-14 text-base gap-2">
            🇬🇧 English
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
