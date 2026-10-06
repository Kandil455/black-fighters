import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import devApiPlugin from './vite-plugin-dev-api.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const functionsBase = env.VITE_FUNCTIONS_BASE_URL || '/api';

  return {
    logLevel: 'error',
    define: {
      'import.meta.env.VITE_FUNCTIONS_BASE_URL': JSON.stringify(functionsBase),
      // SECURITY: AI provider keys (Gemini/Z.ai/Groq/OpenRouter/APMIX) are SERVER-ONLY.
      // Never inline them into the client bundle; the browser uses the authenticated /api/ai proxy.
    },
    build: {
      manifest: true,
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) {
                return 'vendor-react';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('three')) {
                return 'vendor-three';
              }
            }
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
    plugins: [
      devApiPlugin(),
      base44({
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: false,
        visualEditAgent: true
      }),
      react(),
      {
        name: 'youtube-transcript-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api/youtube-transcript') || req.url.startsWith('/.netlify/functions/youtube-transcript'))) {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = body ? JSON.parse(body) : {};
                  const urlObj = new URL(req.url, 'http://localhost');
                  const targetUrl = parsed.url || urlObj.searchParams.get('url');
                  const { YoutubeTranscript } = await import('youtube-transcript');
                  
                  let videoId = null;
                  if (targetUrl) {
                    const trimmed = targetUrl.trim();
                    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
                      videoId = trimmed;
                    } else {
                      const patterns = [
                        /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
                        /youtu\.be\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
                        /youtube\.com\/embed\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
                        /youtube\.com\/shorts\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
                      ];
                      for (const p of patterns) {
                        const m = trimmed.match(p);
                        if (m) { videoId = m[1]; break; }
                      }
                    }
                  }
                  if (!videoId) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'INVALID_YOUTUBE_URL' }));
                  }
                  
                  let title = '';
                  try {
                    const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).then(r => r.json());
                    title = oe.title || '';
                  } catch (e) {}

                  function parseTimeSeconds(val) {
                    if (!val) return null;
                    if (typeof val === 'number') return val;
                    const str = String(val).trim();
                    const parts = str.split(':').map(Number);
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
                    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                    const num = Number(str);
                    return isNaN(num) ? null : num;
                  }

                  const startSec = parseTimeSeconds(parsed.startTime || urlObj.searchParams.get('startTime'));
                  const endSec = parseTimeSeconds(parsed.endTime || urlObj.searchParams.get('endTime'));

                  const attempts = [{ lang: 'ar' }, undefined, { lang: 'en' }];
                  let transcriptText = '';
                  let lastErr = null;
                  for (const opt of attempts) {
                    try {
                      const items = await YoutubeTranscript.fetchTranscript(videoId, opt);
                      if (items && items.length > 0) {
                        let filtered = items;
                        if (startSec !== null || endSec !== null) {
                          filtered = items.filter(i => {
                            const sec = i.offset > 10000 ? (i.offset / 1000) : i.offset;
                            if (startSec !== null && sec < startSec) return false;
                            if (endSec !== null && sec > endSec) return false;
                            return true;
                          });
                        }
                        if (filtered.length === 0) filtered = items; // Fallback if out-of-range
                        transcriptText = filtered.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
                        if (transcriptText.length > 30) break;
                      }
                    } catch (e) {
                      lastErr = e;
                    }
                  }
                  if (!transcriptText || transcriptText.length < 30) {
                    throw lastErr || new Error('NO_CAPTIONS_AVAILABLE');
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: true,
                    videoId,
                    title,
                    transcript: transcriptText,
                    charCount: transcriptText.length,
                    startTime: startSec,
                    endTime: endSec
                  }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
  };
});
