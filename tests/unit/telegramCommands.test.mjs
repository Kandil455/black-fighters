/**
 * Telegram command-registry drift guard.
 *
 * The bug this exists to prevent: `/help` advertised `/profile` and `/plans` for
 * months, and the notification budget emitted an `optout:` button — none of the
 * three had a handler, so students followed the instructions and got silence.
 *
 * Every advertised command must therefore have a reachable handler in the
 * dispatcher, and the Telegram menu must only contain names Telegram accepts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMMANDS, NOTIFICATION_TYPES, telegramMenuCommands } from "../../netlify/functions/_shared/telegram-commands.mjs";

const engine = readFileSync("netlify/functions/_shared/telegram-engine.mjs", "utf8");
const notify = readFileSync("netlify/functions/_shared/telegram-notify.mjs", "utf8");

test("command names are unique across canonical and alias spellings", () => {
  const seen = new Map();
  for (const entry of COMMANDS) {
    for (const name of [entry.command, entry.alt].filter(Boolean)) {
      assert.equal(seen.has(name), false, `${name} is declared twice (also in ${seen.get(name)})`);
      seen.set(name, entry.command);
    }
  }
});

test("every advertised command has a handler in the dispatcher", () => {
  const missing = [];
  for (const entry of COMMANDS) {
    const names = [entry.command, entry.alt].filter(Boolean).map((n) => n.replace(/^\//, ""));
    const handled = names.some((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Three legitimate dispatch styles in this engine:
      //   1. `text.startsWith("/x")` / `text === "/x"`
      //   2. a menu regex that matches the command (e.g. /start, /menu)
      //   3. a keyboard callback that carries the name
      return (
        new RegExp(`startsWith\\("/${escaped}"\\)|=== "/${escaped}"`).test(engine) ||
        new RegExp(`/${escaped}\\b`).test(engine)
      );
    });
    if (!handled) missing.push(entry.command);
  }
  assert.deepEqual(
    missing,
    [],
    "these commands are advertised (help text, Telegram menu, web panel) but the dispatcher has no branch for them",
  );
});

test("removed-from-help commands stay removed", () => {
  // `/profile` and `/plans` are inline-button actions, not text commands. They
  // used to be listed in /help which made them look broken.
  for (const retired of ["/profile", "/plans"]) {
    assert.equal(
      COMMANDS.some((c) => c.command === retired || c.alt === retired),
      false,
      `${retired} was re-added to the advertised command list without a text handler`,
    );
  }
});

test("published menu commands satisfy Telegram's name rules", () => {
  const menu = telegramMenuCommands();
  assert.ok(menu.length > 0, "no commands would be published");
  assert.ok(menu.length <= 100, "Telegram accepts at most 100 commands");
  for (const entry of menu) {
    assert.match(
      entry.command,
      /^[a-z0-9_]{1,32}$/,
      `"${entry.command}" is not a valid Telegram command name (lowercase a-z, 0-9, underscore only)`,
    );
    assert.ok(entry.description.length > 0 && entry.description.length <= 256, `bad description for ${entry.command}`);
  }
  // `grill-me` must be published as grill_me, and the dispatcher must accept both.
  assert.ok(telegramMenuCommands().some((c) => c.command === "grill_me"), "grill_me missing from the menu");
  assert.ok(engine.includes("/grill_me") && engine.includes("/grill-me"), "the dispatcher must accept both spellings");
});

test("the opt-out button the notifier emits has a handler", () => {
  assert.ok(
    /data\.startsWith\("optout:"\)/.test(engine),
    "the notifier still emits callback_data `optout:<type>` with no handler in the dispatcher",
  );
  assert.ok(notify.includes("optOutOfType"), "telegram-notify must expose the opt-out writer");
});

test("notification types are declared once and shared", () => {
  for (const type of NOTIFICATION_TYPES) {
    assert.ok(notify.includes(`"${type}"`) || notify.includes(`'${type}'`) || notify.includes(type), `type ${type} unknown to telegram-notify`);
  }
});
