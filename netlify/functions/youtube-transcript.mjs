import { YoutubeTranscript } from "youtube-transcript";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { requireUser } from "./_shared/firebase-admin.mjs";

function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtu\.be\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/shorts\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    // Soft auth — allow authenticated users, but don't hard-fail public transcript requests
    try {
      await requireUser(event);
    } catch {
      // Proceed unauthenticated for public YouTube video transcript retrieval
    }

    let url = "";
    let startTime = "";
    let endTime = "";
    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      url = body.url;
      startTime = body.startTime || "";
      endTime = body.endTime || "";
    } else {
      url = event.queryStringParameters?.url || "";
      startTime = event.queryStringParameters?.startTime || "";
      endTime = event.queryStringParameters?.endTime || "";
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return json(400, { error: "INVALID_YOUTUBE_URL" });
    }

    function parseTimeSeconds(val) {
      if (!val) return null;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      const parts = str.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      const num = Number(str);
      return isNaN(num) ? null : num;
    }

    const startSec = parseTimeSeconds(startTime);
    const endSec = parseTimeSeconds(endTime);

    let title = "";
    let author = "";
    try {
      const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).then(r => r.json());
      title = oe.title || "";
      author = oe.author_name || "";
    } catch (e) {}

    let description = "";
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        if (!title) {
          const tm = html.match(/<title>([^<]*)<\/title>/);
          if (tm) title = tm[1].replace(/- YouTube$/, '').trim();
        }
        const dm = html.match(/<meta name="description" content="([^"]*)"/);
        if (dm) description = dm[1].trim();
      }
    } catch (e) {}

    const attempts = [{ lang: 'ar' }, undefined, { lang: 'en' }];
    let transcriptText = '';
    let lastErr = null;
    for (const opt of attempts) {
      try {
        const items = await YoutubeTranscript.fetchTranscript(videoId, opt);
        if (items && items.length > 0) {
          let filtered = items;
          if (startSec !== null || endSec !== null) {
            filtered = items.filter(i => {
              const sec = i.offset > 10000 ? (i.offset / 1000) : i.offset;
              if (startSec !== null && sec < startSec) return false;
              if (endSec !== null && sec > endSec) return false;
              return true;
            });
          }
          if (filtered.length === 0) filtered = items; // Fallback if out-of-range
          transcriptText = filtered.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
          if (transcriptText.length > 30) break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (!transcriptText || transcriptText.length < 30) {
      if (title || description) {
        const outlineText = description
          ? `محاضرة سريرية متقدمة بعنوان: "${title || videoId}" من إعداد "${author || 'المحاضر'}".\n\nالمحتوى والمحاور العلمية للمحاضرة:\n${description}\n\nيرجى تلخيص واستخلاص الشرح الأكاديمي والسريري والفسيولوجي الشامل وبناء بنك الأسئلة السريري المتكامل لهذا الموضوع بأعلى دقة.`
          : `محاضرة سريرية متقدمة بعنوان: "${title || videoId}" من إعداد "${author || 'المحاضر'}". يرجى تلخيص واستخلاص الشرح الأكاديمي والسريري والفسيولوجي الشامل وبناء بنك الأسئلة السريري المتكامل لهذا الموضوع بأعلى دقة.`;

        return json(200, {
          success: true,
          hasCaptions: false,
          videoId,
          title: title || `محاضرة يوتيوب (${videoId})`,
          author,
          transcript: outlineText,
          charCount: outlineText.length,
          fallback: true,
          note: "الفيديو لا يحتوي على ترجمة نصية مصاحبة، تم استخراج محاور المحاضرة وموضوعها للتلخيص بنجاح.",
        });
      }

      return json(200, {
        success: false,
        hasCaptions: false,
        videoId,
        title,
        transcript: "",
        charCount: 0,
        error: "فشل جلب الترجمة من فيديو يوتيوب. تأكد من وجود ترجمة أو رابط صحيح.",
      });
    }

    return json(200, {
      success: true,
      hasCaptions: true,
      videoId,
      title: title || `محاضرة يوتيوب (${videoId})`,
      author,
      transcript: transcriptText,
      charCount: transcriptText.length,
      startTime: startSec,
      endTime: endSec
    });
  } catch (err) {
    return handleError(err);
  }
};
