import test from "node:test";
import assert from "node:assert/strict";

import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  buildOtpEmailHtml,
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  otpDocId,
} from "../../netlify/functions/_shared/email-otp-lib.mjs";

test("email OTP: normalize + doc id are stable and case/space-insensitive", () => {
  assert.equal(normalizeEmail("  Fighter@Gmail.com "), "fighter@gmail.com");
  assert.equal(otpDocId("Fighter@Gmail.com"), otpDocId("fighter@gmail.com"));
  assert.match(otpDocId("a@b.com"), /^[0-9a-f]{64}$/);
});

test("email OTP: codes are 6 digits with leading zeros preserved", () => {
  for (let i = 0; i < 50; i += 1) {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  }
});

test("email OTP: hash binds code to email and is pepper-stable", () => {
  const a = hashOtp("x@y.com", "123456", "pep");
  const b = hashOtp("x@y.com", "123456", "pep");
  const c = hashOtp("x@y.com", "654321", "pep");
  const d = hashOtp("other@y.com", "123456", "pep");
  const e = hashOtp("x@y.com", "123456", "OTHER_PEPPER");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.notEqual(a, e);
});

test("email OTP: policy constants stay strict", () => {
  assert.equal(OTP_MAX_ATTEMPTS, 5);
  assert.ok(OTP_TTL_MS <= 10 * 60 * 1000);
  assert.ok(OTP_RESEND_COOLDOWN_MS >= 60 * 1000);
});

test("email OTP: email html carries the code and RTL Arabic shell", () => {
  const html = buildOtpEmailHtml({ code: "042517", name: "Fighter" });
  assert.ok(html.includes("042517"));
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes("Black Fighters"));
});
