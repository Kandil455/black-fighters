import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BellPlus, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function ReviewReminderDialog({ open, onClose, course }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("19:00");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date) return toast.error(isEn ? "Select review date" : "اختار تاريخ المراجعة");
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const reminderDateTime = new Date(`${date}T${time}:00`);
      await base44.entities.CourseReminder.create({
        user_id: user.id,
        course_id: course.id,
        course_title: course.title,
        subject: course.subject || (isEn ? "General" : "غير مصنف"),
        reminder_date: date,
        reminder_time: time,
        reminder_datetime: reminderDateTime.toISOString(),
        note,
        status: "pending",
        notified: false,
      });
      toast.success(isEn ? "Review reminder saved! You will receive an alert 🔔" : "اتحفظ التذكير وهيوصلك تنبيه وقت المحاضرة 🔔");
      setDate("");
      setNote("");
      setTime("19:00");
      onClose();
    } catch (err) {
      toast.error(err.message || (isEn ? "Failed to save reminder" : "حصل خطأ في حفظ تذكير المراجعة"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir={dir} className="bg-[#0a0d18]/95 backdrop-blur-2xl border border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellPlus className="w-5 h-5 text-primary" /> {isEn ? "Schedule Course Review" : "ميعاد مراجعة للكورس"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/70" />
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-background/70" />
          </div>
          <Textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder={isEn ? "Optional note: What specific topics to focus on?" : "ملاحظة اختيارية: أراجع إيه تحديدًا؟"} 
            className="bg-background/70 min-h-24" 
          />
          <Button onClick={save} disabled={saving} className="w-full gap-2 font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            {isEn ? "Save Reminder" : "حفظ التذكير"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}