// main.tsx — direct load, no authentication gate
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { getAccessToken } from './lib/supabase'
import './index.css'

// In production the SPA is served from the marketing-site origin while
// the FastAPI backend lives on a different host (Render/Fly). Two places
// need rerouting:
//   1. axios calls — use baseURL.
//   2. bare fetch('/api/…') calls scattered across pages — monkey-patch
//      window.fetch so we don't have to rewrite every call site.
const BACKEND = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')
if (BACKEND) {
  axios.defaults.baseURL = BACKEND
  const _origFetch = window.fetch
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return _origFetch(BACKEND + input, init)
    }
    return _origFetch(input, init)
  }
}

// Global axios interceptor: attach the Supabase JWT (or the legacy token in
// dev) to every /api/* request so the backend AccessGate can authenticate
// the user without each call site knowing about auth.
axios.interceptors.request.use(async (config) => {
  const url = (config.url ?? '').toString()
  if (url.startsWith('/api/') || url.includes('/api/')) {
    const token = await getAccessToken().catch(() => null)
    config.headers = config.headers ?? {}
    if (token) {
      ;(config.headers as any).Authorization = `Bearer ${token}`
    } else {
      const legacy = (import.meta as any).env?.VITE_ACCESS_TOKEN
      if (legacy) (config.headers as any)['x-access-token'] = String(legacy)
    }
  }
  return config
})

// In production builds the SPA is mounted at /terminal/ on the marketing
// origin; in dev (Vite at :3000) it sits at /. We let Vite's BASE_URL drive
// the React Router basename so internal navigations stay scoped correctly.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
