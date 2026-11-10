import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function devApiPlugin() {
  return {
    name: "bf-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/") && !url.startsWith("/.netlify/functions/")) {
          return next();
        }
        try {
          const routerUrl = pathToFileURL(path.resolve(__dirname, "api/[...path].mjs")).href;
          const routerMod = await import(/* @vite-ignore */ routerUrl);
          const handler = routerMod.default?.fetch;
          if (typeof handler !== "function") return next();

          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const bodyBuffer = Buffer.concat(chunks);
          const fullUrl = `http://${req.headers.host || "localhost:3000"}${url}`;
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (Array.isArray(v)) headers.set(k, v.join(", "));
            else if (typeof v === "string") headers.set(k, v);
          }

          const method = req.method || "GET";
          const fetchReq = new Request(fullUrl, {
            method,
            headers,
            body: method !== "GET" && method !== "HEAD" && bodyBuffer.length > 0 ? bodyBuffer : undefined,
          });

          const response = await handler(fetchReq);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const respBuf = Buffer.from(await response.arrayBuffer());
          res.end(respBuf);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err?.message || "Internal Server Error" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
  },
  build: {
    manifest: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
