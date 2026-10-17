import React from "react";
import { Sparkles, X, Send, Loader2 } from "@/components/ui/animatedIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizeMedicalLatex } from "@/lib/youtubeService";

export default function YouTubeChatDrawer({
  isOpen,
  onClose,
  isEn,
  dir,
  chatMessages,
  chatInput,
  setChatInput,
  isModifying,
  onSendMessage,
  onApplyPrompt,
}) {
  if (!isOpen) return null;

  const quickChips = [
    {
      label: isEn ? "📊 Clinical Comparison" : "📊 مقارنة سريرية",
      prompt: isEn
        ? "Add a precise clinical comparison table between the mentioned conditions"
        : "أضف جدول مقارنة سريري دقيق بين الحالات المذكورة",
    },
    {
      label: isEn ? "💉 Emergency Dosages" : "💉 جرعات الطوارئ",
      prompt: isEn
        ? "Add a dedicated section detailing emergency dosages and resuscitation calculations"
        : "أضف قسم حساب وتفصيل جرعات أدوية الطوارئ والإنعاش",
    },
    {
      label: isEn ? "⚠️ Exam Pitfalls" : "⚠️ فخاخ الامتحان",
      prompt: isEn
        ? "Add a prominent section highlighting Exam Pitfalls and common fatal emergency traps"
        : "أضف قسماً بارزاً يوضح فخاخ الامتحان والأخطاء القاتلة",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        dir={dir}
        className={`w-full sm:max-w-md md:max-w-lg bg-card ${
          isEn ? "border-l" : "border-r sm:border-l"
        } border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isEn ? "Live Clinical AI Refiner 🩺⚡" : "شات التعديل السريري الحي 🩺⚡"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Edit notes, add comparison tables & calculations"
                  : "تعديل المذكرة وإضافة جداول وحسابات"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-bl-none shadow-md"
                    : "bg-muted border border-border text-foreground rounded-br-none"
                }`}
              >
                {sanitizeMedicalLatex(msg.text)}
              </div>
            </div>
          ))}
          {isModifying && (
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl bg-muted border border-border text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>
                  {isEn
                    ? "Modifying & restructuring content..."
                    : "جاري التعديل وإعادة الهيكلة..."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Quick Chips */}
        <div className="p-3 border-t border-border bg-muted/20 flex flex-wrap gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isModifying}
              onClick={() => onApplyPrompt(chip.prompt, chip.label)}
              className="px-2 py-1 rounded-lg bg-card hover:bg-primary/20 hover:border-primary/30 border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Drawer Footer Input */}
        <form onSubmit={onSendMessage} className="p-4 border-t border-border bg-card flex gap-2">
          <Input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              isEn
                ? "Type your request (e.g. Add comparison table, adjust...)"
                : "اكتب طلبك (مثال: أضف جدول مقارنة، عدل كذا...)"
            }
            className="bg-muted border-border text-foreground text-xs py-4 flex-1"
            disabled={isModifying}
          />
          <Button
            type="submit"
            disabled={isModifying || !chatInput.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 text-xs font-bold"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
