import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSummaryMarkup } from "../../src/lib/summaryMarkup.js";
import { detectTextDirection } from "../../src/lib/summaryDocument.js";

test("normalizeSummaryMarkup converts unicode bullets into markdown list markers", () => {
  const input = "## 1. Overview\n• The SCHILLER DEFIGARD 5000 is a defibrillator model.\n• It features manual and AED modes.";
  const output = normalizeSummaryMarkup(input);
  assert.match(output, /- The SCHILLER DEFIGARD 5000 is a defibrillator model\./);
  assert.match(output, /- It features manual and AED modes\./);
  assert.doesNotMatch(output, /•/);
});

test("normalizeSummaryMarkup adds empty lines around **الشرح بالعربي:**", () => {
  const input = "- Defibrillator delivers electrical energy\n**الشرح بالعربي:**\n- جهاز الصدمات يعيد انتظام ضربات القلب";
  const output = normalizeSummaryMarkup(input);
  assert.match(output, /\n\n\*\*الشرح بالعربي:\*\*\n\n/);
});

test("normalizeSummaryMarkup breaks solid Arabic explanation into structured bullets", () => {
  const input = "## Section 1\n- Note 1\n\n**الشرح بالعربي:**\nالجهاز دا عبارة عن مزيل رجفان قلبي. بيحتوي على نظامين عمل النظام اليدوي والآلي. لازم نتأكد من شحن البطارية.";
  const output = normalizeSummaryMarkup(input);
  assert.match(output, /- الجهاز دا عبارة عن مزيل رجفان قلبي\./);
  assert.match(output, /- بيحتوي على نظامين عمل النظام اليدوي والآلي\./);
  assert.match(output, /- لازم نتأكد من شحن البطارية\./);
});

test("normalizeSummaryMarkup leaves already-bulleted Arabic explanations intact", () => {
  const input = "## Section 1\n\n**الشرح بالعربي:**\n\n- نقطة أولى منظمة\n- نقطة ثانية واضحة";
  const output = normalizeSummaryMarkup(input);
  assert.match(output, /- نقطة أولى منظمة/);
  assert.match(output, /- نقطة ثانية واضحة/);
});

test("detectTextDirection correctly distinguishes English and Arabic lines", () => {
  assert.equal(detectTextDirection("The SCHILLER DEFIGARD 5000 is a defibrillator model."), "ltr");
  assert.equal(detectTextDirection("جهاز الديفيجارد 5000 هو جهاز صدمات كهربائية."), "rtl");
  assert.equal(detectTextDirection("- Emergency Mode"), "ltr");
  assert.equal(detectTextDirection("- وضع الطوارئ"), "rtl");
});
