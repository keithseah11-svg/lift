import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// GitHub Pages serves the app from /<repo-name>/
const base = process.env.BASE_PATH ?? '/lift/'

/** Shown in Settings so you can tell which version is running. */
function appVersion(): string {
  let commit = process.env.GITHUB_SHA?.slice(0, 7)
  try {
    commit ??= execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    commit = 'dev'
  }
  return `${new Date().toISOString().slice(0, 10)} · ${commit}`
}

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? base : '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/lib/pwa.ts so we can also check for updates on resume.
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lift',
        short_name: 'Lift',
        description: 'Personal workout and macro tracker',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Take over open pages as soon as a new version installs.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    // exceljs is large but only loaded when exporting/importing a backup.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
  },
}))
