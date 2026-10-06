import { uploadDirectToTelegram } from "./directUpload.js";
import { apiUrl, resolveMediaUrl } from "./apiBase.js";

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function optimizeImageToDataUrl(file, maxSize = 320, quality = 0.82) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function optimizeAvatarImage(file, maxSize = 320, quality = 0.82) {
  if (!file || !file.type?.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file, folder = "uploads", { onProgress } = {}) {
  if (!file) throw new Error("الملف غير متوفر");

  // Optimize images before upload to ensure ultra-fast processing (< 25KB)
  let processedFile = file;
  if (file.type?.startsWith("image/")) {
    try {
      processedFile = await optimizeAvatarImage(file, 320, 0.82);
    } catch {
      processedFile = file;
    }
  }

  // 1. Direct browser-to-Telegram storage cloud (bypasses Vercel 4.5MB payload limit, up to 50MB)
  try {
    const directRes = await uploadDirectToTelegram(processedFile, { onProgress });
    if (directRes?.url) {
      return directRes.url;
    }
  } catch (directErr) {
    console.warn("Direct Telegram upload fallback, attempting /api/upload-media:", directErr.message);
  }

  // 2. Try serverless CDN upload endpoint (/api/upload-media) for small payloads
  try {
    const dataUrl = await fileToDataUrl(processedFile);
    if (onProgress) onProgress(30);

    const res = await fetch(apiUrl("upload-media"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        filename: processedFile.name || "upload.bin",
        mimeType: processedFile.type || "application/octet-stream",
      }),
    });

    if (onProgress) onProgress(80);
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        if (onProgress) onProgress(100);
        return resolveMediaUrl(data.url);
      }
    }
  } catch (apiErr) {
    console.warn("upload-media endpoint failed:", apiErr);
  }

  // 2. Fallback for images: return local compressed DataURL (< 25KB)
  if (processedFile.type?.startsWith("image/")) {
    const dataUrl = await fileToDataUrl(processedFile);
    if (onProgress) onProgress(100);
    return dataUrl;
  }

  throw new Error("تعذر رفع الفيديو إلى السحابة، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.");
}
