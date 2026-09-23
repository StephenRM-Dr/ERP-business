import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    vueI18n({
      include: fileURLToPath(new URL('./src/locales/**.json', import.meta.url)),
      strictMessage: false,
    }),
    compression({ algorithm: 'gzip', ext: '.gz' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/[\\/]vue-i18n[\\/]/.test(id)) return 'vue-i18n'
            if (/[\\/](vue|vue-router|pinia)[\\/]/.test(id)) return 'vue'
            if (/[\\/]axios[\\/]/.test(id)) return 'axios'
          }
        },
      },
    },
  },
})