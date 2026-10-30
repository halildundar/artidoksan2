/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    legacy(),
    VitePWA({
      // 'prompt': yeni sürüm hazır olduğunda GuncellemeBildirimi bileşeni
      // kullanıcıya haber verir, onaylayınca servis işçisi değişip yenilenir
      registerType: 'prompt',
      workbox: {
        // Çevrimdışı GÖRÜNTÜLEME: API GET yanıtları cihazda tutulur —
        // internet varken taze veri gelir (önbellek tazelenir), yokken ya da
        // sunucu uykudan uyanırken son görülen kopya gösterilir. Yazma
        // istekleri (POST/PUT/DELETE) etkilenmez, internet ister.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.includes('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-onbellek',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 600, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'TüvNord Asansör',
        short_name: 'TüvNord Asansör',
        // Kurulu PWA'da üst/alt sistem şeritleri bu renkle boyanır —
        // uygulamadaki header/sekme çubuğu koyu yeşiliyle aynı
        theme_color: '#1c2a21',
        background_color: '#223c2d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
