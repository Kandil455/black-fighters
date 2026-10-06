import test from "node:test";
import assert from "node:assert/strict";
import { isGarbledOrCorruptedText } from "../../src/lib/imageFilter.js";

test("multi-page clean text (newlines/form feeds) is NOT flagged as garbled", () => {
  const page = "Defibrillator delivers a controlled dose of energy to the heart muscle.";
  const text = Array.from({ length: 12 }, (_, i) => `[صفحة ${i + 1}]\n${page}`).join("\n\n") + "\f";
  assert.equal(isGarbledOrCorruptedText(text), false);
});

test("Arabic presentation forms + emoji text is NOT flagged as garbled", () => {
  const text = "ﺟﻬﺎﺯ ﺍﻟﺼﺪﻣﺎﺕ ﺍﻟﻜﻬﺮﺑﺎﺋﻴﺔ ⚡ Defibrillator 📸 ﺍﻟﺸﺮﺡ ﺍﻟﻌﺮﺑﻲ ﺍﻟﻌﻤﻴﻖ 🔥 Monophasic";
  assert.equal(isGarbledOrCorruptedText(text), false);
});

test("real CID garbage is still flagged", () => {
  assert.equal(isGarbledOrCorruptedText("(cid:12)(cid:3) hello world"), true);
});
