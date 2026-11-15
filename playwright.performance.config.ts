import { defineConfig, devices } from '@playwright/test'
import browserConfig from './playwright.config'

export default defineConfig({
  ...browserConfig,
  testMatch: '**/*.performance.ts',
  projects: [
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  outputDir: 'node_modules/.cache/performance-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'node_modules/.cache/performance-report.json' }],
  ],
})
