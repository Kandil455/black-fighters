/**
 * testAiKey.js — Lightweight client-side API key validation
 * Tests custom BYO keys directly via fetch without importing any heavy AI SDKs.
 */

export async function testAiKey(provider, apiKey) {
  if (!apiKey) throw new Error("مفتاح الـ API فارغ");
  if (apiKey.includes("•")) return true; // Masked key, already validated

  try {
    if (provider === "codecraft") {
      const res = await fetch("https://codecraftapi.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "curl/7.88.1",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) throw new Error("مفتاح CodeCraft غير صالح أو لا يمكن الوصول للسيرفر");
      return true;
    }

    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "مفتاح OpenRouter غير صالح");
      }
      return true;
    }

    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("مفتاح Groq غير صالح");
      return true;
    }

    if (provider === "apmix") {
      const res = await fetch("https://api.apmix.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("مفتاح APMIX غير صالح");
      return true;
    }

    if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error("مفتاح Gemini غير صالح");
      return true;
    }

    return true;
  } catch (e) {
    if (e.message.includes("ISO-8859-1") || e.message.includes("Failed to execute 'fetch'")) {
      throw new Error("المفتاح يحتوي على رموز غير صالحة (ربما أحرف عربية أو مسافات).");
    }
    throw e;
  }
}
