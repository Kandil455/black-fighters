import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { fetchProviderModels, testAiKey } from "@/lib/ai";
import { PROVIDERS as AI_PROVIDERS } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Plus,
  Trash2,
  Check,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  Globe,
  Headphones,
  Layers,
  ArrowUp,
  ArrowDown,
  Edit3,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const LOCAL_CACHE_KEY = "bf_ai_providers_pool_v2";

const THIRD_PARTY_PRESETS = [
  {
    id: "gemini",
    display_name: "Google Gemini",
    protocol: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    default_model: "gemini-3.5-flash-lite",
    badge: "أساسي + تفريغ صوتي",
    description: "يدعم التلخيص السريع وتفريغ المحاضرات الصوتية (gemini-3.5-transcribe)",
  },
  {
    id: "codecraft",
    display_name: "CodeCraft (Claude / DeepSeek / GPT-5)",
    protocol: "openai",
    base_url: "https://codecraftapi.com/v1",
    default_model: "claude-sonnet-5",
    badge: "Claude 5 + DeepSeek V4",
    description: "بوابتك الخاصة لنماذج Claude Sonnet 5 و DeepSeek V4 لتنظيم المحاضرات",
  },
  {
    id: "groq",
    display_name: "Groq Cloud",
    protocol: "openai",
    base_url: "https://api.groq.com/openai/v1",
    default_model: "openai/gpt-oss-120b",
    badge: "فائق السرعة",
    description: "استجابة فورية بأقل من ثانية للأسئلة والشات",
  },
  {
    id: "openrouter",
    display_name: "OpenRouter",
    protocol: "openai",
    base_url: "https://openrouter.ai/api/v1",
    default_model: "openrouter/free",
    badge: "+200 موديل",
    description: "بوابة موحدة لمئات النماذج المجانية والمدفوعة",
  },
  {
    id: "apmix",
    display_name: "APMIX.AI",
    protocol: "openai",
    base_url: "https://api.apmix.ai/v1",
    default_model: "claude-sonnet-4-6-free",
    badge: "Claude Free",
    description: "نماذج Claude Sonnet 4.6 و Space Bunny مجاناً",
  },
  {
    id: "zai",
    display_name: "Z.ai (GLM-4.7)",
    protocol: "openai",
    base_url: "https://api.z.ai/api/paas/v4",
    default_model: "glm-4.7-flash",
    badge: "نصوص + صور",
    description: "نماذج GLM-4.7 السريعة للنصوص والصور",
  },
];

const PROTOCOLS = [
  { id: "openai", label: "OpenAI Chat Completions (متوافق مع أغلب المزوّدين)" },
  { id: "gemini", label: "Google Gemini Native API" },
  { id: "anthropic", label: "Anthropic Messages API" },
];

const PURPOSES = [
  {
    id: "all",
    label: "كل الموقع (التلخيص + الكويزات + الشات + التبديل التلقائي)",
    shortLabel: "كل الموقع",
  },
  {
    id: "lecture_transcribe",
    label: "تفريغ المحاضرات الصوتية والفيديو فقط (Gemini 3.5 Transcribe)",
    shortLabel: "تفريغ المحاضرات 🎙️",
  },
  {
    id: "lecture_organize",
    label: "تنظيم وتلخيص المحاضرات الصوتية (DeepSeek / Organizer)",
    shortLabel: "تنظيم المحاضرات",
  },
];

