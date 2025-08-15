// dev/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ],
  
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@types': resolve(__dirname, '../types')
    }
  }
  
})