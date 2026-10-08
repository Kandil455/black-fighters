/**
 * Dev-only Vite plugin: serves every serverless function route locally.
 *
 * Production runs these on Netlify (/.netlify/functions/<name>) or Vercel
 * (/api/<name> via api/[...path].mjs). This plugin reuses that exact router
 * plus the Netlify->Web adapter so `npm run dev` exercises the same
 * authenticated, credit-charging code paths — no client-side economy fallbacks.
 *
 * Credentials: loads .env / .env.local, then falls back to
 * .firebase-service-account.json (applicationDefault).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadDevEnv(root) {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) {
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

function loadServiceAccountFile(root) {
  const full = path.join(root, ".firebase-service-account.json");
  if (!fs.existsSync(full) || process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
  try {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = fs.readFileSync(full, "utf8");
    console.log("[dev-api] loaded .firebase-service-account.json");
  } catch (err) {
    console.warn("[dev-api] could not read service account file:", err.message);
  }
}

export default function devApiPlugin() {
  let cachedRouter = null;

  async function getRouter(root) {
    if (cachedRouter) return cachedRouter;
    loadDevEnv(root);
    loadServiceAccountFile(root);
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.warn("[dev-api] no FIREBASE_SERVICE_ACCOUNT_JSON — functions will rely on applicationDefault()");
    }
    // Runtime import from disk (NOT a static import): keeps the function router
    // and its whole import graph out of the vite.config bundle, so it runs in
    // real Node with process.env, global fetch and Buffer intact.
    const routerPath = path.join(root, "api", "[...path].mjs");
    const mod = await import(pathToFileURL(routerPath).href);
    cachedRouter = mod.default;
    return cachedRouter;
  }

  return {
    name: "dev-serverless-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (url.startsWith("/api/__dev-token")) {
          try {
            loadDevEnv(server.config.root);
            loadServiceAccountFile(server.config.root);
            const fbAdminPath = path.join(server.config.root, "netlify", "functions", "_shared", "firebase-admin.mjs");
            const { adminAuth } = await import(pathToFileURL(fbAdminPath).href);
            const alphaUid = "up3y6pub7IgB1PpEMTcMASO2ei33";
            const token = await adminAuth.createCustomToken(alphaUid, {
              email: "ibrahimkandil000@gmail.com",
              // `role: 'admin'` is the claim firestore.rules actually checks
              // (isClaimAdmin). The old `admin: true` claim was inert, so admin
              // access in dev rested entirely on the email claim.
              role: "admin",
              admin: true,
            });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ token, uid: alphaUid, email: "ibrahimkandil000@gmail.com" }));
          } catch (err) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ token: null, error: String(err?.message || err) }));
          }
          return;
        }
        const isApi = url.startsWith("/api/") || url.startsWith("/.netlify/functions/");
        // Keep the long-running youtube-transcript dev middleware in charge of its route.
        if (!isApi || url.startsWith("/api/youtube-transcript") || url.startsWith("/.netlify/functions/youtube-transcript")) {
          return next();
        }
        try {
          const router = await getRouter(server.config.root);
          const pathname = url.split("?")[0];
          const request = new Request(`http://localhost${pathname}${url.includes("?") ? url.slice(url.indexOf("?")) : ""}`, {
            method: req.method,
            headers: req.headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
            duplex: "half",
          });
          const response = await router.fetch(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          const buffer = Buffer.from(await response.arrayBuffer());
          res.end(buffer);
        } catch (err) {
          console.error("[dev-api]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "DEV_API_ERROR", message: String(err?.message || err) }));
        }
      });
    },
  };
}
