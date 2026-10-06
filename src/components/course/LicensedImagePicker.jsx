import React, { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchLicensedImages } from "@/lib/summaryJobs";

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export default function LicensedImagePicker({ open, onClose, onInsert, defaultQuery = "" }) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState("");

  useEffect(() => {
    if (open && !query) setQuery(defaultQuery);
  }, [defaultQuery, open, query]);

  if (!open) return null;

  const search = async (event) => {
    event?.preventDefault();
    const value = query.trim();
    if (value.length < 2) { setError("اكتب كلمتين على الأقل للبحث"); return; }
    setLoading(true);
    setError("");
    try {
      const payload = await searchLicensedImages(value, 10);
      setResults(Array.isArray(payload?.results) ? payload.results : []);
      if (!payload?.results?.length) setError("لم نجد صورًا بترخيص ومصدر صالحين لهذا البحث");
    } catch (searchError) {
      setError(searchError?.message || "تعذر البحث عن الصور الآن");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (item) => {
    setAdding(item.id);
    try {
      await onInsert?.(item);
      onClose?.();
    } finally {
      setAdding("");
    }
  };

  return (
    <div className="border-b border-border bg-muted/25 p-3 sm:p-4" role="dialog" aria-label="اقتراح صور تعليمية مرخصة">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><ImagePlus className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black">صور تعليمية مرخصة</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">النتائج من Openverse وWikimedia. لن تدخل أي صورة إلى الملخص إلا بعد الضغط على “اعتماد وإضافة”.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق الصور" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} dir="auto" placeholder="مثال: cardiac cycle diagram" className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <Button type="submit" disabled={loading} className="h-10 gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} بحث
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{error}</p>}

      {!!results.length && (
        <div className="mt-3 grid max-h-[430px] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => {
            const thumbnail = safeExternalUrl(item.thumbnailUrl || item.url);
            const source = safeExternalUrl(item.sourcePage);
            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="aspect-[4/3] bg-slate-100">
                  {thumbnail ? <img src={thumbnail} alt={item.title || "Educational image"} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">لا توجد معاينة</div>}
                </div>
                <div className="space-y-2 p-3">
                  <p dir="auto" className="line-clamp-2 text-start text-xs font-black [unicode-bidi:plaintext]">{item.title || "Educational image"}</p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">{item.creator || "Unknown"}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> {String(item.license || "").toUpperCase()}</div>
                  <div className="flex gap-2">
                    {source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2 text-[10px] font-bold hover:bg-secondary"><ExternalLink className="h-3 w-3" /> المصدر</a>}
                    <Button type="button" size="sm" onClick={() => approve(item)} disabled={!!adding} className="h-9 flex-1 gap-1 text-[10px] font-black">
                      {adding === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />} اعتماد وإضافة
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
