/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fonts': fileURLToPath(new URL('./node_modules/@fontsource-variable/inter/files', import.meta.url)),
    },
  },
  server: { port: 5188, strictPort: true },
  preview: { port: 5189, strictPort: true },
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
})
