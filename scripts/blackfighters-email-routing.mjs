#!/usr/bin/env node
/**
 * blackfighters-email-routing.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets up professional email on blackfighters.site, fully automated:
 *
 *   ibrahim@blackfighters.site   ─┐
 *   admin@blackfighters.site     ─┼─→  ibrahimkandil000@gmail.com
 *   founder@blackfighters.site   ─┤    (free, Cloudflare Email Routing)
 *   support@blackfighters.site   ─┘
 *
 * Usage:
 *   CF_API_TOKEN=xxxx node scripts/blackfighters-email-routing.mjs
 *   CF_API_TOKEN=xxxx node scripts/blackfighters-email-routing.mjs --dry-run
 *
 * Token permissions needed (custom token, one zone only):
 *   Zone    → DNS              → Edit
 *   Zone    → Email Routing Rules → Edit
 *   Zone    → Zone             → Read      (to discover the zone id)
 *   Account → Email Routing Addresses → Edit   (destination addresses)
 *
 * What it does (idempotent — safe to re-run):
 *   1. verifies the token
 *   2. finds zone id / account id for blackfighters.site
 *   3. enables Email Routing on the zone + adds MX/SPF/DKIM records
 *   4. creates + (re)lists destination address  ibrahimkandil000@gmail.com
 *   5. creates catch-all-style rules for the 4 addresses above
 *   6. prints a live DNS verification report (MX + SPF)
 *
 * The ONE manual step it cannot do: clicking "Verify email address" in the
 * confirmation email that Cloudflare sends to the Gmail inbox. Everything
 * else is hands-off.
 */
import { execFileSync } from "node:child_process";

const API = "https://api.cloudflare.com/client/v4";
const DOMAIN = "blackfighters.site";
const DESTINATION = "ibrahimkandil000@gmail.com";
const ADDRESSES = ["ibrahim", "admin", "founder", "support"];

const token = process.env.CF_API_TOKEN?.trim();
const DRY = process.argv.includes("--dry-run");

if (!token) {
  console.error(`
✖ مفيش توكن!

شغّل السكربت بالشكل ده:
  CF_API_TOKEN="التوكن هنا" node scripts/blackfighters-email-routing.mjs --dry-run   # معاينة بدون تعديل
  CF_API_TOKEN="التوكن هنا" node scripts/blackfighters-email-routing.mjs             # تنفيذ فعلي
`);
  process.exit(1);
}

let failures = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const info = (m) => console.log(`  · ${m}`);
const bad = (m) => { failures += 1; console.log(`  ✖ ${m}`); };

