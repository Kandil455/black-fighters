#!/usr/bin/env node
/**
 * scripts/telegram-setup.mjs — one-shot bot configuration.
 *
 * Run once per environment (and again after changing the URL or the command list):
 *
 *   node scripts/telegram-setup.mjs                     # register webhook + menu
 *   node scripts/telegram-setup.mjs --info              # inspect current state
 *   node scripts/telegram-setup.mjs --delete            # remove the webhook (back to polling)
 *
 * Why this exists: registration used to be a URL pasted into a doc comment, so
 * `allowed_updates` was never set to include `poll_answer` and the command menu
 * was never published. Without `poll_answer` the bot literally cannot know which
 * answer a student picked.
 *
 * Env: TELEGRAM_BOT_TOKEN (required), TELEGRAM_WEBHOOK_SECRET (required),
 *      APP_BASE_URL (default https://blackfighters.site), TELEGRAM_BOT_USERNAME
 */

import fs from "node:fs";
import path from "node:path";
import { COMMANDS, telegramMenuCommands } from "../netlify/functions/_shared/telegram-commands.mjs";

// Load .env.local / .env without pulling in a dependency.
function loadEnvFile(file) {
  try {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) return;
    for (const line of fs.readFileSync(full, "utf-8").split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = (match[2] || "").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* ignore */
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const baseUrl = String(process.env.APP_BASE_URL || "https://blackfighters.site").replace(/\/+$/, "");
const args = process.argv.slice(2);

if (!token) {
  console.error("✖ TELEGRAM_BOT_TOKEN is missing. Set it in .env.local (server-only, never VITE_*).");
  process.exit(1);
}

async function api(method, payload = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return data;
}

async function showInfo() {
  const me = await api("getMe");
  const hook = await api("getWebhookInfo");
  const cmds = await api("getMyCommands");
  console.log("─".repeat(60));
  console.log("bot      :", me.ok ? `@${me.result.username} (${me.result.id})` : `✖ ${me.description}`);
  console.log("webhook  :", hook.ok ? hook.result.url || "(none — polling mode?)" : `✖ ${hook.description}`);
  if (hook.ok && hook.result.url) {
    console.log("pending  :", hook.result.pending_update_count);
    console.log("last err :", hook.result.last_error_message || "none");
  }
  console.log(
    "commands :",
    cmds.ok && cmds.result.length ? cmds.result.map((c) => `/${c.command}`).join(", ") : "(none published)",
  );
  console.log("─".repeat(60));
}

function checkDrift() {
  // Every advertised command should have a handler somewhere in the engine.
  const engine = fs.readFileSync(
    path.resolve("netlify/functions/_shared/telegram-engine.mjs"),
    "utf-8",
  );
  const missing = COMMANDS.filter((c) => {
    const bare = c.command.replace(/^\//, "");
    return !new RegExp(`startsWith\\("\\/${bare}"\\)|=== "\\/${bare}"|between\\(\\"\\/${bare}\\"\\)`).test(engine);
  }).map((c) => c.command);
  if (missing.length) {
    console.warn(`⚠ advertised without a matching handler (check /help copy): ${missing.join(", ")}`);
  } else {
    console.log("✔ every advertised command has a handler in the engine");
  }
}

async function main() {
  if (args.includes("--info")) {
    await showInfo();
    checkDrift();
    return;
  }

  if (args.includes("--delete")) {
    const res = await api("deleteWebhook", { drop_pending_updates: false });
    console.log(res.ok ? "✔ webhook removed (long-polling mode)" : `✖ ${res.description}`);
    return;
  }

  if (!secret) {
    console.error(
      "✖ TELEGRAM_WEBHOOK_SECRET is required.\n" +
        "  The webhook refuses ALL updates (503) without it — that is the fail-closed\n" +
        "  behaviour that replaced the previous 'open if unset' default.\n" +
        "  Generate one, e.g.: openssl rand -hex 32",
    );
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/api/telegram-webhook`;
  const set = await api("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    // poll_answer is the ONLY way to learn a student's quiz answer. Without it,
    // every bot-graded quiz was recorded as 100% correct.
    allowed_updates: ["message", "callback_query", "poll_answer"],
    drop_pending_updates: args.includes("--drop-pending"),
  });
  console.log(set.ok ? `✔ webhook → ${webhookUrl}` : `✖ setWebhook failed: ${set.description}`);

  const commands = telegramMenuCommands();
  const setCmds = await api("setMyCommands", { commands });
  console.log(
    setCmds.ok
      ? `✔ published ${commands.length} commands to the Telegram menu`
      : `✖ setMyCommands failed: ${setCmds.description}`,
  );

  const me = await api("getMe");
  if (me.ok) {
    await api("setChatMenuButton", {
      menu_button: { type: "web_app", text: "فتح المنصة", web_app: { url: `${baseUrl}/tg` } },
    });
    console.log("✔ menu button set to the Mini App");
  }

  checkDrift();
  console.log("\nNext: send /start to the bot, then link your account from the web settings.");
}

main().catch((err) => {
  console.error("✖ setup failed:", err.message);
  process.exit(1);
});
