import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  // Prebundle deferred table peers so the first picker opening does not reload the demo.
  optimizeDeps: {
    include: [
      'vue',
      'naive-ui',
      '@iconify/vue',
      '@robot-admin/form-validate',
      'async-validator',
      'html2canvas',
      'print-js',
      'sortablejs',
    ],
  },
  server: { host: '127.0.0.1', port: 4188, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        contracts: fileURLToPath(new URL('./contracts.html', import.meta.url)),
        organization: fileURLToPath(
          new URL('./organization.html', import.meta.url)
        ),
        peopleWorkflow: fileURLToPath(
          new URL('./people-workflow.html', import.meta.url)
        ),
      },
    },
    outDir: '../../node_modules/.cache/search-workflows',
    emptyOutDir: true,
  },
})
