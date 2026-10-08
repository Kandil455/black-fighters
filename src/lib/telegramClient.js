/**
 * src/lib/telegramClient.js — thin, typed-ish wrappers for the Telegram endpoints.
 *
 * Everything here talks to our own server; no bot credential ever reaches the
 * browser (see netlify/functions/telegram-*.mjs).
 */
import { invokeSecureFunction } from "./secureFunctions";

/**
 * Mints a short-lived single-use link code.
 *
 * Replaces the old `?start=link_<uid>` deep link, which trusted a uid that is
 * publicly visible on /u/:id — anyone could attach their own Telegram chat to a
 * victim's account with it.
 *
 * @returns {Promise<{code: string, deepLink: string, botUsername: string, expiresAt: number, instructions: string}>}
 */
export async function createTelegramLinkCode() {
  const { data } = await invokeSecureFunction("telegram-link", { action: "create" });
  if (!data?.code || !data?.deepLink) throw new Error("تعذر إنشاء كود الربط، حاول تاني");
  return data;
}

/** Detaches Telegram from the signed-in account. */
export async function unlinkTelegramAccount() {
  const { data } = await invokeSecureFunction("telegram-link", { action: "unlink" });
  return Boolean(data?.ok);
}

/** Deep-links into Telegram and opens the bot, prefilling the link code. */
export function openTelegramLink(deepLink) {
  if (!deepLink) return;
  const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(deepLink);
    return;
  }
  window.open(deepLink, "_blank", "noopener,noreferrer");
}

/**
 * One-shot helper for toast actions: mint a code, then open the bot with it.
 * Throws if the code could not be created, so callers can surface the reason.
 */
export async function openTelegramLinkWithCode() {
  const { deepLink } = await createTelegramLinkCode();
  openTelegramLink(deepLink);
  return deepLink;
}

export default { createTelegramLinkCode, unlinkTelegramAccount, openTelegramLink, openTelegramLinkWithCode };
