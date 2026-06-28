import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://localhost:8000'

// Bypass proxy for browser page navigations (Accept: text/html).
// Only forward XHR/fetch API calls to the backend.
function apiOnly(req) {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return '/index.html'
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth':      { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/hrm':       { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/leads':     { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/amc':       { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/service':   { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/ops':       { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/customers': { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/tenant':    { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/crm':       { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/sales':     { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/settings':  { target: API_TARGET, changeOrigin: true, bypass: apiOnly },
      '/media':     { target: API_TARGET, changeOrigin: true },
    },
  },
})
