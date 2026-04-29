import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The terminal SPA is served at /terminal/ on the marketing-site origin.
// In dev (Vite dev server) we keep the proxy + ACCESS_TOKEN injection so a
// developer can run the SPA standalone on :3000.
// In a production build this base = '/terminal/' tells Vite to emit asset
// URLs that resolve correctly when copied to next-app/public/terminal/.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '')
  const accessToken =
    env.VITE_ACCESS_TOKEN ||
    process.env.VITE_ACCESS_TOKEN ||
    'Termimal3131'
  const backendTarget =
    env.VITE_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    'http://127.0.0.1:8000'

  return {
    base: '/terminal/',
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      port: 3000,
      allowedHosts: ['.trycloudflare.com', 'localhost'],
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
          headers: { 'x-access-token': accessToken },
        },
      },
    },
  }
})
