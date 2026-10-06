/**
 * BLACK FIGHTERS V5 «الأطلس» — Telegram Engine V5 (The Second Half of the Product)
 * Implements V5 Part 4 & Prompt D + V4 Section 13:
 * 1. Webhook `update_id` idempotency guard
 * 2. Telegram Mini App `initData` HMAC-SHA256 verification (`WebAppData` key + `auth_date <= 300s`)
 * 3. `startapp` payload validation (`^[A-Za-z0-9_-]{1,512}$`) and deep-link parser
 * 4. Single self-editing Progress Message (`editMessageText` throttled to >= 3000ms, duplicate text suppressed)
 * 5. Notification Budget Manager (max 2/day, quiet hours 23:00-07:00, reason footer, inline opt-out, 5-ignored auto-digest)
 * 6. Outbox Queue with `429 retry_after` backoff + Dead-Letter Queue (DLQ)
 * 7. Privacy Guard: forbids public `telegra.ph` lecture leaks; delivers via `/tg` Mini App, `sendDocument`, or signed URL
 * 8. Group Command Auth Guard (`verifyLinkedGroupMember`)
 * 9. Student Bot vs Admin Ops Bot separation
 */

import crypto from 'node:crypto';

const PROCESSED_UPDATE_IDS = new Map();
const MAX_MEM_UPDATES = 5000;

/**
 * Separate Student-facing Bot Token from Admin Operations Bot Token
 */
export function getStudentBotToken() {
  const token = process.env.TELEGRAM_STUDENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  return token.trim();
}

export function getAdminOpsBotToken() {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  return token.trim();
}

/**
 * 1. Webhook `update_id` Idempotency Guard
 */
export async function dedupeTelegramUpdateId(updateId, externalStore = null) {
  if (updateId === undefined || updateId === null) {
    return { duplicate: false, updateId: null };
  }
  const key = String(updateId);
  const now = Date.now();

  if (PROCESSED_UPDATE_IDS.has(key)) {
    return { duplicate: true, updateId: key };
  }

  if (externalStore && typeof externalStore.checkAndMark === 'function') {
    const alreadyProcessed = await externalStore.checkAndMark(key, now);
    if (alreadyProcessed) {
      PROCESSED_UPDATE_IDS.set(key, now);
      return { duplicate: true, updateId: key };
    }
  }

  if (PROCESSED_UPDATE_IDS.size >= MAX_MEM_UPDATES) {
    const oldestKey = PROCESSED_UPDATE_IDS.keys().next().value;
    PROCESSED_UPDATE_IDS.delete(oldestKey);
  }
  PROCESSED_UPDATE_IDS.set(key, now);
  return { duplicate: false, updateId: key };
}

/**
 * 2. Telegram Mini App `initData` HMAC-SHA256 Verifier (V5 4.4)
 * Official algorithm:
 * - secret_key = HMAC_SHA256(key="WebAppData", msg=botToken)
 * - data_check_string = sorted key=value pairs (excluding 'hash') joined by '\n'
 * - expected_hash = HMAC_SHA256(key=secret_key, msg=data_check_string).hex()
 */
export function verifyTelegramMiniAppInitData(initDataRaw, botToken, options = {}) {
  const maxAgeSeconds = Number(options.maxAgeSeconds ?? 300);
  const nowSeconds = Number(options.nowSeconds ?? Math.floor(Date.now() / 1000));

  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { valid: false, error: 'MISSING_INIT_DATA' };
  }
  if (!botToken || typeof botToken !== 'string') {
    return { valid: false, error: 'MISSING_BOT_TOKEN' };
  }

  const params = new URLSearchParams(initDataRaw);
  const receivedHash = params.get('hash');
  if (!receivedHash) {
    return { valid: false, error: 'MISSING_HASH' };
  }

  const authDateRaw = Number(params.get('auth_date') || 0);
  if (!authDateRaw || Math.abs(nowSeconds - authDateRaw) > maxAgeSeconds) {
    return { valid: false, error: 'EXPIRED_AUTH_DATE', authDate: authDateRaw };
  }

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort((a, b) => a.localeCompare(b));
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const a = Buffer.from(receivedHash, 'hex');
  const b = Buffer.from(computedHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, error: 'INVALID_HMAC_SIGNATURE' };
  }

  let user = null;
  const userJson = params.get('user');
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      return { valid: false, error: 'INVALID_USER_JSON' };
    }
  }

  const startParam = params.get('start_param') || '';

  return {
    valid: true,
    user,
    firebaseUid: user?.id ? `tg_${user.id}` : null,
    authDate: authDateRaw,
    startParam,
  };
}

