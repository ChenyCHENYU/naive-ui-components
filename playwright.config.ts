import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.browser.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'node_modules/.cache/browser-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'node_modules/.cache/browser-report.json' }],
    [
      'html',
      { outputFolder: 'node_modules/.cache/browser-report', open: 'never' },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4191',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command:
      'bun run vite preview --config dev/search-workflows/vite.config.ts --host 127.0.0.1 --port 4191 --strictPort',
    url: 'http://127.0.0.1:4191/consumer-build.json',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
})
