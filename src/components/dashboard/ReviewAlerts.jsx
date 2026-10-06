import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { BellRing, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const reminderTime = (reminder) => reminder.reminder_datetime || (reminder.reminder_date ? `${reminder.reminder_date}T${reminder.reminder_time || "00:00"}:00` : "");
const soon = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
};

export default function ReviewAlerts() {
  const queryClient = useQueryClient();
  const { data: reminders = [] } = useQuery({
    queryKey: ["course-reminders"],
    queryFn: () => base44.entities.CourseReminder.filter({ status: "pending" }, "-created_date", 20),
  });

  const due = reminders.filter((r) => {
    const value = reminderTime(r);
    return value && new Date(value).getTime() <= soon().getTime();
  }).slice(0, 4);
  if (!due.length) return null;

  const done = async (id) => {
    await base44.entities.CourseReminder.update(id, { status: "done" });
    queryClient.invalidateQueries({ queryKey: ["course-reminders"] });
  };

  return (
    <div className="glass-card rounded-3xl p-5 border border-primary/30 neon-glow-cyan mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BellRing className="w-5 h-5 text-primary" />
        <h2 className="font-black">تنبيهات مراجعة قريبة</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {due.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-background/40 p-4">
            <Link to={`/course/${r.course_id}`} className="font-bold hover:text-primary transition-colors line-clamp-1">{r.course_title}</Link>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(reminderTime(r)).getTime() <= Date.now() ? "مستحق الآن" : "قريبًا"}: {format(new Date(reminderTime(r)), "dd/MM/yyyy - HH:mm")}
            </p>
            {r.note && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{r.note}</p>}
            <Button size="sm" variant="outline" onClick={() => done(r.id)} className="gap-1.5 mt-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> تمت المراجعة
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}