/**
 * Helper to generate valid test/signed initData for unit tests & internal tools
 */
export function createSignedTelegramInitData(payloadObj, botToken) {
  const params = new URLSearchParams();
  Object.entries(payloadObj).forEach(([k, v]) => {
    if (k === 'hash') return;
    params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  const pairs = [];
  for (const [k, v] of params.entries()) {
    pairs.push(`${k}=${v}`);
  }
  pairs.sort((a, b) => a.localeCompare(b));
  const dataCheckString = pairs.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

/**
 * 3. `startapp` Deep-Link Validator & Router (V5 4.4)
 * Strictly allows `[A-Za-z0-9_-]{1,512}`
 */
const STARTAPP_RE = /^[A-Za-z0-9_-]{1,512}$/;

export function validateStartAppPayload(payload) {
  const raw = String(payload ?? '');
  if (!STARTAPP_RE.test(raw)) {
    return { valid: false, error: 'INVALID_STARTAPP_PAYLOAD' };
  }
  return { valid: true, payload: raw };
}

export function parseStartAppCommand(payload) {
  const check = validateStartAppPayload(payload);
  if (!check.valid) {
    return { valid: false, route: '/tg', mode: 'home', error: check.error };
  }
  const raw = check.payload;

  // doc_<docId>_p_<page>
  const docPageMatch = raw.match(/^doc_([A-Za-z0-9_-]+)_p_(\d+)$/);
  if (docPageMatch) {
    return {
      valid: true,
      mode: 'reader',
      docId: docPageMatch[1],
      page: Number(docPageMatch[2]),
      route: `/tg?mode=reader&docId=${docPageMatch[1]}&page=${docPageMatch[2]}`,
    };
  }

  // declassify_<docId>
  const declassifyMatch = raw.match(/^declassify_([A-Za-z0-9_-]+)$/);
  if (declassifyMatch) {
    return {
      valid: true,
      mode: 'declassify',
      docId: declassifyMatch[1],
      route: `/tg?mode=declassify&docId=${declassifyMatch[1]}`,
    };
  }

  // review_due
  if (raw === 'review_due') {
    return {
      valid: true,
      mode: 'review',
      route: '/tg?mode=review',
    };
  }

  // quiz_<quizId>
  const quizMatch = raw.match(/^quiz_([A-Za-z0-9_-]+)$/);
  if (quizMatch) {
    return {
      valid: true,
      mode: 'quiz',
      quizId: quizMatch[1],
      route: `/tg?mode=quiz&quizId=${quizMatch[1]}`,
    };
  }

  return {
    valid: true,
    mode: 'home',
    raw,
    route: '/tg',
  };
}

/**
 * 4. Single Self-Editing Progress Message Tracker (V5 4.5)
 * Throttles `editMessageText` to at most 1 edit per 3000ms and skips identical text
 */
export class ProgressMessageTracker {
  constructor({ minIntervalMs = 3000, sendFn, editFn } = {}) {
    this.minIntervalMs = Math.max(3000, Number(minIntervalMs) || 3000);
    this.sendFn = sendFn;
    this.editFn = editFn;
    this.stateByJob = new Map();
  }

  formatAtlasProgressText({
    docTitle = 'ملف الأطلس',
    completedParts = 0,
    totalParts = 1,
    stageAr = 'استخراج الصفحات',
    status = 'running',
  } = {}) {
    const pct = Math.min(100, Math.round((completedParts / Math.max(1, totalParts)) * 100));
    const filledBlocks = Math.round(pct / 10);
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, 10 - filledBlocks));
    const icon = status === 'completed' ? '✅' : status === 'failed' ? '⚠️' : '⚙️';
    return [
      `${icon} *محرك الأطلس V5 — ${docTitle}*`,
      `[${bar}] ${pct}% (الفصل ${completedParts}/${totalParts})`,
      `المرحلة الحالية: ${stageAr}`,
    ].join('\n');
  }

  async updateProgress(jobId, chatId, progressPayload, now = Date.now()) {
    const nextText =
      typeof progressPayload === 'string'
        ? progressPayload
        : this.formatAtlasProgressText(progressPayload);

    const existing = this.stateByJob.get(jobId);

    if (!existing || !existing.messageId) {
      const sent = this.sendFn
        ? await this.sendFn({ chat_id: chatId, text: nextText, parse_mode: 'Markdown' })
        : { ok: true, result: { message_id: 1001 } };
      const messageId = sent?.result?.message_id || 1001;
      this.stateByJob.set(jobId, {
        chatId,
        messageId,
        lastText: nextText,
        lastEditedAt: now,
        editCount: 0,
      });
      return { action: 'sent_initial', messageId, text: nextText };
    }

    // Never send editMessageText if text has not changed
    if (existing.lastText === nextText) {
      return { action: 'skipped_identical', messageId: existing.messageId, text: nextText };
    }

    const elapsed = now - existing.lastEditedAt;
    const isFinal = progressPayload?.status === 'completed' || progressPayload?.status === 'failed';

    if (elapsed < this.minIntervalMs && !isFinal) {
      return {
        action: 'throttled',
        messageId: existing.messageId,
        retryInMs: this.minIntervalMs - elapsed,
      };
    }

    if (this.editFn) {
      await this.editFn({
        chat_id: chatId,
        message_id: existing.messageId,
        text: nextText,
        parse_mode: 'Markdown',
      });
    }

    existing.lastText = nextText;
    existing.lastEditedAt = now;
    existing.editCount += 1;
    return {
      action: 'edited',
      messageId: existing.messageId,
      editCount: existing.editCount,
      text: nextText,
    };
  }
}

/**
 * 5. Notification Budget Manager (V5 4.6)
 * - Max 2 proactive notifications per day per user
 * - Quiet hours: 23:00 to 07:00 local hour
 * - Appends reason footer + inline opt-out button
 * - Auto-downgrades to weekly digest after 5 consecutive unopened notifications
 */
export class NotificationBudgetManager {
  constructor({ maxDaily = 2, quietStartHour = 23, quietEndHour = 7 } = {}) {
    this.maxDaily = maxDaily;
    this.quietStartHour = quietStartHour;
    this.quietEndHour = quietEndHour;
    this.userStates = new Map();
  }

  isQuietHour(localHour) {
    const h = Number(localHour);
    return h >= this.quietStartHour || h < this.quietEndHour;
  }

  evaluateSend({
    userId,
    notificationType = 'srs_due',
    reasonAr = 'لديك 14 مصطلحاً مستحقاً للمراجعة اليوم',
    localHour = 14,
    dateKey = new Date().toISOString().slice(0, 10),
    explicitlyRequested = false,
  } = {}) {
    const state = this.userStates.get(userId) || {
      dailyCounts: {},
      optedOutTypes: new Set(),
      consecutiveIgnored: 0,
      mode: 'normal', // 'normal' | 'weekly_digest'
    };

    if (!explicitlyRequested) {
      if (state.optedOutTypes.has(notificationType)) {
        return { allowed: false, reason: 'OPTED_OUT_OF_TYPE' };
      }
      if (state.consecutiveIgnored >= 5) {
        state.mode = 'weekly_digest';
        this.userStates.set(userId, state);
        return { allowed: false, reason: 'DOWNGRADED_TO_WEEKLY_DIGEST' };
      }
      if (this.isQuietHour(localHour)) {
        return { allowed: false, reason: 'QUIET_HOURS_ACTIVE' };
      }
      const sentToday = state.dailyCounts[dateKey] || 0;
      if (sentToday >= this.maxDaily) {
        return { allowed: false, reason: 'DAILY_BUDGET_EXHAUSTED', sentToday };
      }
      state.dailyCounts[dateKey] = sentToday + 1;
    }

    this.userStates.set(userId, state);

    return {
      allowed: true,
      reasonFooterAr: `\n\n—\n📌 سبب الإشعار: ${reasonAr}`,
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: '🔕 إيقاف هذا النوع من التنبيهات',
              callback_data: `optout:${notificationType}`,
            },
          ],
        ],
      },
    };
  }

  recordIgnored(userId) {
    const state = this.userStates.get(userId) || {
      dailyCounts: {},
      optedOutTypes: new Set(),
      consecutiveIgnored: 0,
      mode: 'normal',
    };
    state.consecutiveIgnored += 1;
    if (state.consecutiveIgnored >= 5) {
      state.mode = 'weekly_digest';
    }
    this.userStates.set(userId, state);
    return state;
  }

  optOut(userId, notificationType) {
    const state = this.userStates.get(userId) || {
      dailyCounts: {},
      optedOutTypes: new Set(),
      consecutiveIgnored: 0,
      mode: 'normal',
    };
    state.optedOutTypes.add(notificationType);
    this.userStates.set(userId, state);
    return state;
  }
}

