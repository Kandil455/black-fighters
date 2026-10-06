import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = (process.argv[2] || process.env.APP_BASE_URL || "https://iiiak-study-app.vercel.app").replace(/\/$/, "");
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9227 + Math.floor(Math.random() * 200);
const profileDir = await mkdtemp(path.join(os.tmpdir(), "iiiak-chrome-"));
const browser = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(100);
    }
  }
  throw new Error("Chrome DevTools did not start");
}

let sequence = 0;
const pending = new Map();
const events = [];

async function run() {
  await waitForDebugger();
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
      return;
    }
    events.push(message);
  });

  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) => {
    let result;
    try {
      result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    } catch (error) {
      throw new Error(`${error.message}; expression=${expression.replace(/\s+/g, " ").slice(0, 180)}`);
    }
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
    return result.result?.value;
  };

  const waitFor = async (expression, timeoutMs = 15000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(`Boolean(${expression})`)) return true;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  };

  await Promise.all([
    command("Page.enable"),
    command("Runtime.enable"),
    command("Log.enable"),
    command("Network.enable"),
  ]);

  const results = [];
  const pagesToCheck = [
    { route: "/", expectedText: "حوّل ملفاتك" },
    { route: "/login", expectedText: "تسجيل الدخول" },
    { route: "/register", expectedText: "إنشاء حساب" },
    { route: "/create", expectedText: "تسجيل الدخول", expectedPath: "/login" },
  ];
  for (const { route, expectedText, expectedPath = route } of pagesToCheck) {
    events.length = 0;
    const started = Date.now();
    await command("Page.navigate", { url: `${baseUrl}${route}` });
    await waitFor("document.readyState === 'complete'");
    await sleep(1800);
    const snapshot = await evaluate(`({
      title: document.title,
      path: location.pathname,
      text: document.body?.innerText?.slice(0, 500) || '',
      rootChildren: document.querySelector('#root')?.children?.length || 0,
      timing: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.loadEventEnd - n.startTime) : 0; })()
    })`);
    const failures = events.filter((event) => event.method === "Network.loadingFailed" && !event.params?.canceled)
      .map((event) => event.params?.errorText).filter(Boolean);
    const exceptions = events.filter((event) => event.method === "Runtime.exceptionThrown")
      .map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.exceptionDetails?.text).filter(Boolean);
    const severeLogs = events.filter((event) => event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params?.entry?.level))
      .map((event) => event.params?.entry?.text).filter(Boolean);
    results.push({ route, expectedText, expectedPath, elapsedMs: Date.now() - started, ...snapshot, failures, exceptions, severeLogs });
  }

  const responsive = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 768 ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const route of ["/", "/login"]) {
      await command("Page.navigate", { url: `${baseUrl}${route}` });
      await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.children?.length");
      await sleep(350);
      responsive.push(await evaluate(`(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const interactive = [...document.querySelectorAll('button, input, textarea, select, [role=button]')].filter(visible);
        const clipped = interactive.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -2 || rect.right > innerWidth + 2;
        }).map((element) => element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || element.tagName);
        const undersized = innerWidth < 768 ? interactive.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 40 || rect.height < 40;
        }).map((element) => element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || element.tagName) : [];
        return {
          route: location.pathname,
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
          clipped,
          undersized,
        };
      })()`));
    }
  }

  await command("Emulation.clearDeviceMetricsOverride");

  events.length = 0;
  await command("Page.navigate", { url: `${baseUrl}/login` });
  await waitFor("document.querySelector('input[name=email]') && document.querySelector('input[name=password]')");
  await evaluate(`(() => {
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('input[name=email]', 'browser-check-${Date.now()}@example.com');
    setValue('input[name=password]', 'WrongPassword123!');
    document.querySelector('form').requestSubmit();
    return true;
  })()`);
  let observedToasts = [];
  for (let attempt = 0; attempt < 120; attempt += 1) {
    observedToasts = await evaluate("[...document.querySelectorAll('[data-sonner-toast]')].map((item) => item.innerText)");
    if (observedToasts.length) break;
    await sleep(100);
  }
  const auth = await evaluate(`({
    path: location.pathname,
    loading: Boolean(document.querySelector('[data-loading=true]')),
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((item) => item.innerText),
    text: document.body?.innerText?.slice(0, 800) || ''
  })`);
  if (observedToasts.length) auth.toasts = observedToasts;
  auth.exceptions = events.filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.exceptionDetails?.text).filter(Boolean);

  events.length = 0;
  await command("Page.navigate", { url: `${baseUrl}/login` });
  await waitFor("document.querySelector('button') && document.body?.innerText?.includes('دخول سريع بـ Google')");
  const googleButton = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Google'));
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!googleButton) throw new Error("Google login button was not found");
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: googleButton.x, y: googleButton.y, button: "left", clickCount: 1 });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: googleButton.x, y: googleButton.y, button: "left", clickCount: 1 });

  const observedPopupUrls = new Set();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    for (const popup of targets.filter((item) => item.type === "page" && item.id !== target.id)) {
      observedPopupUrls.add(popup.url);
    }
    if ([...observedPopupUrls].some((url) => /accounts\.google\.com|firebaseapp\.com/.test(url))) break;
    await sleep(100);
  }
  const google = {
    popupUrls: [...observedPopupUrls],
    securityErrors: events.filter((event) => event.method === "Log.entryAdded")
      .map((event) => event.params?.entry?.text || "")
      .filter((message) => /content security policy|violates.*script-src|blocked/i.test(message)),
  };

  ws.close();
  return { baseUrl, pages: results, responsive, auth, google };
}

try {
  const report = await run();
  console.log(JSON.stringify(report, null, 2));
  const brokenPages = report.pages.filter((page) => (
    !page.rootChildren
    || page.exceptions.length
    || page.failures.length
    || !page.text.includes(page.expectedText)
    || page.path !== page.expectedPath
  ));
  const authFailed = report.auth.exceptions.length
    || report.auth.path !== "/login"
    || !report.auth.toasts.some((toast) => /الإيميل أو كلمة المرور غير صحيحة/.test(toast));
  const googleFailed = report.google.securityErrors.length
    || !report.google.popupUrls.some((url) => /accounts\.google\.com|firebaseapp\.com/.test(url));
  const responsiveFailed = report.responsive.some((page) => (
    page.horizontalOverflow || page.clipped.length || page.undersized.length
  ));
  if (brokenPages.length || authFailed || googleFailed || responsiveFailed) process.exitCode = 1;
} finally {
  const browserExited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill("SIGTERM");
  await Promise.race([browserExited, sleep(2000)]);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 2) console.warn(`تعذر تنظيف ملف Chrome المؤقت: ${error.message}`);
      await sleep(250);
    }
  }
}
