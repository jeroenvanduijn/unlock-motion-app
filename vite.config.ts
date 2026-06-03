import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// envPrefix: ondersteun zowel VITE_ als NEXT_PUBLIC_ (Vercel's Supabase-integratie zet die laatste).
// PWA in injectManifest-mode zodat we onze eigen service worker (sw.ts) met push-handlers behouden.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