/**
 * 6. Outbox with 429 Retry-After & Dead-Letter Queue (V5 4.7)
 */
export class TelegramOutbox {
  constructor({ maxAttempts = 3, senderFn } = {}) {
    this.maxAttempts = maxAttempts;
    this.senderFn = senderFn;
    this.queue = [];
    this.dlq = [];
    this.sent = [];
  }

  enqueue(messagePayload) {
    const item = {
      id: messagePayload.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      payload: messagePayload,
      attempts: 0,
      nextAttemptAt: Number(messagePayload.nextAttemptAt ?? 0),
      lastError: null,
    };
    this.queue.push(item);
    return item;
  }

  async processTick(now = Date.now()) {
    const ready = this.queue.filter((item) => item.nextAttemptAt <= now);
    const results = [];

    for (const item of ready) {
      item.attempts += 1;
      try {
        const res = await this.senderFn(item.payload);
        if (res && res.ok) {
          this.queue = this.queue.filter((q) => q.id !== item.id);
          this.sent.push({ ...item, deliveredAt: now });
          results.push({ id: item.id, status: 'sent' });
        } else if (res && Number(res.error_code) === 429) {
          const retryAfterSec = Number(res.parameters?.retry_after || 5);
          item.lastError = `429_TOO_MANY_REQUESTS: retry_after=${retryAfterSec}s`;
          if (item.attempts >= this.maxAttempts) {
            this.queue = this.queue.filter((q) => q.id !== item.id);
            this.dlq.push({ ...item, failedAt: now });
            results.push({ id: item.id, status: 'dlq', retryAfterSec });
          } else {
            item.nextAttemptAt = now + retryAfterSec * 1000;
            results.push({ id: item.id, status: 'retry_scheduled', retryAfterSec });
          }
        } else {
          throw new Error(res?.description || 'TELEGRAM_SEND_FAILED');
        }
      } catch (err) {
        item.lastError = err.message;
        if (item.attempts >= this.maxAttempts) {
          this.queue = this.queue.filter((q) => q.id !== item.id);
          this.dlq.push({ ...item, failedAt: now });
          results.push({ id: item.id, status: 'dlq', error: err.message });
        } else {
          item.nextAttemptAt = now + Math.pow(2, item.attempts) * 1000;
          results.push({ id: item.id, status: 'retry_scheduled', error: err.message });
        }
      }
    }

    return results;
  }