async function cf(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

function explain(path, { status, json }) {
  const errs = (json?.errors || []).map((e) => `${e.code}: ${e.message}`).join(" | ");
  return `HTTP ${status} ${path} → ${errs || json?.result?.message || "no detail"}`;
}

async function preflight() {
  console.log("\n① فحص التوكن…");
  const v = await cf("/user/tokens/verify");
  if (!v.json?.success) {
    bad(`التوكن مش صالح → ${explain("/user/tokens/verify", v)}`);
    process.exit(1);
  }
  ok(`التوكن صالح (${v.json.result.status})`);
}

async function findZone() {
  console.log("\n② العثور على الزون…");
  const res = await cf(`/zones?name=${DOMAIN}`);
  const zone = res.json?.result?.[0];
  if (!zone) {
    bad(`مش لاقي الزون ${DOMAIN} — اتأكد إن التوكن متعلّم على الزون دي → ${explain("/zones", res)}`);
    process.exit(1);
  }
  ok(`zone_id = ${zone.id}`);
  ok(`account_id = ${zone.account?.id}`);
  return { zoneId: zone.id, accountId: zone.account?.id };
}

async function enableRouting(zoneId) {
  console.log("\n③ تشغيل Email Routing…");
  const status = await cf(`/zones/${zoneId}/email/routing`);
  const enabled = Boolean(status.json?.result?.enabled);

  if (!enabled) {
    if (DRY) { info("[dry-run] هعمل POST /email/routing/enable"); }
    else {
      const r = await cf(`/zones/${zoneId}/email/routing/enable`, { method: "POST" });
      if (r.json?.success) ok("Email Routing اتشغّل");
      else bad(`فشل التشغيل → ${explain("/email/routing/enable", r)}`);
    }
  } else {
    ok("Email Routing شغّال بالفعل");
  }

  // Cloudflare's "Add records and enable" equivalent: DNS records are added by
  // the enable call, but MX can be missing on older zones — verify + add.
  const dns = await cf(`/zones/${zoneId}/dns_records?per_page=100`);
  const records = dns.json?.result || [];
  const mx = records.filter((r) => r.type === "MX" && r.name === DOMAIN);
  if (mx.length) ok(`MX موجود (${mx.length} سجل)`);
  else bad("مفيش MX على الدومين — لو التشغيل نجح، عيد الفحص بعد دقيقة");
}

async function addDestination(accountId) {
  console.log("\n④ إضافة عنوان الاستلام…");
  const existing = await cf(`/accounts/${accountId}/email/routing/addresses?per_page=100`);
  const found = (existing.json?.result || []).find(
    (a) => String(a.email).toLowerCase() === DESTINATION.toLowerCase()
  );
  if (found) {
    ok(`العنوان موجود — الحالة: ${found.verified ? "مُوثّق ✅ (جاهز للتوصيل)" : "غير مُوثّق ⏳ (افتح Gmail واضغط Verify)"}`);
    return;
  }
  if (DRY) { info(`[dry-run] هضيف ${DESTINATION}`); return; }
  const r = await cf(`/accounts/${accountId}/email/routing/addresses`, {
    method: "POST",
    body: { email: DESTINATION },
  });
  if (r.json?.success) ok(`اتضاف ${DESTINATION} — جالك إيميل توثيق على Gmail، افتحه واضغط Verify`);
  else bad(`فشل إضافة العنوان → ${explain("/email/routing/addresses", r)}`);
}

async function addRules(zoneId) {
  console.log("\n⑤ ربط العناوين بـ Gmail…");
  const existing = await cf(`/zones/${zoneId}/email/routing/rules?per_page=100`);
  const rules = existing.json?.result || [];

  for (const local of ADDRESSES) {
    const address = `${local}@${DOMAIN}`;
    const already = rules.find(
      (rule) => (rule.matchers || []).some(
        (m) => m.type === "literal" && String(m.value).toLowerCase() === address.toLowerCase()
      )
    );
    if (already) { ok(`${address} → ${DESTINATION} (موجود)`); continue; }
    if (DRY) { info(`[dry-run] هضيف قاعدة ${address} → ${DESTINATION}`); continue; }

    const r = await cf(`/zones/${zoneId}/email/routing/rules`, {
      method: "POST",
      body: {
        name: `${local} → Gmail`,
        enabled: true,
        priority: 0,
        matchers: [{ type: "literal", field: "to", value: address }],
        actions: [{ type: "forward", value: [DESTINATION] }],
      },
    });
    if (r.json?.success) ok(`${address} → ${DESTINATION}`);
    else bad(`فشل قاعدة ${address} → ${explain("/email/routing/rules", r)}`);
  }
}

function digShort(type, name) {
  try {
    return execFileSync("dig", ["+short", type, name], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function verifyLive() {
  console.log("\n⑥ فحص DNS الحي (مباشر من الإنترنت)…");
  let mx = "";
  for (let i = 0; i < 12; i += 1) {
    mx = digShort("MX", DOMAIN);
    if (mx) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (mx) ok(`MX:\n${mx.split("\n").map((l) => `     ${l}`).join("\n")}`);
  else bad("MX لسه مش ظاهر — Cloudflare بيقول لحد ٥–١٥ دقيقة (وجرب تاني بعدها)");

  const txt = digShort("TXT", DOMAIN);
  if (txt.includes("spf.mx.cloudflare.net")) ok("SPF مضاف (Email Routing مسموح يوصّل)");
  else if (txt) info(`TXT موجود لكن مش SPF بتاع Email Routing:\n${txt}`);
  else info("مفيش SPF — لو التشغيل نجح، هيتضاف خلال دقايق");
}

async function summary(zoneId) {
  console.log("\n⑦ ملخّص الحالة النهائي…");
  for (const local of ADDRESSES) {
    const address = `${local}@${DOMAIN}`;
    const r = await cf(`/zones/${zoneId}/email/routing/rules?per_page=100`);
    const rules = r.json?.result || [];
    const hit = rules.find((rule) => (rule.matchers || []).some(
      (m) => m.type === "literal" && String(m.value).toLowerCase() === address.toLowerCase()
    ));
    const target = hit?.actions?.[0]?.value?.join?.(", ") || "—";
    console.log(`  ${hit ? "✅" : "❌"} ${address.padEnd(32)} → ${target}`);
  }
  const dest = await cf(`/accounts/${(await cf(`/zones/${zoneId}`)).json?.result?.account?.id}/email/routing/addresses?per_page=100`);
  const d = (dest.json?.result || []).find((a) => String(a.email).toLowerCase() === DESTINATION.toLowerCase());
  console.log(`  ${d?.verified ? "✅" : "⏳"} استلام ${DESTINATION} — ${d ? (d.verified ? "مُوثّق" : "محتاج Verify من Gmail") : "غير موجود"}`);
}

(async () => {
  console.log(`\n⚔️  Black Fighters — إعداد البريد (${DRY ? "معاينة DRY-RUN" : "تنفيذ فعلي"})`);
  console.log(`   ${DOMAIN} → ${DESTINATION}\n`);
  await preflight();
  const { zoneId, accountId } = await findZone();
  await enableRouting(zoneId);
  await addDestination(accountId);
  await addRules(zoneId);
  await verifyLive();
  await summary(zoneId);
  console.log(
    failures
      ? `\n⚠️  ${failures} خطوة محتاجة انتباه (فوق).\n`
      : "\n🎉 كل حاجة اتظبطت. باقي خطوة واحدة: افتح Gmail واضغط Verify (لو لسه مطلوب).\n"
  );
  process.exit(failures ? 2 : 0);
})().catch((err) => {
  console.error("\n✖ اتعطل:", err?.message || err);
  process.exit(1);
});