function parseKeysInput(raw) {
  if (Array.isArray(raw)) return raw.map((k) => String(k || "").trim()).filter(Boolean);
  return String(raw || "")
    .split(/[\n,;]+/)
    .map((k) => k.replace(/["']/g, "").trim())
    .filter(Boolean);
}

function maskKeyString(k) {
  const s = String(k || "").trim();
  if (!s) return "بدون مفتاح";
  if (s.length <= 10) return "••••••••";
  return `${s.slice(0, 6)}••••••${s.slice(-4)}`;
}

export default function AiModelsAndProvidersManager({ isAdmin = true, onConfigUpdated }) {
  const [modeTab, setModeTab] = useState("custom"); // "preset" | "custom"
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state matching Screenshot 1 (Custom model API + Third-party provider)
  const [editingDocId, setEditingDocId] = useState(null);
  const [providerId, setProviderId] = useState("gemini-main");
  const [displayName, setDisplayName] = useState("Google Gemini (تفريغ المحاضرات + الموقع)");
  const [baseUrl, setBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta");
  const [protocol, setProtocol] = useState("gemini");
  const [purpose, setPurpose] = useState("all");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [extraKeysList, setExtraKeysList] = useState([]);
  const [extraKeyDraft, setExtraKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Models state
  const [availableModels, setAvailableModels] = useState([
    { id: "gemini-3.5-transcribe", name: "Gemini 3.5 Transcribe (تفريغ المحاضرات الصوتية بالحرف)" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite (سريع جداً للتلخيص والكويزات)" },
  ]);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [customModelInput, setCustomModelInput] = useState("");

  // Action states
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAllConfigs = async () => {
    setLoading(true);
    try {
      let list = [];
      if (isAdmin) {
        const res = await base44.entities.AdminConfig.filter().catch(() => []);
        if (Array.isArray(res)) list = res;
      } else {
        const settings = await base44.entities.UserSettings.get().catch(() => null);
        if (Array.isArray(settings?.custom_providers)) {
          list = settings.custom_providers;
        } else if (settings?.api_key) {
          list = [
            {
              id: settings.provider || "default",
              provider: settings.provider || "gemini",
              display_name: settings.display_name || settings.provider || "Gemini",
              protocol: settings.protocol || (settings.provider === "gemini" ? "gemini" : "openai"),
              base_url: settings.base_url || "",
              purpose: settings.purpose || "all",
              api_key: settings.api_key,
              api_keys: settings.api_keys || [settings.api_key],
              selected_model: settings.model || "gemini-3.5-flash-lite",
              available_models: settings.available_models || [],
              is_active: true,
              is_primary: true,
              priority: 1,
            },
          ];
        }
      }

      // Merge with localStorage cache if Firestore returned empty or partial
      try {
        const localRaw = localStorage.getItem(LOCAL_CACHE_KEY);
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            for (const item of localList) {
              if (item?.id && !list.some((x) => x.id === item.id)) {
                list.push(item);
              }
            }
          }
        }
      } catch {}

      list.sort((a, b) => {
        if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
        return Number(a.priority ?? 50) - Number(b.priority ?? 50);
      });

      setSavedConfigs(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllConfigs();
  }, [isAdmin]);

  const persistLocalMirror = (nextList) => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(nextList));
    } catch {}
  };

  const applyPreset = (preset) => {
    setEditingDocId(null);
    setProviderId(preset.id);
    setDisplayName(preset.display_name);
    setBaseUrl(preset.base_url);
    setProtocol(preset.protocol);
    const catalogModels = AI_PROVIDERS[preset.id]?.models || [];
    const normalized = catalogModels.map((m) => ({ id: m.id, name: m.name }));
    if (preset.id === "gemini" && !normalized.some((m) => m.id === "gemini-3.5-transcribe")) {
      normalized.unshift({
        id: "gemini-3.5-transcribe",
        name: "Gemini 3.5 Transcribe (تفريغ المحاضرات الصوتية بالحرف)",
      });
    }
    setAvailableModels(normalized);
    setSelectedModel(preset.default_model || normalized[0]?.id || "");
  };

  const handleAddExtraKey = () => {
    const parsed = parseKeysInput(extraKeyDraft);
    if (!parsed.length) return;
    const next = [...extraKeysList];
    for (const k of parsed) {
      if (!next.includes(k) && k !== apiKeyInput.trim()) next.push(k);
    }
    setExtraKeysList(next);
    setExtraKeyDraft("");
    toast.success(`تمت إضافة ${parsed.length} مفتاح إضافي للتبديل التلقائي (Rotation)`);
  };

  const handleRemoveExtraKey = (keyToRemove) => {
    setExtraKeysList(extraKeysList.filter((k) => k !== keyToRemove));
  };

  const getAllEnteredKeys = () => {
    const all = [
      ...parseKeysInput(apiKeyInput),
      ...extraKeysList,
      ...parseKeysInput(extraKeyDraft),
    ];
    return Array.from(new Set(all));
  };

  const saveConfigRecord = async (record, { silent = false } = {}) => {
    const cleanId = String(record.id || record.provider_id || "custom-ai")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    const finalRecord = {
      ...record,
      id: cleanId,
      provider_id: cleanId,
      provider: record.provider || cleanId,
      updated_date: new Date().toISOString(),
    };

    const nextList = [
      finalRecord,
      ...savedConfigs.filter((c) => c.id !== cleanId),
    ].sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
      return Number(a.priority ?? 50) - Number(b.priority ?? 50);
    });

    setSavedConfigs(nextList);
    persistLocalMirror(nextList);

    if (isAdmin) {
      await base44.entities.AdminConfig.update(cleanId, finalRecord).catch((err) => {
        console.warn("[AiModelsAndProvidersManager] AdminConfig save warning:", err);
      });
    }

    // Also sync primary & custom_providers to UserSettings so current session uses it immediately
    await base44.entities.UserSettings.upsert({
      provider: finalRecord.provider,
      api_key: finalRecord.api_key,
      api_keys: finalRecord.api_keys,
      model: finalRecord.selected_model || finalRecord.model,
      base_url: finalRecord.base_url,
      protocol: finalRecord.protocol,
      available_models: finalRecord.available_models,
      custom_providers: nextList,
    }).catch(() => {});

    if (!silent) {
      toast.success(`تم حفظ إعدادات "${finalRecord.display_name}" وتفعيلها بنجاح`);
    }
    if (typeof onConfigUpdated === "function") onConfigUpdated(nextList);
    return finalRecord;
  };

  // Fetch models from the provider endpoint and AUTOMATICALLY SAVE them
  const handleFetchAvailableModels = async () => {
    const keys = getAllEnteredKeys();
    const primaryKey = keys[0] || "";
    if (!primaryKey && providerId !== "pollinations") {
      toast.error("أدخل مفتاح الـ API أولاً عشان نجلب النماذج المتاحة");
      return;
    }

    setFetchingModels(true);
    try {
      const models = await fetchProviderModels({
        provider: providerId,
        baseUrl: baseUrl.trim(),
        protocol,
        apiKey: primaryKey,
      });

      if (!models || models.length === 0) {
        toast.warning("السيرفر لم يُرجع قائمة نماذج — يمكنك كتابة اسم الموديل مباشرة بالأسفل");
        return;
      }

      setAvailableModels(models);
      const nextSelected =
        purpose === "lecture_transcribe" && models.some((m) => m.id === "gemini-3.5-transcribe")
          ? "gemini-3.5-transcribe"
          : selectedModel && models.some((m) => m.id === selectedModel)
            ? selectedModel
            : models[0].id;
      setSelectedModel(nextSelected);

      // Automatically save the fetched models & provider config immediately ("و بتتحفظ لما اعمل ال fetch")
      const cleanId = String(providerId || "custom-gateway")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-");

      const existing = savedConfigs.find((c) => c.id === cleanId);
      await saveConfigRecord(
        {
          id: cleanId,
          provider: cleanId,
          display_name: displayName.trim() || cleanId,
          base_url: baseUrl.trim(),
          protocol,
          purpose,
          api_key: primaryKey,
          api_keys: keys,
          selected_model: nextSelected,
          model: nextSelected,
          available_models: models,
          is_active: true,
          is_primary: existing ? Boolean(existing.is_primary) : savedConfigs.length === 0,
          priority: existing?.priority ?? savedConfigs.length + 1,
        },
        { silent: true },
      );

      toast.success(`تم جلب ${models.length} نموذج وحفظها تلقائياً في حسابك!`);
    } catch (err) {
      toast.error(err?.message || "تعذّر جلب النماذج من الرابط المحدد");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    const keys = getAllEnteredKeys();
    if (!keys.length && providerId !== "pollinations") {
      toast.error("أدخل مفتاح الـ API أولاً لاختباره");
      return;
    }
    setTestingKey(true);
    try {
      await testAiKey(providerId, keys[0], {
        baseUrl: baseUrl.trim(),
        protocol,
        model: customModelInput.trim() || selectedModel,
      });
      toast.success(`المفتاح شغّال 100%! (${keys.length > 1 ? `مع ${keys.length} مفاتيح في التبديل التلقائي` : "تم التحقق بنجاح"})`);
    } catch (err) {
      toast.error(err?.message || "فشل اختبار الاتصال بالمفتاح");
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveProvider = async () => {
    const cleanId = String(providerId || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (!cleanId) {
      toast.error("يرجى كتابة معرّف للمزوّد (Provider ID) بالانجليزي مثل gemini-main");
      return;
    }
    const keys = getAllEnteredKeys();
    if (!keys.length && cleanId !== "pollinations") {
      toast.error("يرجى إدخال مفتاح API واحد على الأقل");
      return;
    }

    const finalModel =
      purpose === "lecture_transcribe"
        ? "gemini-3.5-transcribe"
        : customModelInput.trim() || selectedModel || "gemini-3.5-flash-lite";

    let updatedModels = [...availableModels];
    if (finalModel && !updatedModels.some((m) => m.id === finalModel)) {
      updatedModels = [{ id: finalModel, name: finalModel }, ...updatedModels];
      setAvailableModels(updatedModels);
    }

    setSaving(true);
    try {
      const existing = savedConfigs.find((c) => c.id === cleanId);
      const isFirst = savedConfigs.length === 0;
      await saveConfigRecord({
        id: cleanId,
        provider: cleanId,
        display_name: displayName.trim() || cleanId,
        base_url: baseUrl.trim(),
        protocol,
        purpose,
        api_key: keys[0] || "",
        api_keys: keys,
        selected_model: finalModel,
        model: finalModel,
        available_models: updatedModels,
        is_active: true,
        is_primary: existing ? Boolean(existing.is_primary) : isFirst,
        priority: existing?.priority ?? savedConfigs.length + 1,
      });
      setEditingDocId(null);
      setCustomModelInput("");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadIntoForm = (cfg) => {
    setEditingDocId(cfg.id);
    setProviderId(cfg.id || cfg.provider || "custom-ai");
    setDisplayName(cfg.display_name || cfg.provider || "");
    setBaseUrl(cfg.base_url || "");
    setProtocol(cfg.protocol || (cfg.provider === "gemini" ? "gemini" : "openai"));
    setPurpose(cfg.purpose || "all");
    const keys = Array.isArray(cfg.api_keys) && cfg.api_keys.length
      ? cfg.api_keys
      : parseKeysInput(cfg.api_key);
    setApiKeyInput(keys[0] || "");
    setExtraKeysList(keys.slice(1));
    const models = Array.isArray(cfg.available_models) && cfg.available_models.length
      ? cfg.available_models
      : [{ id: cfg.selected_model || cfg.model || "gemini-3.5-flash-lite", name: cfg.selected_model || cfg.model || "gemini-3.5-flash-lite" }];
    setAvailableModels(models);
    setSelectedModel(cfg.selected_model || cfg.model || models[0]?.id || "");
    toast.info(`تم تحميل "${cfg.display_name || cfg.id}" للتعديل`);
  };

  const handleSetPrimary = async (cfg) => {
    const nextList = savedConfigs.map((item) => ({
      ...item,
      is_primary: item.id === cfg.id,
      is_active: item.id === cfg.id ? true : item.is_active,
    }));
    setSavedConfigs(nextList);
    persistLocalMirror(nextList);

    for (const item of nextList) {
      if (isAdmin) {
        await base44.entities.AdminConfig.update(item.id, item).catch(() => {});
      }
    }
    await base44.entities.UserSettings.upsert({
      provider: cfg.provider || cfg.id,
      api_key: cfg.api_key,
      api_keys: cfg.api_keys || [cfg.api_key],
      model: cfg.selected_model || cfg.model,
      base_url: cfg.base_url || "",
      protocol: cfg.protocol || "openai",
      available_models: cfg.available_models || [],
      custom_providers: nextList,
    }).catch(() => {});
    toast.success(`تم تعيين "${cfg.display_name || cfg.id}" كمزوّد أساسي نشط للموقع الآن`);
  };

  const handleQuickChangeSavedModel = async (cfg, newModelId) => {
    const updated = {
      ...cfg,
      selected_model: newModelId,
      model: newModelId,
    };
    await saveConfigRecord(updated, { silent: true });
    toast.success(`تم تغيير الموديل النشط إلى ${newModelId}`);
  };

  const handleToggleActive = async (cfg) => {
    const updated = { ...cfg, is_active: !cfg.is_active };
    await saveConfigRecord(updated, { silent: true });
    toast.success(updated.is_active ? "تم تفعيل المزوّد في التبديل التلقائي" : "تم إيقاف المزوّد مؤقتاً");
  };

  const handleMovePriority = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= savedConfigs.length) return;
    const copy = [...savedConfigs];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reindexed = copy.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setSavedConfigs(reindexed);
    persistLocalMirror(reindexed);
    if (isAdmin) {
      for (const item of reindexed) {
        await base44.entities.AdminConfig.update(item.id, item).catch(() => {});
      }
    }
  };

  const handleDeleteConfig = async (cfg) => {
    const nextList = savedConfigs.filter((c) => c.id !== cfg.id);
    setSavedConfigs(nextList);
    persistLocalMirror(nextList);
    if (isAdmin) {
      await base44.entities.AdminConfig.delete(cfg.id).catch(() => {});
    }
    await base44.entities.UserSettings.upsert({ custom_providers: nextList }).catch(() => {});
    toast.success(`تم حذف "${cfg.display_name || cfg.id}"`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-[#0b1018] border border-emerald-500/25 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-emerald-400" animated={false} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white">
                  إدارة مزوّدي الذكاء الاصطناعي والـ API المخصص (Multi-AI Rotation)
                </h2>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                  تبديل تلقائي + حفظ النماذج
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تقدر تضيف أي API مخصص أو جاهز، وتعمل <strong>Fetch available models</strong> عشان تتسجل النماذج تلقائياً، وتضيف أكتر من مفتاح أو أكتر من AI يبدّلوا مع بعض تلقائياً (Rotation) لو واحد خلص الكوتا.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 rounded-xl">
            <Headphones className="w-4 h-4 text-emerald-400 shrink-0" animated={false} />
            <div className="text-[11px]">
              <p className="font-bold text-emerald-300">تفريغ المحاضرات الصوتية مفعّل</p>
              <p className="text-slate-400">يعمل بموديل gemini-3.5-transcribe مع تدوير المفاتيح</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Builder Card — Matches Screenshot 1 Layout */}
      <div className="p-6 rounded-2xl bg-[#0c1017] border border-white/10 space-y-5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-black text-white">
              {editingDocId ? `تعديل المزوّد: ${displayName || editingDocId}` : "إضافة أو ربط مزوّد ذكاء اصطناعي (Add Model / API)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اختار مزوّد جاهز أو اربط أي بوابة API متوافقة مع OpenAI أو Gemini مع جلب وحفظ النماذج بضغطة زر.
            </p>
          </div>
          {editingDocId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingDocId(null);
                setProviderId("custom-gateway");
                setDisplayName("");
                setApiKeyInput("");
                setExtraKeysList([]);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              إلغاء التعديل وإضافة جديد
            </Button>
          )}
        </div>

        {/* Mode Switcher Tabs (Exact match to Screenshot 1: Third-party model provider | Custom model API) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-xl bg-black/50 border border-white/10">
          <button
            type="button"
            onClick={() => setModeTab("preset")}
            className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              modeTab === "preset"
                ? "bg-white/12 text-white border border-white/20 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" animated={false} />
            <span>مزوّد جاهز (Third-party model provider)</span>
          </button>
          <button
            type="button"
            onClick={() => setModeTab("custom")}
            className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              modeTab === "custom"
                ? "bg-white/12 text-white border border-white/20 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" animated={false} />
            <span>ربط API مخصص (Custom model API)</span>
          </button>
        </div>

        {/* Quick Presets Bar when in "preset" tab */}
        {modeTab === "preset" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {THIRD_PARTY_PRESETS.map((preset) => {
              const active = providerId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`p-3.5 rounded-xl border text-right transition-colors ${
                    active
                      ? "bg-cyan-500/12 border-cyan-500/45 text-white"
                      : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black text-white">{preset.display_name}</span>
                    <Badge className="bg-white/10 text-cyan-300 border-0 text-[9px]">
                      {preset.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{preset.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Provider ID & Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">
              معرّف المزوّد (Provider ID)
            </label>
            <Input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="مثال: gemini-main أو acme-gateway"
              dir="ltr"
              className="bg-black/50 border-white/15 font-mono text-xs h-10 text-white"
            />
            <p className="text-[10px] text-slate-500">
              معرّف فريد بالـ English (حروف صغيرة وأرقام وشرطة) عشان تقدر تضيف أكتر من AI جنب بعض.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">
              اسم العرض (Display name)
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثال: Gemini Lecture Transcribe أو بوابة التلخيص"
              className="bg-black/50 border-white/15 text-xs h-10 text-white"
            />
            <p className="text-[10px] text-slate-500">
              الاسم التوضيحي اللي هيظهرلك في قائمة المزوّدين المحفوظين.
            </p>
          </div>
        </div>

        {/* Base URL & API Protocol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">
              رابط الـ Base URL
            </label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://gateway.example/v1"
              dir="ltr"
              className="bg-black/50 border-white/15 font-mono text-xs h-10 text-white"
            />
            <p className="text-[10px] text-slate-500">
              رابط الـ API الأساسي (بدون /chat/completions في الآخر).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">
              بروتوكول الـ API (API protocol)
            </label>
            <select
              value={protocol}
              onChange={(e) => {
                const nextProto = e.target.value;
                setProtocol(nextProto);
                if (nextProto === "gemini" && !baseUrl.includes("googleapis")) {
                  setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
                }
              }}
              className="w-full h-10 rounded-xl bg-black/50 border border-white/15 px-3 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              {PROTOCOLS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0c1017] text-white">
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">
              أغلب البوابات المخصصة بتستخدم OpenAI Chat Completions، ولتفريغ الصوتيات اختار Google Gemini.
            </p>
          </div>
        </div>

        {/* Usage / Target Purpose */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 block">
            تخصيص الاستخدام في المنصة (فين يشتغل الـ API ده؟)
          </label>
          <select
            value={purpose}
            onChange={(e) => {
              const nextPurpose = e.target.value;
              setPurpose(nextPurpose);
              if (nextPurpose === "lecture_transcribe") {
                setProtocol("gemini");
                setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
                setSelectedModel("gemini-3.5-transcribe");
              }
            }}
            className="w-full h-10 rounded-xl bg-black/50 border border-white/15 px-3 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            {PURPOSES.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0c1017] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key + Multi-Key Rotation Pool */}
        <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="space-y-3 p-4 rounded-xl bg-black/35 border border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" animated={false} />
              <span>مفتاح الـ API الأساسي (API key)</span>
            </label>
            <span className="text-[10px] text-emerald-400 font-semibold">
              يدعم إضافة عدة مفاتيح لنفس المزوّد للتبديل التلقائي عند انتهاء الكوتا
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... أو sk-... (يمكنك لصق مفتاح أو عدة مفاتيح مفصولة بفاصلة)"
                dir="ltr"
                className="bg-black/60 border-white/15 font-mono text-xs h-10 pl-9 text-white"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title={showKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingKey}
              className="h-10 px-4 border-cyan-500/35 text-cyan-300 hover:bg-cyan-500/10 text-xs font-bold shrink-0"
            >
              {testingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "اختبار المفتاح"}
            </Button>
          </div>

          {/* Add backup keys for same provider rotation */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <p className="text-[11px] text-slate-400">
              إضافة مفاتيح احتياطية إضافية لنفس المزوّد (تشتغل Rotation تلقائياً لو المفتاح الأول جاب 429):
            </p>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={extraKeyDraft}
                onChange={(e) => setExtraKeyDraft(e.target.value)}
                placeholder="الصق مفتاح احتياطي آخر هنا واضغط إضافة..."
                dir="ltr"
                className="bg-black/40 border-white/10 font-mono text-xs h-9 text-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExtraKey}
                disabled={!extraKeyDraft.trim()}
                className="h-9 px-3 border-white/15 text-xs text-slate-200 hover:bg-white/10 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                إضافة للتدوير
              </Button>
            </div>

            {extraKeysList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {extraKeysList.map((k, idx) => (
                  <span
                    key={`${k}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300"
                    dir="ltr"
                  >
                    <span>#{idx + 2}: {showKey ? k : maskKeyString(k)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraKey(k)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Models Section + "Fetch available models" button (Exact match to Screenshot 1) */}
        <div className="space-y-3 p-4 rounded-xl bg-black/35 border border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="text-xs font-bold text-white block">
                النماذج المتاحة (Models)
              </label>
              <p className="text-[11px] text-slate-400">
                اضغط <strong>Fetch available models</strong> لجلب كل النماذج من السيرفر وحفظها فوراً، أو اكتب اسم الموديل يدوياً.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleFetchAvailableModels}
              disabled={fetchingModels}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold h-9 px-4 gap-2"
            >
              {fetchingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" animated={false} />
              )}
              <span>جلب النماذج وحفظها (Fetch available models)</span>
            </Button>
          </div>

          {/* Fetched / Saved Models Grid */}
          {availableModels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  النماذج المحفوظة ({availableModels.length} موديل) — اضغط على أي موديل لتفعيله:
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  الموديل المختار: {customModelInput.trim() || selectedModel}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1">
                {availableModels.map((m) => {
                  const id = typeof m === "string" ? m : m.id;
                  const name = typeof m === "string" ? m : m.name || m.id;
                  const isSelected = (customModelInput.trim() || selectedModel) === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(id);
                        setCustomModelInput("");
                      }}
                      className={`px-3 py-2 rounded-lg border text-right transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                          : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/25"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate" dir="ltr">
                          {id}
                        </p>
                        {name !== id && (
                          <p className="text-[10px] text-slate-400 truncate">{name}</p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" animated={false} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Unlisted Model ID input */}
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              أو اكتب معرّف أي موديل مباشرة (Unlisted model ID):
            </label>
            <Input
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder="مثال: gemini-3.5-transcribe أو deepseek-v4-flash-0731 أو claude-sonnet-5"
              dir="ltr"
              className="bg-black/50 border-white/15 font-mono text-xs h-9 text-white"
            />
          </div>
        </div>

        {/* Save / Activate Button */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={handleSaveProvider}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-slate-950 font-black h-11 px-6 rounded-xl gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>
              {editingDocId ? "حفظ التعديلات وتحديث النماذج" : "حفظ المزوّد وإضافته لقائمة التدوير (Save API)"}
            </span>
          </Button>
        </div>
      </div>

      {/* Saved AI Providers & Multi-AI Rotation Pool */}
      <div className="p-6 rounded-2xl bg-[#0c1017] border border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" animated={false} />
            <div>
              <h3 className="text-sm font-black text-white">
                مزوّدو الذكاء الاصطناعي المحفوظون ونظام التدوير التلقائي (Rotation Pool)
              </h3>
              <p className="text-xs text-slate-400">
                تقدر تبدّل الـ API الأساسي أو الموديل في أي وقت بضغطة واحدة، ولو مزوّد وصل للحد الأقصى هيتم التحويل تلقائياً للمزوّد اللي بعده في الترتيب.
              </p>
            </div>
          </div>
          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs">
            {savedConfigs.filter((c) => c.is_active !== false).length} مزوّد نشط في التدوير
          </Badge>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري تحميل المزوّدين المحفوظين...</span>
          </div>
        ) : savedConfigs.length === 0 ? (
          <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
            <p className="text-xs font-bold text-slate-300">
              لم تضف مزوّدات مخصصة في القائمة بعد — المنصة تعمل حالياً بمفاتيح السيرفر الافتراضية (Gemini 3.5 + التدوير الاحتياطي).
            </p>
            <p className="text-[11px] text-slate-500">
              استخدم النموذج بالأعلى لإضافة مفتاحك أو ربط أي API مخصص وجلب نماذجه.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedConfigs.map((cfg, idx) => {
              const keysCount = Array.isArray(cfg.api_keys) && cfg.api_keys.length
                ? cfg.api_keys.length
                : cfg.api_key
                  ? 1
                  : 0;
              const modelsList = Array.isArray(cfg.available_models) ? cfg.available_models : [];
              const activeModel = cfg.selected_model || cfg.model || "gemini-3.5-flash-lite";
              const purposeObj = PURPOSES.find((p) => p.id === (cfg.purpose || "all")) || PURPOSES[0];

              return (
                <div
                  key={cfg.id || idx}
                  className={`p-4 rounded-xl border transition-colors ${
                    cfg.is_primary
                      ? "bg-emerald-500/[0.07] border-emerald-500/40"
                      : cfg.is_active !== false
                        ? "bg-white/[0.03] border-white/12"
                        : "bg-black/30 border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-black text-white">
                          {cfg.display_name || cfg.id}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                          ({cfg.id})
                        </span>
                        {cfg.is_primary && (
                          <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px]">
                            الأساسي النشط الآن
                          </Badge>
                        )}
                        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[10px]">
                          {purposeObj.shortLabel}
                        </Badge>
                        <Badge className="bg-white/10 text-slate-300 border-0 text-[10px]">
                          {keysCount} {keysCount > 1 ? "مفاتيح (Rotation)" : "مفتاح"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        {cfg.base_url && (
                          <span className="font-mono truncate max-w-xs" dir="ltr">
                            URL: {cfg.base_url}
                          </span>
                        )}
                        <span>البروتوكول: {cfg.protocol || "openai"}</span>
                        <span className="font-mono text-slate-300" dir="ltr">
                          Key: {maskKeyString(cfg.api_key)}
                        </span>
                      </div>

                      {/* Instant Model Switcher from saved models */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-300">
                          الموديل الفعّال:
                        </span>
                        {modelsList.length > 0 ? (
                          <select
                            value={activeModel}
                            onChange={(e) => handleQuickChangeSavedModel(cfg, e.target.value)}
                            dir="ltr"
                            className="h-8 rounded-lg bg-black/60 border border-white/15 px-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50"
                          >
                            {!modelsList.some((m) => (m.id || m) === activeModel) && (
                              <option value={activeModel}>{activeModel}</option>
                            )}
                            {modelsList.map((m) => {
                              const mId = typeof m === "string" ? m : m.id;
                              const mName = typeof m === "string" ? m : m.name || m.id;
                              return (
                                <option key={mId} value={mId} className="bg-[#0c1017] text-white">
                                  {mName}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="text-xs font-mono text-emerald-300 px-2 py-1 rounded bg-black/40" dir="ltr">
                            {activeModel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!cfg.is_primary && (
                        <Button
                          size="sm"
                          onClick={() => handleSetPrimary(cfg)}
                          className="h-8 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-xs font-bold"
                        >
                          <Zap className="w-3.5 h-3.5 ml-1" animated={false} />
                          تفعيل كأساسي الآن
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadIntoForm(cfg)}
                        className="h-8 px-2.5 border-white/15 text-xs text-slate-200 hover:bg-white/10"
                        title="تعديل أو جلب النماذج"
                      >
                        <Edit3 className="w-3.5 h-3.5 ml-1" animated={false} />
                        تعديل / Fetch
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(cfg)}
                        className="h-8 px-2.5 border-white/15 text-xs text-slate-300 hover:bg-white/10"
                      >
                        {cfg.is_active !== false ? "إيقاف مؤقت" : "تفعيل"}
                      </Button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePriority(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300"
                          title="رفع الأولوية في التدوير"
                        >
                          <ArrowUp className="w-3.5 h-3.5" animated={false} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePriority(idx, 1)}
                          disabled={idx === savedConfigs.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300"
                          title="خفض الأولوية في التدوير"
                        >
                          <ArrowDown className="w-3.5 h-3.5" animated={false} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfig(cfg)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="حذف المزوّد"
                      >
                        <Trash2 className="w-4 h-4" animated={false} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
