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
      manifest: {
        name: 'TüvNord Asansör',
        short_name: 'TüvNord Asansör',
        theme_color: '#00003C',
        background_color: '#00003C',
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
