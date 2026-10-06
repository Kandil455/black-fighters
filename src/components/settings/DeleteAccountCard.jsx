import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

// Entities owned by the user that should be cleared on account deletion
const USER_ENTITIES = [
  "UserSettings", "CourseNote", "StudyActivity", "QuizResult",
  "GeneratedContent", "Notification", "CourseReminder",
];

export default function DeleteAccountCard() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const me = await base44.auth.me();

      // Prefer a native deleteAccount if the SDK exposes one
      if (typeof base44.auth.deleteAccount === "function") {
        await base44.auth.deleteAccount();
      } else {
        // Manual flow: wipe the user's data, then sign out
        for (const name of USER_ENTITIES) {
          try {
            const recs = await base44.entities[name].filter({ user_id: me.id }, "-created_date", 500);
            await Promise.all(recs.map((r) => base44.entities[name].delete(r.id)));
          } catch { /* entity may not have user_id — skip */ }
        }
      }

      toast.success(isEn ? "Account data deleted successfully" : "تم حذف بيانات حسابك");
      await base44.auth.logout();
    } catch (e) {
      toast.error(e.message || (isEn ? "Error during deletion" : "حصل خطأ أثناء الحذف"));
      setDeleting(false);
    }
  };

  const isConfirmed = isEn 
    ? (confirmText.trim().toLowerCase() === "delete" || confirmText.trim() === "حذف")
    : (confirmText.trim() === "حذف" || confirmText.trim().toLowerCase() === "delete");

  return (
    <div className="mt-8 glass-card rounded-3xl p-8 border border-destructive/30" dir={dir}>
      <h2 className="font-extrabold text-lg mb-2 flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-5 h-5" /> {isEn ? "Delete Account" : "حذف الحساب"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isEn 
          ? "All your account data (notes, activity, results, settings) will be permanently deleted and cannot be undone. You will be logged out immediately."
          : "هيتم حذف بياناتك (الملاحظات، النشاط، النتائج، الإعدادات...) نهائياً ولا يمكن التراجع. بعد الحذف هيتم تسجيل خروجك."}
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> {isEn ? "Delete My Account" : "حذف حسابي"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isEn ? "Confirm Account Deletion" : "تأكيد حذف الحساب"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEn ? (
                <>To confirm, type <span className="font-bold text-destructive">DELETE</span> in the box below.</>
              ) : (
                <>للتأكيد، اكتب كلمة <span className="font-bold text-destructive">حذف</span> في الخانة بالأسفل.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={isEn ? "Type: DELETE" : "اكتب: حذف"}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              {isEn ? "Cancel" : "إلغاء"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!isConfirmed || deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isEn ? "Permanent Delete" : "حذف نهائي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}