  replayDlqItem(itemId, now = Date.now()) {
    const idx = this.dlq.findIndex((d) => d.id === itemId);
    if (idx === -1) return null;
    const [item] = this.dlq.splice(idx, 1);
    item.attempts = 0;
    item.nextAttemptAt = now;
    this.queue.push(item);
    return item;
  }
}

/**
 * 7. Privacy Guard: Block Public Telegraph Instant View for Private Lectures (V5 4.2)
 */
export function assertNoPublicTelegraphLeak(deliveryOptions = {}) {
  if (
    deliveryOptions.publishToTelegraph === true ||
    String(deliveryOptions.url || '').includes('telegra.ph')
  ) {
    throw new Error(
      'V5_PRIVACY_VIOLATION: Private student lectures must NEVER be published to public telegra.ph URLs. Use /tg Mini App, sendDocument, or signed short-lived URLs.'
    );
  }
  return true;
}

export function buildPrivateLectureDeliveryPayload({
  docId,
  docTitle = 'ملخص الأطلس',
  appBaseUrl = 'https://blackfighters.site',
  signingSecret = 'atlas-v5-secret',
  ttlSeconds = 900,
  nowSeconds = Math.floor(Date.now() / 1000),
} = {}) {
  const safeId = String(docId || 'doc_1').replace(/[^A-Za-z0-9_-]/g, '');
  const startAppParam = `doc_${safeId}_p_1`;
  const expiresAt = nowSeconds + ttlSeconds;
  const sig = crypto
    .createHmac('sha256', signingSecret)
    .update(`${safeId}:${expiresAt}`)
    .digest('hex')
    .slice(0, 32);

  const signedExportUrl = `${appBaseUrl}/api/export-lecture?docId=${encodeURIComponent(
    safeId
  )}&exp=${expiresAt}&sig=${sig}`;

  return {
    miniAppUrl: `${appBaseUrl}/tg?startapp=${startAppParam}`,
    startAppParam,
    signedExportUrl,
    expiresAt,
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: `📖 فتح «${docTitle}» في قارئ الأطلس`,
            web_app: { url: `${appBaseUrl}/tg?startapp=${startAppParam}` },
          },
          {
            text: '⬛ فك التعتيم (Declassify)',
            web_app: { url: `${appBaseUrl}/tg?startapp=declassify_${safeId}` },
          },
        ],
      ],
    },
  };
}

/**
 * 8. Group Command Authorization Guard (V5 4.9)
 */
export async function verifyLinkedGroupMember({
  telegramUserId,
  chatId,
  linkedAccountResolver,
  getChatMemberFn,
} = {}) {
  if (!telegramUserId || !chatId) {
    return { authorized: false, error: 'MISSING_USER_OR_CHAT' };
  }

  const linkedAccount = linkedAccountResolver
    ? await linkedAccountResolver(String(telegramUserId))
    : null;
  if (!linkedAccount || !linkedAccount.uid) {
    return { authorized: false, error: 'UNLINKED_TELEGRAM_ACCOUNT' };
  }

  const memberInfo = getChatMemberFn
    ? await getChatMemberFn(chatId, telegramUserId)
    : { status: 'member' };

  const validStatuses = new Set(['creator', 'administrator', 'member', 'restricted']);
  if (!memberInfo || !validStatuses.has(memberInfo.status)) {
    return { authorized: false, error: 'NOT_A_GROUP_MEMBER' };
  }

  return {
    authorized: true,
    uid: linkedAccount.uid,
    role: memberInfo.status,
  };
}
