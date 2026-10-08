#!/usr/bin/env node
/**
 * scripts/telegram-bot-runner.mjs
 * Standalone Telegram Long-Polling Runner for Black Fighters
 * Run with: node scripts/telegram-bot-runner.mjs
 *
 * Used for local development only (the webhook is the production entry point).
 * Imports the SERVER engine + server API caller — never src/services/*, which is
 * a browser-bundled copy and is being removed.
 */

import { callTelegramApi, getBotToken, processTelegramWebhookUpdate } from "../netlify/functions/_shared/telegram-engine.mjs";
import { dedupeTelegramUpdateId } from "../netlify/functions/_shared/telegram-v5.mjs";
import fs from "fs";
import path from "path";

// Load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

const token = process.env.TELEGRAM_BOT_TOKEN || getBotToken();

if (!token) {
  console.log("\n⚠️  [Black Fighters Bot] No TELEGRAM_BOT_TOKEN provided.");
  console.log("👉 Add TELEGRAM_BOT_TOKEN=your_token in .env.local or pass via CLI.\n");
  process.exit(0);
}

console.log("\n🚀 [Black Fighters Bot] Initializing Telegram Bot in Realm Zeta...");

let offset = 0;

async function poll() {
  try {
    const res = await callTelegramApi("getUpdates", {
      offset,
      timeout: 30,
      // poll_answer is REQUIRED: without it we never learn which option a student
      // picked, which is why bot quiz scores used to be hardcoded to 100%.
      allowed_updates: ["message", "callback_query", "poll_answer"],
    }, token);

    if (res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        const dedupe = await dedupeTelegramUpdateId(update.update_id);
        if (dedupe.duplicate) {
          console.log(`[Bot] Skipping duplicate update ${update.update_id}`);
          continue;
        }
        console.log(`[Bot] Processing update ${update.update_id}`);
        await processTelegramWebhookUpdate(update);
      }
    } else if (!res.ok) {
      console.warn("[Bot] Poll error:", res.description);
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (err) {
    console.error("[Bot] Polling loop error:", err.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
  setImmediate(poll);
}

// Start polling
poll();
console.log("⚡ [Black Fighters Bot] Long-polling active. Waiting for student commands!\n");
