import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    vue(),
    {
      name: 'verify-dist-consumer',
      enforce: 'pre',
      // The parity helper also serves source unit tests. Its browser build must
      // resolve that one runtime import through the public package export.
      async resolveId(source, importer) {
        if (
          source === '../../src/workflows' &&
          importer?.endsWith('/business-scenarios-data.ts')
        ) {
          return this.resolve(
            '@robot-admin/naive-ui-components/workflows',
            importer,
            { skipSelf: true }
          )
        }
      },
      generateBundle() {
        const sourceRoot = fileURLToPath(new URL('../../src/', import.meta.url))
        const sourceModules = [...this.getModuleIds()].filter(id =>
          id.startsWith(sourceRoot)
        )
        if (sourceModules.length)
          this.error(
            `Browser fixtures imported library source: ${sourceModules.join(', ')}`
          )
        const { version } = JSON.parse(
          readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
        )
        this.emitFile({
          type: 'asset',
          fileName: 'consumer-build.json',
          source: JSON.stringify({
            version,
            runtime: 'dist',
            sourceModules: 0,
          }),
        })
      },
    },
  ],
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
        visualStandards: fileURLToPath(
          new URL('./visual-standards.html', import.meta.url)
        ),
        businessScenarios: fileURLToPath(
          new URL('./business-scenarios.html', import.meta.url)
        ),
        performance: fileURLToPath(
          new URL('./performance.html', import.meta.url)
        ),
      },
    },
    outDir: '../../node_modules/.cache/search-workflows',
    emptyOutDir: true,
  },
})
