import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import '@/index.css'

if (typeof window !== 'undefined' && typeof window.VE2EFml === 'undefined') {
  window.VE2EFml = () => {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)