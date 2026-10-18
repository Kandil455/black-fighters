import { GoogleGenAI } from "@google/genai";

// In-memory server-side cache so repeated scene plays hit cache with 0 extra tokens
const OMNI_PROMO_CACHE = new Map();

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const mode = body.mode || "tts"; // "tts" | "script"
    const sceneId = String(body.sceneId || "upload-cache");
    const text = String(body.text || "").trim();

    const cacheKey = `${mode}:${sceneId}:${text.slice(0, 120)}`;
    if (OMNI_PROMO_CACHE.has(cacheKey)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          ...OMNI_PROMO_CACHE.get(cacheKey),
          cached: true,
          model: "gemini-omni-1.1-flash",
        }),
      };
    }

    const apiKey =
      process.env.API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          ok: false,
          fallback: true,
          reason: "missing_api_key",
          model: "gemini-omni-1.1-flash",
        }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    if (mode === "tts" && text) {
      const interaction = await ai.interactions.create({
        model: "gemini-omni-1.1-flash",
        input: `انطق النص الإعلاني التالي بالعامية المصرية بحماس وسرعة وحيوية كأنك بتكلم طلاب الجامعة في إعلان احترافي لمنصة Black Fighters:\n"${text}"`,
        response_modalities: ["audio"],
        generation_config: {
          speech_config: {
            language: "ar-eg",
            voice: "aoede",
          },
        },
      });

      let audioBase64 = null;
      let mimeType = "audio/wav";
      for (const output of interaction?.outputs || []) {
        if (output.type === "audio" && output.data) {
          audioBase64 = output.data;
          mimeType = output.mime_type || "audio/wav";
          break;
        }
      }

      if (audioBase64) {
        const payload = {
          ok: true,
          audioBase64,
          mimeType,
          model: "gemini-omni-1.1-flash",
        };
        OMNI_PROMO_CACHE.set(cacheKey, payload);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        };
      }
    }

    if (mode === "script") {
      const interaction = await ai.interactions.create({
        model: "gemini-omni-1.1-flash",
        input: `اكتب جملة إعلانية نارية قصيرة جداً بالعامية المصرية الشبابية (أقل من 22 كلمة) تشجع طالب الكلية يشترك فوراً في منصة Black Fighters للمذاكرة الذكية والكاش المشترك للدفعة. اكتب الجملة فقط بدون علامات تنصيص.`,
        response_modalities: ["text"],
      });

      const textOutput = (interaction?.outputs || []).find((o) => o.type === "text");
      const generatedLine = textOutput?.text?.trim() || null;
      const payload = {
        ok: Boolean(generatedLine),
        scriptLine: generatedLine,
        model: "gemini-omni-1.1-flash",
      };
      if (generatedLine) {
        OMNI_PROMO_CACHE.set(cacheKey, payload);
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ok: false,
        fallback: true,
        model: "gemini-omni-1.1-flash",
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ok: false,
        fallback: true,
        error: String(err?.message || err),
        model: "gemini-omni-1.1-flash",
      }),
    };
  }
}
