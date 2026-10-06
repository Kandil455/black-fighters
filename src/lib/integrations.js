/**
 * lib/integrations.js — Direct (frontend) external integrations
 * Works on the current Firebase + Netlify stack using user-provided API keys/URLs.
 *
 * Slack:  Incoming Webhook URL (stored per-user in UserSettings).
 * Google Drive: client-side OAuth access token via Google Identity Services (GIS),
 *               then direct multipart upload to the Drive REST API.
 */
import { base44 } from '@/api/base44Client';

// ─── SETTINGS HELPERS ───────────────────────────────────────────────────────
export async function getIntegrationSettings() {
  try {
    const s = await base44.entities.UserSettings.get();
    return s || {};
  } catch {
    return {};
  }
}

export async function saveIntegrationSettings(patch) {
  // UserSettings.set merges, so we only send the changed keys
  await base44.entities.UserSettings.upsert(patch);
}

// ─── SLACK ──────────────────────────────────────────────────────────────────
const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/;

export function isValidSlackWebhook(url) {
  return SLACK_WEBHOOK_RE.test((url || '').trim());
}

/**
 * Sends a message to a Slack Incoming Webhook.
 * Uses Content-Type text/plain to avoid a CORS preflight (Slack webhooks
 * don't return CORS headers, so a preflighted request would fail).
 * Returns true on success, false otherwise — never throws.
 */
export async function sendSlackMessage(webhookUrl, payload) {
  const url = (webhookUrl || '').trim();
  if (!isValidSlackWebhook(url)) return false;
  try {
    const body = typeof payload === 'string' ? { text: payload } : payload;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends a Slack notification using the current user's saved webhook. No-op if none. */
export async function notifySlack(payload) {
  const settings = await getIntegrationSettings();
  if (!settings.slack_webhook_url) return false;
  return sendSlackMessage(settings.slack_webhook_url, payload);
}

export function buildCourseSlackMessage(course) {
  const chapters = course.chapters?.length || 0;
  return {
    text: `📚 ملخص جديد على Black Fighters: *${course.title}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📚 *ملخص جديد على Black Fighters*\n*${course.title}*${course.subject ? `\n📖 المادة: ${course.subject}` : ''}\n🗂️ ${chapters} فصل`,
        },
      },
    ],
  };
}

// ─── GOOGLE DRIVE ─────────────────────────────────────────────────────────────
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let resolved = false;
    const checkReady = (attempts = 0) => {
      if (window.google?.accounts?.oauth2) {
        if (!resolved) {
          resolved = true;
          resolve();
        }
        return true;
      }
      if (attempts < 25) {
        setTimeout(() => checkReady(attempts + 1), 60);
      }
      return false;
    };

    if (checkReady()) return;

    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        setTimeout(() => {
          if (!checkReady(20)) resolve();
        }, 30);
      });
      existing.addEventListener('error', () => {
        if (!resolved) reject(new Error('فشل تحميل Google — تأكد من إيقاف أي مانع إعلانات (AdBlock)'));
      });
      return;
    }

    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      setTimeout(() => {
        if (!checkReady(20)) resolve();
      }, 30);
    };
    s.onerror = (e) => {
      console.error('GIS load error:', e);
      if (!resolved) reject(new Error('فشل تحميل Google — تأكد من إيقاف أي مانع إعلانات (AdBlock)'));
    };
    document.head.appendChild(s);
  });
}

export const DEFAULT_GOOGLE_CLIENT_ID = "64035945828-1dpcl06g0hlm3np11duihtg4ild0kq2c.apps.googleusercontent.com";

export function getGoogleClientId() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    DEFAULT_GOOGLE_CLIENT_ID
  );
}

/**
 * Requests a Google Drive OAuth access token from the user via GIS popup.
 * `clientId` falls back to the official Black Fighters OAuth Client ID.
 * Returns the access_token string.
 */
export async function requestDriveToken(clientId) {
  const activeClientId = clientId?.trim() || getGoogleClientId();
  if (!activeClientId) throw new Error('محتاج Google OAuth Client ID');
  await loadGis();
  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error));
          else resolve(resp.access_token);
        },
      });
      client.requestAccessToken({ prompt: '' });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Uploads a text/markdown file to the user's Google Drive using a direct
 * multipart upload. Returns the created file's metadata { id, name, webViewLink }.
 */
export async function uploadTextToDrive(accessToken, { name, content, mimeType = 'text/markdown' }) {
  if (!accessToken) throw new Error('مفيش صلاحية Google Drive');
  const boundary = 'iiiak_' + Math.random().toString(36).slice(2);
  const metadata = { name, mimeType };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'فشل الرفع على Google Drive');
  }
  return res.json();
}

/** Converts a course's chapters into a single Markdown document. */
export function courseToMarkdown(course) {
  const parts = [`# ${course.title}\n`];
  if (course.description) parts.push(`> ${course.description}\n`);
  if (course.subject) parts.push(`**المادة:** ${course.subject}\n`);
  (course.chapters || []).forEach((ch, i) => {
    parts.push(`\n## ${i + 1}. ${ch.title}\n\n${ch.content || ''}\n`);
  });
  return parts.join('\n');
}