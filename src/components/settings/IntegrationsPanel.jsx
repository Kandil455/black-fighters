import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Trash2, Send, ExternalLink, Slack } from "lucide-react";
import { toast } from "sonner";
import { GoogleDriveIcon } from "@/components/ui/icons";
import {
  getIntegrationSettings,
  saveIntegrationSettings,
  isValidSlackWebhook,
  sendSlackMessage,
  requestDriveToken,
} from "@/lib/integrations";
import { useLocale } from "@/lib/LocaleContext";

export default function IntegrationsPanel() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [loading, setLoading] = useState(true);
  const [slackUrl, setSlackUrl] = useState("");
  const [savedSlack, setSavedSlack] = useState("");
  const [savingSlack, setSavingSlack] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);

  const [driveConnected, setDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getIntegrationSettings();
      setSavedSlack(s.slack_webhook_url || "");
      setSlackUrl(s.slack_webhook_url || "");
      setDriveConnected(!!s.gdrive_connected);
      setLoading(false);
    })();
  }, []);

  const saveSlack = async () => {
    const url = slackUrl.trim();
    if (!isValidSlackWebhook(url)) {
      return toast.error(isEn ? "URL must start with https://hooks.slack.com/services/" : "الرابط لازم يبدأ بـ https://hooks.slack.com/services/");
    }
    setSavingSlack(true);
    await saveIntegrationSettings({ slack_webhook_url: url });
    setSavedSlack(url);
    setSavingSlack(false);
    toast.success(isEn ? "Slack webhook saved ✅ Notifications active" : "اتحفظ رابط Slack ✅ — هتوصلك إشعارات بأي ملخص جديد");
  };

  const removeSlack = async () => {
    await saveIntegrationSettings({ slack_webhook_url: "" });
    setSavedSlack("");
    setSlackUrl("");
    toast.success(isEn ? "Slack webhook removed" : "اتمسح رابط Slack");
  };

  const testSlack = async () => {
    setTestingSlack(true);
    const ok = await sendSlackMessage(slackUrl.trim(), {
      text: isEn ? "✅ Test message from Black Fighters — Integration working!" : "✅ تجربة من Black Fighters — الربط شغّال تمام!",
    });
    setTestingSlack(false);
    ok 
      ? toast.success(isEn ? "Test message sent to Slack 🎉" : "اتبعتت رسالة تجريبية لـ Slack 🎉") 
      : toast.error(isEn ? "Webhook link failed — please verify" : "الرابط مش شغّال — اتأكد منه");
  };

  const connectDrive = async () => {
    setConnectingDrive(true);
    try {
      const token = await requestDriveToken();
      if (token) {
        await saveIntegrationSettings({ gdrive_connected: true });
        setDriveConnected(true);
        toast.success(isEn ? "Google Drive connected ✅ You can now save summaries" : "اتربط Google Drive ✅ — تقدر تحفظ ملخصاتك عليه");
      }
    } catch (e) {
      toast.error(e.message || (isEn ? "Failed to connect Google Drive" : "فشل ربط Google Drive"));
    }
    setConnectingDrive(false);
  };

  const disconnectDrive = async () => {
    await saveIntegrationSettings({ gdrive_connected: false });
    setDriveConnected(false);
    toast.success(isEn ? "Google Drive disconnected" : "اتفصل Google Drive");
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8 border border-border flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-8 border border-border space-y-8" dir={dir}>
      <div>
        <h2 className="font-extrabold text-lg mb-1 flex items-center gap-2">
          🔗 {isEn ? "External Integrations" : "الربط الخارجي"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEn 
            ? "Connect third-party accounts using your personal credentials — processed directly in your browser."
            : "اربط حساباتك بمفاتيحك الخاصة — كله بيشتغل من المتصفح مباشرة"}
        </p>
      </div>

      {/* ─── Slack ─── */}
      <div className="rounded-2xl border border-[#611f69]/40 bg-[#611f69]/5 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#611f69]/15 border border-[#611f69]/30 flex items-center justify-center">
              <Slack className="w-5 h-5 text-[#e01e5a]" />
            </div>
            <div>
              <p className="font-bold">Slack</p>
              <p className="text-xs text-muted-foreground">{isEn ? "Receive Slack notifications for new summaries" : "إشعار على Slack بأي ملخص جديد"}</p>
            </div>
          </div>
          {savedSlack && (
            <span className="text-xs font-bold text-[hsl(152,100%,50%)] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {isEn ? "Connected" : "مربوط"}
            </span>
          )}
        </div>

        <label className="text-sm font-semibold mb-2 block">Incoming Webhook URL</label>
        <Input
          dir="ltr"
          type="password"
          placeholder="https://hooks.slack.com/services/..."
          value={slackUrl}
          onChange={(e) => setSlackUrl(e.target.value)}
        />
        <a
          href="https://api.slack.com/messaging/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> {isEn ? "Create Webhook here" : "اعمل Webhook من هنا"}
        </a>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={saveSlack} disabled={savingSlack} className="font-bold gap-2">
            {savingSlack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEn ? "Save" : "حفظ"}
          </Button>
          <Button onClick={testSlack} disabled={testingSlack || !isValidSlackWebhook(slackUrl)} variant="outline" className="font-bold gap-2">
            {testingSlack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isEn ? "Test" : "تجربة"}
          </Button>
          {savedSlack && (
            <Button onClick={removeSlack} variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Google Drive ─── */}
      <div className="rounded-2xl border border-[#4285F4]/30 bg-[#4285F4]/5 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/20 flex items-center justify-center">
              <GoogleDriveIcon size={24} />
            </div>
            <div>
              <p className="font-bold flex items-center gap-2">
                <span>Google Drive</span>
                <span className="text-[10px] bg-[#4285F4]/20 text-[#4285F4] px-1.5 py-0.5 rounded font-mono font-bold">DRIVE</span>
              </p>
              <p className="text-xs text-muted-foreground">{isEn ? "Save summaries directly to your Google Drive" : "احفظ ملخصاتك على درايف مباشرة"}</p>
            </div>
          </div>
          {driveConnected && (
            <span className="text-xs font-bold text-[hsl(152,100%,50%)] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {isEn ? "Connected" : "مربوط"}
            </span>
          )}
        </div>

        <div className="space-y-3 mt-3">
          {driveConnected ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {isEn ? "Ready to save summaries to your Drive" : "جاهز لحفظ ومزامنة ملخصاتك على حسابك في Google Drive"}
              </span>
              <Button onClick={disconnectDrive} variant="outline" size="sm" className="font-bold gap-1.5 text-xs text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3.5 h-3.5" /> {isEn ? "Disconnect" : "إلغاء الربط"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "Connect your personal Google Drive to export summaries and quizzes in one click."
                  : "اربط حساب Google Drive الخاص بك لحفظ الملخصات والأسئلة بضغطة زر واحدة وبدون أي تعقيد."}
              </p>
              <Button onClick={connectDrive} disabled={connectingDrive} className="font-bold gap-2 bg-[#4285F4] hover:bg-[#3367d6] text-white shadow-lg shadow-blue-500/20">
                {connectingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleDriveIcon size={16} />}
                {isEn ? "Connect Google Drive Now" : "اربط Google Drive الآن 🚀"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}