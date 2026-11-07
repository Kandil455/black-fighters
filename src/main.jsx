import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import '@/index.css'
// Compatibility layer: re-points legacy hard-coded hex colours at theme
// variables so the light theme no longer shows white-on-white text.
// Must come AFTER index.css so it can override Tailwind's utilities.
import '@/styles/theme-compat.css'

if (typeof window !== 'undefined' && typeof window.VE2EFml === 'undefined') {
  window.VE2EFml = () => {}
}

// ── Deploy self-heal ─────────────────────────────────────────────────────────
// After every deploy, sitting tabs hold OLD chunk hashes that no longer exist
// on the server → lazy route imports 404 (AnimatedTitle/Friends/Stats…). ONE
// silent reload lands the fresh index + matching chunks. Guarded per tab
// session so a real outage can never cause a reload loop.
if (typeof window !== 'undefined') {
  const heal = () => {
    try {
      if (window.sessionStorage.getItem('bf_chunk_heal_reloaded')) return
      window.sessionStorage.setItem('bf_chunk_heal_reloaded', '1')
    } catch { /* private mode: reload anyway, once */ }
    window.location.reload()
  }
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    heal()
  })
  window.addEventListener('error', (event) => {
    const target = event?.target
    if (target && target.tagName === 'SCRIPT' && /\/assets\/.+\.js/.test(target.src || '')) heal()
  }, true)
  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event?.reason?.message || event?.reason || '')
    if (/Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)) heal()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
