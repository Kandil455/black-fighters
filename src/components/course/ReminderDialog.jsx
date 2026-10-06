import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPlus, Loader2, Moon, Sun, Coffee, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { functions } from '@/api/index';
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function ReminderDialog({ open, onClose, courseTitle }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [datetime, setDatetime] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [duration, setDuration] = useState(60);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (open) {
      const now = new Date();
      
      const todayNight = new Date(now);
      todayNight.setHours(20, 0, 0, 0);
      
      const tomorrowMorning = new Date(now);
      tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
      tomorrowMorning.setHours(10, 0, 0, 0);

      const tomorrowNight = new Date(now);
      tomorrowNight.setDate(tomorrowNight.getDate() + 1);
      tomorrowNight.setHours(20, 0, 0, 0);

      const weekend = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
      weekend.setDate(now.getDate() + daysUntilFriday);
      weekend.setHours(10, 0, 0, 0);

      setOptions([
        { id: "today_night", label: isEn ? "Tonight" : "النهاردة بليل", sub: isEn ? "8:00 PM" : "8:00 م", date: todayNight, icon: Moon },
        { id: "tomorrow_morning", label: isEn ? "Tomorrow AM" : "بكرة الصبح", sub: isEn ? "10:00 AM" : "10:00 ص", date: tomorrowMorning, icon: Sun },
        { id: "tomorrow_night", label: isEn ? "Tomorrow PM" : "بكرة بليل", sub: isEn ? "8:00 PM" : "8:00 م", date: tomorrowNight, icon: Moon },
        { id: "weekend", label: isEn ? "Weekend" : "الويك إند", sub: isEn ? "Fri 10 AM" : "الجمعة 10 ص", date: weekend, icon: Coffee },
        { id: "custom", label: isEn ? "Custom Time" : "تحديد وقت", sub: isEn ? "Pick time" : "بمِزاجك", date: null, icon: CalendarDays },
      ]);
      setSelectedOption(null);
      setDatetime("");
    }
  }, [open, isEn]);

  const handleOptionSelect = (opt) => {
    setSelectedOption(opt.id);
    if (opt.date) {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(opt.date.getTime() - tzoffset)).toISOString().slice(0,16);
      setDatetime(localISOTime);
    } else {
      setDatetime("");
    }
  };

  const save = async () => {
    if (!datetime) { toast.error(isEn ? "Select study date & time" : "اختر معاد للمذاكرة"); return; }
    setSaving(true);
    try {
      const res = await functions.invoke("addStudyReminder", {
        title: isEn ? `Study: ${courseTitle}` : `مذاكرة: ${courseTitle}`,
        startTime: new Date(datetime).toISOString(),
        durationMinutes: Number(duration),
        description: isEn ? "Study reminder from Black Fighters" : "تذكير مذاكرة من منصة Black Fighters",
      });
      if (res.data.error) throw new Error(res.data.error);
      toast.success(isEn ? "Added to Google Calendar! 📅" : "اتضاف على تقويم Google! 📅");
      onClose();
      setDatetime("");
    } catch (err) {
      toast.error(err.message || (isEn ? "Error occurred, try again" : "حصل خطأ، جرب تاني"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d18]/95 backdrop-blur-2xl border border-primary/30" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" /> {isEn ? "Study Reminder" : "تذكير مذاكرة"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-semibold mb-2">{isEn ? "When will you study?" : "هتذاكر إمتى؟"}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {options.map((opt) => {
                const Icon = opt.icon;
                const active = selectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40"
                        : "border-border bg-secondary/20 hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
            
            {(selectedOption === "custom" || (selectedOption && options.find(o => o.id === selectedOption)?.date === null)) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2">
                <Input 
                  type="datetime-local" 
                  value={datetime} 
                  onChange={(e) => { setDatetime(e.target.value); setSelectedOption("custom"); }} 
                  className="font-bold border-primary/50"
                />
              </motion.div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">{isEn ? "Duration (minutes)" : "المدة (دقيقة)"}</p>
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${duration === m ? "border-primary text-primary neon-glow-cyan" : "border-border text-muted-foreground"}`}
                >
                  {m} {isEn ? "m" : "د"}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full gap-2 font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            {isEn ? "Add to Calendar" : "إضافة للتقويم"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}